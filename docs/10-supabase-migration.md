# 10 — Supabase boundary

> **Still current, with one change:** the homepage now reads confirmed
> sponsorships from Supabase on every request, so the board and the funding bar
> are database-derived rather than purely static. The access boundary described
> below — server-only, service role, RLS with no policy — is unchanged. See
> [13 — Brand the Case](13-brand-the-case.md).

## Decision

Supabase is the only runtime database. In the Founding Edition it holds exactly
one live table: `public.sponsorship_requests`.

The Next.js server uses `@supabase/server` with the server-only
`SUPABASE_SECRET_KEY`; the publishable key is not exposed to browser code and
is not needed at all, because no browser code talks to the database.

The placement map, geometry, availability, campaign copy and print
specifications remain versioned application configuration. They describe a
physical object, not mutable state, and keeping them in code is what lets the
homepage prerender to static output with no query in it.

## Data boundary

- `public.sponsorship_requests` is the canonical store for placement requests.
  RLS is enabled with no policy; `anon` and `authenticated` are revoked; only
  `service_role` is granted. The application publishes no GET endpoint for it.
- Requests are written **only** through `POST /api/sponsorship-requests`, which
  validates with Zod and re-checks the placement against the server's own map.
- A request never changes public availability. Placement status is edited by
  hand in `src/data/placements.ts` and deployed.
- `public.bids` and `public.payment_webhook_events` belong to the dormant
  auction phase. Nothing on the public site reads or writes them.
- `supabase/migrations/` is the schema source of truth.
- There is no seed script and no fictional data in any environment.

## Rollout order

1. Apply the migrations in the Supabase project with an authorised migration
   runner (`npm run db:migrate`). The Founding Edition needs only
   `20260905000000_create_sponsorship_requests.sql`.
2. Configure the server environment from `.env.example` without committing
   `.env` or any key value. Run `npm run preflight`.
3. Start the app and confirm the homepage renders all 20 placements. It does
   this without touching Supabase — if it fails, the problem is not the
   database.
4. Submit one real placement request against the deployed site and confirm the
   row appears in `public.sponsorship_requests`.
5. Confirm the table is not publicly readable: there is no GET route, and a
   query as `anon` returns zero rows.

## Future: moving availability into Supabase

`PlacementState` in `src/lib/placement-board.ts` is already the shape the UI
consumes. Moving status into a table means making `getPlacementBoard()` async
and reading it there; nothing above that module changes, and the homepage would
move from static to dynamic rendering.

Do this only when there is a reason — an operator UI, or enough status churn
that a deploy per change is annoying. With twenty placements and a handful of
changes a year, configuration is the honest amount of machinery.
