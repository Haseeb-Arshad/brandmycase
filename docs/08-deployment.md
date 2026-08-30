# 08 — Deployment

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | no | Client-safe key; this app keeps database access server-side |
| `SUPABASE_SECRET_KEY` | yes | Server-only key consumed by `@supabase/server`; never expose or commit |
| `SUPABASE_JWKS_URL` | no | Auth JWKS endpoint for future user-authenticated routes |
| `NEXT_PUBLIC_SITE_URL` | yes | Public origin used for Stripe redirects and metadata |
| `STRIPE_SECRET_KEY` | no | Blank runs the payment layer in mock mode |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | Required whenever Stripe is enabled |
| `DEPOSIT_PERCENT` | no | Defaults to `20` |
| `DEPOSIT_MINIMUM_USD` | no | Defaults to `50` |

`.env.example` carries placeholders. The actual `.env` file is ignored by Git.
Never put `SUPABASE_SECRET_KEY` in a `NEXT_PUBLIC_*` variable or client code.

## Applying the Supabase schema

The checked-in migration is the database source of truth:

```bash
npm run db:migrate
```

This requires an authorized Supabase CLI session and applies
`supabase/migrations/20260831000000_create_bids.sql`. The migration creates
`public.bids`, adds indexes, enables RLS, maintains `updated_at`, and installs
the atomic `settle_bid` RPC used by payment settlement.

The current application no longer uses Prisma or a local SQLite database. It
does not seed fictional sponsors; the board is empty until real bid rows are
written to Supabase.

## Build and hosting

```bash
npm ci
npm run build
npm start
```

Any Node host that supports the Next.js App Router can run the app. The Stripe
webhook route uses the Node runtime because it verifies the raw request body.

## Deployment checklist

- [ ] Apply the Supabase migration with an authorized database session.
- [ ] Configure the server-only Supabase secret key and public origin.
- [ ] Confirm `GET /api/board` returns all 20 panels and only real live bids.
- [ ] Add Stripe keys, register the webhook, and verify a real
      `PENDING → DEPOSIT_PAID` test purchase before enabling live payments.
- [ ] Confirm the auction end date in `src/data/site.ts`.
- [ ] Run `npm test && npm run typecheck && npm run build`.
- [ ] Back up the Supabase database before operational changes.

There is no admin panel by design. Use the Supabase dashboard or an authorized
database client for operational inspection and high-consequence bid changes.
