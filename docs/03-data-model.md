# 03 — Data model

## One table

```prisma
model Bid {
  id              String   @id @default(cuid())
  placementId     String   // "01".."20" — validated against PLACEMENTS, not a FK
  company         String
  contactEmail    String
  websiteUrl      String?
  message         String?
  amountUsd       Int      // whole US dollars, never cents, never a float
  depositUsd      Int
  status          String   @default("PENDING")
  paymentProvider String   @default("mock")   // "stripe" | "mock"
  paymentRef      String?  // Stripe session id, or a mock reference
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([placementId])
  @@index([placementId, amountUsd])
  @@index([status])
}
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

SQLite has no native enum, so `status` is a checked string. These are the only
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
await prisma.$transaction(async (tx) => {
  const bid = await tx.bid.findUnique({ where: { id: bidId } });
  if (!bid || bid.status !== "PENDING") return;      // idempotency guard

  await tx.bid.updateMany({
    where: {
      placementId: bid.placementId,
      status: { in: LIVE_BID_STATUSES },
      amountUsd: { lte: bid.amountUsd },
      id: { not: bid.id },
    },
    data: { status: "OUTBID" },
  });

  await tx.bid.update({
    where: { id: bid.id },
    data: { status: "DEPOSIT_PAID", paymentRef },
  });
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

`prisma/seed.ts` writes a plausible mid-campaign board: thirteen panels taken,
seven open, with real losing-bid rows behind each leader so bid counts are
genuine. Every sponsor name is fictional — see the warning in the
[README](../README.md).

```bash
npm run db:seed     # seed on top of a wipe
npm run db:reset    # force-reset the schema, then seed
npm run db:studio   # inspect and hand-edit bids
```

---

Next: [04 — API reference](04-api.md)
