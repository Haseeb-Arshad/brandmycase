# 08 — Deployment

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | no | Client-safe key; this app keeps database access server-side |
| `SUPABASE_SECRET_KEY` | yes | Server-only key consumed by `@supabase/server`; never expose or commit |
| `SUPABASE_JWKS_URL` | no | Auth JWKS endpoint for future user-authenticated routes |
| `NEXT_PUBLIC_SITE_URL` | yes | Public origin used for Safepay checkout redirects and metadata |
| `SAFEPAY_PUBLIC_KEY` | with live Safepay | Public merchant API key for tracker creation |
| `SAFEPAY_SECRET_KEY` | with live Safepay | Server-only API secret for tracker, passport, and refund calls |
| `SAFEPAY_WEBHOOK_SECRET` | with live Safepay | Server-only HMAC secret for `/api/webhooks/safepay` |
| `SAFEPAY_ENVIRONMENT` | no | `sandbox` by default; use `production` only after approval |
| `SAFEPAY_INTENT` | no | `CYBERSOURCE` by default; `MPGS` if enabled for the account |
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
written to Supabase. The second migration adds provider payment state and the
private webhook-event ledger.

## Build and hosting

```bash
npm ci
npm run build
npm start
```

Any Node host that supports the Next.js App Router can run the app. The Safepay
webhook route uses the Node runtime because it verifies the raw request body.

## Deployment checklist

- [ ] Apply the Supabase migration with an authorized database session.
- [ ] Configure the server-only Supabase secret key and public origin.
- [ ] Confirm `GET /api/board` returns all 20 panels and only real live bids.
- [ ] Complete and obtain approval for the Safepay merchant onboarding.
- [ ] Add Safepay sandbox keys, register `/api/webhooks/safepay`, and verify a
      sandbox `PENDING → DEPOSIT_PAID` test purchase.
- [ ] Confirm international USD acceptance and Pakistani bank settlement with
      Safepay before applying production keys.
- [ ] Add Safepay production keys, register the production webhook, and verify a real
      `PENDING → DEPOSIT_PAID` test purchase before enabling live payments.
- [ ] Confirm the auction end date in `src/data/site.ts`.
- [ ] Run `npm test && npm run typecheck && npm run build`.
- [ ] Back up the Supabase database before operational changes.

There is no admin panel by design. Use the Supabase dashboard or an authorized
database client for operational inspection and high-consequence bid changes.
