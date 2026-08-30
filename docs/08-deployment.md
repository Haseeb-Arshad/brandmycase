# 08 — Deployment

## Environment variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` | SQLite locally; a `postgresql://` URL in production |
| `NEXT_PUBLIC_SITE_URL` | yes | `http://localhost:3000` | Used to build Stripe redirect URLs and `metadataBase`. No trailing slash |
| `STRIPE_SECRET_KEY` | no | *(blank)* | Blank runs the payment layer in mock mode |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | *(blank)* | Required whenever `STRIPE_SECRET_KEY` is set |
| `DEPOSIT_PERCENT` | no | `20` | Deposit as a percentage of the bid |
| `DEPOSIT_MINIMUM_USD` | no | `50` | Floor on the deposit |

`.env.example` carries working defaults for all of them.

## Switching to Postgres

SQLite is right for local development and wrong for a deployment with more than
one instance. Two changes:

**1. `prisma/schema.prisma`**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**2. Generate a migration** rather than using `db push`:

```bash
npx prisma migrate dev --name init
npx prisma migrate deploy      # in CI / on the host
```

Nothing in the application code changes. The schema uses no SQLite-specific
types — `status` is already a plain checked string rather than an enum, which is
also what let it stay portable.

If you move to Postgres you may want a real enum for `status` and a partial
unique index enforcing at most one live bid per panel. Neither is required —
`settleDeposit()`'s transaction already guarantees it — but they turn an
invariant into a constraint.

## Build

```bash
npm ci
npm run build     # prisma generate && next build
npm start
```

`npm run build` runs `prisma generate` first so the client matches the schema.

**Windows note:** if `prisma generate` fails with
`EPERM: operation not permitted, rename … query_engine-windows.dll.node`, a
running Node process is holding the engine DLL. Stop any dev server or Prisma
Studio and retry, or run `npx next build` directly if the client is already
generated.

## Hosting

The app needs a Node runtime — the Stripe webhook route sets
`runtime = "nodejs"` because it reads the raw request body for signature
verification, and both pages are `force-dynamic` since they read live bids.

Any Node host works: Vercel, Fly, Railway, a container.

**Route rendering:**

| Route | Mode |
| --- | --- |
| `/` | Dynamic — reads the board per request |
| `/success` | Dynamic — reads one bid |
| `/api/*` | Dynamic |
| `/_not-found` | Static |

**Bundle:** ~103 kB shared JS. three.js is **not** in it — `CaseCanvas` is
dynamically imported with `ssr: false`, so the WebGL bundle loads only when the
stage mounts.

## Deployment checklist

**Before the first public deploy**

- [ ] **Clear the fictional sponsors.** Empty `DEMO_BIDS` in `prisma/seed.ts`
      and run `npm run db:reset`, or replace them with brands that have actually
      signed. Shipping an invented company as a real sponsor is the single worst
      thing this repo could do by accident.
- [ ] Re-read the affiliation copy in `src/data/site.ts` — the FAQ answer, the
      note under the tour, and the footer line. Keep them.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real domain.
- [ ] Move `DATABASE_URL` to Postgres and run `prisma migrate deploy`.
- [ ] Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- [ ] Register the webhook endpoint and subscribe the three events listed in
      [06 — Payments](06-payments.md).
- [ ] Complete one real test purchase and confirm the bid moves
      `PENDING → DEPOSIT_PAID`.
- [ ] Confirm the auction end date in `SITE.auctionEndsAt` is correct — the hero
      countdown reads from it.
- [ ] `npm test && npm run typecheck && npm run build` all clean.

**Operational**

- [ ] Back up the database — the bid table *is* the auction.
- [ ] Watch for `PENDING` bids older than a day: those are abandoned checkouts
      whose `checkout.session.expired` webhook did not arrive.
- [ ] When the auction closes, mark winners `WON` and everything else
      `OUTBID`/`REFUNDED`, then raise the 80% balances manually.

## Operating without a UI

There is no admin panel by design (see
[01 — Overview](01-overview.md#what-is-deliberately-not-here)). Rare,
high-consequence actions are done against the database:

```bash
npm run db:studio
```

Decline a brand → set that bid to `REJECTED` and refund the deposit in Stripe.
Close the auction → set the leader on each panel to `WON`. The legal transitions
are documented in [03 — Data model](03-data-model.md#bid-lifecycle).

---

Next: [09 — Sponsor kit](09-sponsor-kit.md)
