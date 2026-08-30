# 06 — Payments

## Two backends, one function

Anyone who clones this repo can run the complete bid flow without a Stripe
account. `src/lib/stripe.ts` exposes one function with two implementations
behind it:

```ts
export const PAYMENTS_MODE: "live" | "mock" = secretKey ? "live" : "mock";

createDepositSession(req): Promise<{
  mode: "live" | "mock";
  redirectUrl: string;
  reference: string;
}>
```

| Mode | Trigger | Behaviour |
| --- | --- | --- |
| `mock` | `STRIPE_SECRET_KEY` blank | Mints a local `mock_dep_<bidId>` reference. Nothing leaves the machine. `POST /api/bids` settles the deposit inline, because no webhook is coming. |
| `live` | `STRIPE_SECRET_KEY` set | Creates a real Checkout Session. The bid stays `PENDING` until the webhook fires. |

Both return the same shape, so no route handler branches on the mode. The only
difference in `POST /api/bids` is three lines:

```ts
if (session.mode === "mock") {
  await settleDeposit(bid.id, session.reference);   // no webhook is coming
} else {
  await supabase.from("bids").update({ payment_ref: session.reference }).eq("id", bid.id);
}
```

This means the mock path exercises the *same* transaction that production uses,
rather than being a separate code path that can rot.

## The deposit rules

Defined in `src/lib/money.ts` and tested at their boundaries in
`tests/money.test.ts`.

```ts
DEPOSIT_PERCENT      = 20      // env: DEPOSIT_PERCENT
DEPOSIT_MINIMUM_USD  = 50      // env: DEPOSIT_MINIMUM_USD

depositFor(amountUsd)  = max(ceil(amountUsd * 20 / 100), 50)
```

Rounded **up**, so the deposit is never a dollar short. Floored at $50, so a
small bid still covers card processing.

```ts
minimumNextBid(opening, current)
  = current === null
      ? opening                                    // first bidder pays asking price
      : current + max(ceil(current * 0.05 / 100) * 100, 100)
```

A 5% increment rounded up to the next $100, with a $100 floor so a panel cannot
be ratcheted a dollar at a time. Worked example: a panel at $64,500 →
5% is $3,225 → rounds to $3,300 → the next acceptable bid is **$67,800**.

`toStripeAmount()` is the single place dollars become cents.

## Going live

**1. Add your keys.**

```bash
STRIPE_SECRET_KEY="sk_live_…"
STRIPE_WEBHOOK_SECRET="whsec_…"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
```

The app switches to live mode on the presence of `STRIPE_SECRET_KEY` alone. No
code change, no flag.

**2. Register the webhook** at `https://yourdomain.com/api/webhooks/stripe`,
subscribed to:

- `checkout.session.completed`
- `checkout.session.expired`
- `charge.refunded`

**3. Test locally against real Stripe** before deploying:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# use the whsec_… it prints as STRIPE_WEBHOOK_SECRET
```

Card `4242 4242 4242 4242`, any future expiry, any CVC.

**4. Verify the round trip.** Place a bid, complete checkout, and confirm the
bid moved from `PENDING` to `DEPOSIT_PAID` (inspect the `public.bids` row in
Supabase). If it stayed `PENDING`, the webhook is not arriving — check the
signature secret first.

## Security posture

**The webhook is the only path that can make a bid live.** Nothing in a URL, a
query parameter, or a client request can promote a bid. `/success` is a
read-only confirmation page.

**The signature is verified against the raw body**, before a single field of the
payload is read:

```ts
const rawBody = await request.text();
event = stripe.webhooks.constructEvent(rawBody, signature, secret);
```

The route sets `runtime = "nodejs"` and never parses the body first — signature
verification needs the exact bytes Stripe sent.

**The bid id travels in `client_reference_id` and `metadata.bidId`**, so the
handler settles exactly one known bid and never trusts a redirect.

**`settleDeposit()` is idempotent.** Stripe delivers at least once; the
`status !== "PENDING"` guard makes redelivery a no-op.

**The server owns the price.** `POST /api/bids` re-reads the panel's live state
and rejects anything below the current minimum with a 409 — a client cannot send
a stale or forged price.

## The `/success` page

Stripe's redirect and the webhook race, and the webhook is the one that counts.
So `/success` deliberately **never claims the panel is won**. It confirms what
was received and states what happens next, which is true whichever arrives
first.

## Refunds

Refunds are issued from the Stripe dashboard. The `charge.refunded` webhook
marks the bid `REFUNDED`.

Three cases where a deposit comes back in full:

| Case | Status | Trigger |
| --- | --- | --- |
| Outbid before close | `OUTBID` → `REFUNDED` | Automatic when a higher bid settles |
| Brand declined | `REJECTED` | Operator decision, no fee |
| Tour cancelled | `REFUNDED` | Unused months pro rata |

The balance — the other 80% — is only charged once the auction closes in the
bidder's favour and the printed proof is approved. That charge is not automated
in this codebase; it is raised manually against the contact email on the winning
bid.

---

Next: [07 — Design system](07-design-system.md)
