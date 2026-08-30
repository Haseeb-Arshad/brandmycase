# Supabase migration boundary

## Decision

Supabase is the only runtime database for auction bids. The Next.js server uses
`@supabase/server` with the server-only `SUPABASE_SECRET_KEY`; the publishable
key is not exposed to browser code. The panel map, geometry, campaign copy, and
print specifications remain versioned application configuration because they
describe the physical case rather than mutable auction state.

## Data boundary

- `public.bids` is the canonical source for live bids, payment state, and bid
  history.
- The fictional SQLite seed data is removed. No fake sponsor rows are recreated
  by setup or deployment commands.
- `supabase/migrations/` is the schema source of truth. It includes the atomic
  `settle_bid` function used by payment settlement.
- The public board reads through the server API, so the secret key never enters
  the client bundle.

## Rollout order

1. Apply the migration in the Supabase project with an authorized database
   migration runner.
2. Configure the server environment from `.env.example` without committing
   `.env` or any key values.
3. Start the app and verify `GET /api/board` returns all 20 panels with empty
   live-bid state until real rows exist.
4. Verify a mock bid writes to Supabase and updates the board. Use Stripe only
   after its live keys and webhook are configured.

The current Codex Supabase MCP connection is read-only in this task, so remote
schema or row mutations are intentionally not performed here. The migration is
ready to apply through an authorized deployment path.
