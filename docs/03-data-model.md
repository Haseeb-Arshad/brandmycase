# 03 — Data model

## One table

```sql
-- Full source: supabase/migrations/20260831000000_create_bids.sql
create table public.bids (
  id text primary key,
  placement_id text not null,
  company text not null,
  contact_email text not null,
  website_url text,
  message text,
  amount_usd integer not null,
  deposit_usd integer not null,
  status text not null default 'PENDING',
  payment_provider text not null default 'mock',
  payment_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

That is the entire schema. Panels are typed constants in
`src/data/placements.ts` — see [02 — Architecture](02-architecture.md#why-panels-are-not-in-the-database).

`placementId` is intentionally not a foreign key: there is no panel table to
point at. It is validated by `z.enum(placementIds)` at the API boundary, which
is generated from `PLACEMENTS`, so an unknown id is rejected with a 422 before
any write.

## Money is always integer dollars

Every amount in the system is a whole-dollar `Int`. There are no floats and no
cents anywhere except one function, `toStripeAmount()`, which converts at the
Stripe boundary. Bids on physical panels are never fractional, and integers make
every comparison in the auction exact.

## Bid lifecycle

Postgres uses a checked string rather than an enum, so `status` remains portable. These are the only
legal values and transitions:

```
                    POST /api/bids
                          │
                          ▼
                     ┌─────────┐
                     │ PENDING │  written, deposit not yet captured.
                     └────┬────┘  Holds NO claim on the panel.
                          │
        ┌─────────────────┼──────────────────┐
        │ deposit settles │                  │ checkout expires
        ▼                 │                  ▼
 ┌──────────────┐         │              (row deleted)
 │ DEPOSIT_PAID │◄────────┘
 └──────┬───────┘  live. This is the bid the board shows.
        │
        ├──── a higher bid settles ────►  ┌────────┐
        │                                 │ OUTBID │ → REFUNDED
        │                                 └────────┘
        │
        ├──── operator declines brand ──►  REJECTED  (deposit returned in full)
        │
        └──── auction closes in favour ─►  ┌─────┐
                                           │ WON │ balance charged after proof
                                           └─────┘
```

`LIVE_BID_STATUSES` in `src/lib/db.ts` is `["DEPOSIT_PAID", "WON"]` — the two
states that count as a live claim on a panel. Every board query filters on it.

## Derived panel state

A panel's "current bid" is not stored. It is the highest live bid:

```ts
const leader = bids                                  // ordered amountUsd desc
  .filter(b => LIVE_BID_STATUSES.includes(b.status))
  [0] ?? null;

currentBidUsd = leader?.amountUsd ?? null;
sponsor       = leader?.company   ?? null;
taken         = leader !== null;
minimumBidUsd = minimumNextBid(placement.openingBidUsd, currentBidUsd);
```

Deriving rather than storing means there is no denormalised field to fall out of
sync, and the bid *history* is real rows rather than a counter — the "11 bids"
on a panel is `bids.length`, not a number someone incremented.

## The one transaction that matters

`settleDeposit()` promotes a bid and demotes whoever it beat, atomically:

```ts
await supabase.rpc("settle_bid", {
  p_bid_id: bidId,
  p_payment_ref: paymentRef,
});
```

Two properties worth noting:

**It is idempotent.** The `status !== "PENDING"` guard means calling it twice is
a no-op. Stripe delivers webhooks at least once, so this matters in production.

**It is atomic.** Marking the new leader live and the old leader outbid happen
in one commit. Split across two statements, a reader between them would see
either two live leaders or none.

## Concurrency

Two bidders racing on the same panel is handled by ordering, not locking:

1. Both bids are written as `PENDING`. Neither holds the panel.
2. Whichever deposit settles first becomes `DEPOSIT_PAID`.
3. When the second settles, its `updateMany` marks the first `OUTBID` if the
   second is higher — or, if the second is *lower*, the first stays live and the
   second is superseded on the next settle.

The `amountUsd: { lte: bid.amountUsd }` filter is what makes step 3 safe: a
settling bid only outbids amounts at or below its own. A lower late-settling bid
cannot dethrone a higher live one.

The remaining sharp edge is that a lower bid can still settle and briefly show
as live if it settles after a higher bid that was never paid. Since unpaid bids
never reach `DEPOSIT_PAID`, this does not occur in practice.

## Seeding

There is no seed script. The retired local fixture contained fictional sponsor
names and was removed so a fresh setup cannot publish invented auction data.
Use the Supabase dashboard or an authorized migration/operations path to
inspect real rows; do not add demo sponsors to production.

---

Next: [04 — API reference](04-api.md)
