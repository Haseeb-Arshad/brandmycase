# 08 — Deployment

> **LEGACY.** The deployment checklist for the current campaign — including
> the environment variables added for the founder, the budget, analytics and
> the acceptance proof, and the steps for `case.haseeburshad.me` — is in
> [13 — Brand the Case](13-brand-the-case.md). The hosting and migration
> mechanics below still apply.

The site ships in **interest mode**: sponsorship inquiries, no payment, no
checkout.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SECRET_KEY` | yes | Server-only key consumed by `@supabase/server`. Never expose, never commit, never put in a `NEXT_PUBLIC_*` value |
| `SUPABASE_PUBLISHABLE_KEY` | no | Unused; this app keeps database access server-side |
| `SUPABASE_JWKS_URL` | no | Auth JWKS endpoint for future authenticated routes |
| `NEXT_PUBLIC_SITE_URL` | yes | Public HTTPS origin, used for metadata and canonical URLs |
| `NEXT_PUBLIC_CONTACT_EMAIL` | yes in production | The inbox sponsorship conversations go to |
| `CAMPAIGN_MODE` | no | Defaults to `interest`. **Leave it unset** |
| `SAFEPAY_*` | no | Dormant. Inert in interest mode; leave blank |
| `DEPOSIT_PERCENT`, `DEPOSIT_MINIMUM_USD` | no | Dormant. Unused in interest mode |

`.env.example` carries placeholders. The actual `.env` file is ignored by Git.

If `NEXT_PUBLIC_CONTACT_EMAIL` is unset, the site does not invent an address:
it omits every `mailto:` and directs people to the placement request form
instead, which is a real working contact mechanism. `npm run preflight` reports
it as an error in production.

## Preflight

```bash
npm run preflight
```

Prints the resolved campaign and payment modes, then exits non-zero on anything
unsafe: a half-configured payment account, a placeholder contact address, a
`NEXT_PUBLIC_*` value that looks like a secret, a non-HTTPS production origin,
or `CAMPAIGN_MODE=auction`.

It is deliberately a separate command rather than a build step, so a developer
without production secrets is never blocked.

## Applying the Supabase schema

The checked-in migrations are the database source of truth:

```bash
npm run db:migrate
```

This requires an authorised Supabase CLI session. The Founding Edition needs
only `20260905000000_create_sponsorship_requests.sql`, which creates
`public.sponsorship_requests`, adds its indexes, maintains `updated_at`,
enables RLS with no policy, and grants only `service_role`.

The two 2026-08-31 migrations belong to the dormant auction phase. They are
harmless to apply and can be skipped on a fresh project — the sponsorship
migration recreates `set_updated_at()` idempotently and does not depend on them.

There is no Prisma, no local SQLite and no seed script. No fictional sponsor or
request is ever written to any environment.

## Build and hosting

```bash
npm ci
npm run build
npm start
```

Any Node host that supports the Next.js App Router can run the app. The
homepage, `/privacy` and `/terms` prerender to static output — the site renders
correctly even before Supabase is provisioned; only the request endpoint needs
the database.

## Production launch checklist

Configuration and data:

- [ ] Supabase migration applied (`sponsorship_requests` exists)
- [ ] Server secret configured (`SUPABASE_SECRET_KEY`, server-only)
- [ ] `NEXT_PUBLIC_SITE_URL` configured, HTTPS
- [ ] Campaign mode is `interest` (`CAMPAIGN_MODE` unset or `interest`)
- [ ] Payment mode is `disabled` in production — confirm with `npm run preflight`
- [ ] No Safepay test or mock UI exposed anywhere
- [ ] Contact information is real and configured (`NEXT_PUBLIC_CONTACT_EMAIL`),
      not a placeholder address

Functional:

- [ ] A placement request submits successfully from the live site
- [ ] The request appears in `public.sponsorship_requests`
- [ ] No sponsorship request data is publicly readable — confirm there is no
      GET route and that `anon` sees zero rows
- [ ] All 20 placements render on the case and in the inventory
- [ ] The mobile 3D experience works: drag to spin, tap to open a request
- [ ] `/api/bids`, `/api/board` and `/success` all return 404
- [ ] `/privacy` works
- [ ] `/terms` works

Copy and claims:

- [ ] No fictional sponsors exist anywhere in the deployed site
- [ ] No price, bid, deposit or funding figure is rendered
- [ ] DevDay date says September 29, 2026
- [ ] OpenAI non-affiliation disclosure is visible in the hero, the trust
      strip, the transparency section, the FAQ and the footer
- [ ] Planned events are clearly marked planned, proposed or under
      consideration — nothing unbooked reads as confirmed
- [ ] No claim of guaranteed venue access, impressions, leads or endorsement

Verification:

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm run preflight` passes against the production environment
- [ ] Back up the Supabase database before operational changes

## Operations

There is no admin panel by design. Read requests and move their status through
the Supabase dashboard or an authorised database client:

```sql
select created_at, placement_id, company, contact_email, budget_range, status
from public.sponsorship_requests
order by created_at desc;
```

Marking a placement reserved or placed is a **code change** to
`src/data/placements.ts`, deployed like any other. That separation is
deliberate: no form submission can change what the site says is available. See
[12](12-founding-edition-launch.md#marking-a-placement-reserved-or-placed).
