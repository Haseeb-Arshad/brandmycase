# 06 — Payments

> **FUTURE / DISABLED.**
>
> The site takes **no payment of any kind**. There is no checkout, no card
> form, no deposit and no auction. Sponsorships are invoiced directly,
> off-site. Everything in this document describes dormant infrastructure
> retained for a possible later phase.
>
> Read [13 — Brand the Case](13-brand-the-case.md) first.

## Why it is off, and how

`CAMPAIGN_MODE` (default `interest`) is read in one place,
`src/lib/campaign.ts`. While it is not `auction`:

- `resolvePaymentMode()` returns `disabled` regardless of any credential;
- `/api/bids` answers 404 before reading the body or touching Supabase;
- `/api/board` answers 404;
- `/success` calls `notFound()`;
- `/api/webhooks/safepay` answers 503 and settles nothing;
- `createDepositSession()` throws rather than minting a reference.

## The payment mode matrix

`resolvePaymentMode()` is a **pure function** so this table is testable rather
than asserted in a comment. `tests/campaign.test.ts` sweeps the whole
cross-product of campaign mode, `NODE_ENV` and credential combinations.

| Campaign | `NODE_ENV` | Safepay credentials | Mode |
| --- | --- | --- | --- |
| `interest` | any | any | **disabled** |
| `auction` | production | none | **disabled** |
| `auction` | any | some | **misconfigured** |
| `auction` | any | all three | **live** |
| `auction` | not production | none | **mock** |

### Why mock mode is gated three deep

A mock payment is a useful development fiction and a catastrophic thing to show
a real visitor: it tells somebody money moved when it did not. Reaching it
requires **all** of an explicit auction campaign, a non-production `NODE_ENV`,
and no credentials at all. No combination of environment values gets a
production visitor there.

### Why a partial configuration fails closed

`misconfigured` refuses rather than falling back to mock. A half-configured
account that silently entered mock mode would look healthy while taking no real
payments — the worst of both states. `npm run preflight` reports it as an error.

Blank strings are treated as absent, not as configuration, so a `.env` full of
`SAFEPAY_PUBLIC_KEY=""` does not read as partially set.

---

## The retired auction's payment model

Kept for reference. None of it runs in the shipped configuration.

### Deposit rules

Defined in `src/lib/money.ts` and tested at their boundaries in
`tests/money.test.ts`:

```text
DEPOSIT_PERCENT      = 20      // env: DEPOSIT_PERCENT
DEPOSIT_MINIMUM_USD  = 50      // env: DEPOSIT_MINIMUM_USD

depositFor(amountUsd) = max(ceil(amountUsd * 20 / 100), 50)
```

Amounts were whole USD. `toPaymentAmount()` converted to the processor's
smallest unit exactly once at the Safepay boundary.

### Hosted checkout

Safepay's hosted Express Checkout flow creates a tracker, creates a short-lived
passport token, generates a hosted checkout URL, and redirects the customer.
The return URL was informational; only the signed webhook could settle a bid.

### Webhook

```text
https://yourdomain.com/api/webhooks/safepay
```

Subscribed to `payment.succeeded`, `payment.failed`, `payment.refunded`,
`authorization.succeeded`, `authorization.reversed`, `void.succeeded`.

The route reads the raw request body and calculates HMAC-SHA512 with
`SAFEPAY_WEBHOOK_SECRET`, comparing against `X-SFPY-SIGNATURE` with a
constant-time comparison **before** parsing or trusting the payload.

The provider event token is stored in `payment_webhook_events` with a unique
`(provider, event_id)` key, so duplicate deliveries are acknowledged without
repeating settlement or refund work.

For `payment.succeeded` the server verified: the bid id in `metadata.bid_id` or
`metadata.order_id`; that the tracker matched the bid's stored reference; that
the currency was USD; and that the smallest-unit amount equalled the
server-calculated deposit. Only then did the atomic `settle_bid` RPC mark the
bid `DEPOSIT_PAID` and demote any lower live bid on that panel.

### Refunds

```text
NOT_REQUESTED → PENDING → PROCESSING → SUCCEEDED
                                      └→ PARTIAL
                                      └→ FAILED
```

The settlement RPC returned the demoted bids; the server requested a full
refund for each captured deposit. `payment.refunded` was the final
confirmation. Failed requests stayed recorded with an error and were retried in
a bounded batch on the next successful payment webhook.

### Security posture (still true of the dormant code)

- The webhook was the only path that could promote a bid. Nothing in a URL
  could.
- The server recalculated the minimum bid and the deposit; client amounts were
  never trusted.
- Raw card numbers and CVV were never handled or stored by this application.
- A partial configuration failed closed rather than entering mock mode.

## Environment

All of these are inert while `CAMPAIGN_MODE` is `interest`. Leave them blank.

```dotenv
SAFEPAY_PUBLIC_KEY=""
SAFEPAY_SECRET_KEY=""
SAFEPAY_WEBHOOK_SECRET=""
SAFEPAY_ENVIRONMENT="sandbox" # sandbox | production
SAFEPAY_INTENT="CYBERSOURCE"  # CYBERSOURCE | MPGS
DEPOSIT_PERCENT="20"
DEPOSIT_MINIMUM_USD="50"
```

None of these values belongs in a `NEXT_PUBLIC_*` variable, browser code, Git,
or chat.

## Before re-enabling any of this

The technical work is not the hard part. The retired auction promised things
this project did not control — twelve guaranteed cities, insurance, a reserve
shell, automatic refunds, guaranteed venue exposure. Those claims have been
removed from the site and must not return without something real behind them.

Every public string that currently says no payment is taken becomes false the
moment a checkout exists. The step-by-step order is in
[12 — Founding Edition launch](12-founding-edition-launch.md#re-enabling-payments-safely-later).

## Local verification

```bash
npm test
npm run typecheck
npm run build
npm run preflight
```

`npm run preflight` treats `CAMPAIGN_MODE=auction` as an error, precisely so
switching it on is a deliberate act rather than a stray environment variable.

---

Next: [07 — Design system](07-design-system.md)
