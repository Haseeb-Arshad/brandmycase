# 03 — Data model

> **LEGACY — describes the table before the sponsorship migration.** The
> current schema, its new columns, its status vocabulary and the constraints
> that protect the funding bar are documented in
> [13 — Brand the Case](13-brand-the-case.md), and the canonical source is
> `supabase/migrations/20260908000000_sponsorship_campaign.sql`.

The Founding Edition has one live table. Everything else in the schema belongs
to the dormant auction phase and is documented at the end.

## `sponsorship_requests` — the only live table

```sql
-- Full source: supabase/migrations/20260905000000_create_sponsorship_requests.sql
create table public.sponsorship_requests (
  id            uuid primary key default gen_random_uuid(),
  placement_id  text not null,
  company       text not null,
  contact_name  text,
  contact_email text not null,
  website_url   text,
  budget_range  text,          -- one of six bands, or null
  message       text,
  status        text not null default 'NEW',
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);
```

These rows are **expressions of interest, not orders**. There is no amount
column, no payment column and no reservation column, because none of those
things exist in this campaign. A row records that a company asked about a
placement. Nothing more.

### Access

The table holds other companies' contact details and budget signals, so it is
server-only by construction:

- RLS is enabled with **no policy** — a non-service role sees zero rows even if
  a grant were added by mistake;
- `anon` and `authenticated` are explicitly revoked; only `service_role` is
  granted;
- the application publishes **no GET endpoint** for it.

The only way to read a request is an authorised Supabase session.

### Status lifecycle

A checked string rather than a Postgres enum, so it stays portable.

```
        POST /api/sponsorship-requests
                      │
                      ▼
                  ┌───────┐
                  │  NEW  │  received, not yet read
                  └───┬───┘
                      │  operator replies
                      ▼
              ┌─────────────┐
              │  CONTACTED  │
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
 ┌─────────────┐         ┌──────────┐
 │  QUALIFIED  │         │ DECLINED │
 └──────┬──────┘         └──────────┘
        │  written terms agreed by both parties, off-site
        ▼
   ┌──────────┐
   │  AGREED  │
   └──────────┘
```

`AGREED` records that a sponsorship agreement exists. It does **not** change
what the site shows: availability is edited by hand in
`src/data/placements.ts`, and that is a separate, deliberate act. See
[12 — Founding Edition launch](12-founding-edition-launch.md).

### Rate limiting and duplicates

Two layers, both cheap:

1. **In-process** (`src/lib/rate-limit.ts`) — a Map of recent hits per client
   key, 8 requests per 10 minutes. A speed bump that absorbs a burst; it does
   not survive a restart and is not treated as a security control.
2. **Durable** (`src/lib/sponsorship.ts`) — a count of rows with the same
   `contact_email` in the last 24 hours, capped at 5. This one survives
   restarts and multiple instances.

A repeat request for the *same* placement from the same address inside the
window returns the existing row's id and is reported to the browser as
received. A double-click is not an error.

### `placement_id` is not a foreign key

There is no placement table to point at — the twenty placements are typed
constants. `z.enum(placementIds)`, generated from `PLACEMENTS`, rejects an
unknown id at the API boundary before any write, and
`createSponsorshipRequest()` re-checks it against the server's own map. See
[02 — Architecture](02-architecture.md#why-placements-are-not-in-the-database).

## Derived placement state

A placement's public state is not stored in Postgres at all.
`getPlacementBoard()` derives it synchronously from `src/data/placements.ts`:

```ts
statusLabel = PLACEMENT_STATUS_LABELS[placement.status];
requestable = REQUESTABLE_STATUSES.includes(placement.status);
tierLabel   = TIER_LABELS[placement.tier];
```

`PlacementState` deliberately carries no price, no bid, no sponsor name and no
deposit. Nothing serialised to the browser can leak a monetary value because no
monetary value is put on the wire in the first place —
`tests/panels.test.ts` serialises the board and asserts it.

## Seeding

There is no seed script and there never will be one. No fictional sponsor,
request or agreement may be written to any environment. The board ships with
all twenty placements `OPEN`, and a test enforces it.

---

## FUTURE / DISABLED IN THE FOUNDING EDITION — auction schema

`public.bids` and `public.payment_webhook_events` are created by the two 2026-08-31
migrations and belong to the retired bid-and-deposit phase. They are unused:
nothing on the public site reads or writes them, and every route that could is
gated behind `CAMPAIGN_MODE=auction`.

They are kept because the settlement RPC and the webhook ledger are real,
carefully built work — an atomic `settle_bid` that promotes a bid and demotes
whoever it beat in one commit, and an idempotency ledger keyed on the provider
event token. Re-deriving that later would be worse than carrying it dormant.

```sql
create table public.bids (
  id text primary key,
  placement_id text not null,
  company text not null,
  contact_email text not null,
  website_url text,
  message text,
  amount_usd integer not null,
  deposit_usd integer not null,
  status text not null default 'PENDING',   -- PENDING | DEPOSIT_PAID | OUTBID
  payment_provider text not null,            -- | WON | REFUNDED | REJECTED
  payment_ref text,
  payment_currency text not null default 'USD',
  payment_amount_minor integer,
  payment_captured_at timestamptz,
  refund_status text not null default 'NOT_REQUESTED',
  refund_ref text,
  refund_amount_minor integer not null default 0,
  refund_requested_at timestamptz,
  refunded_at timestamptz,
  refund_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

If you are applying migrations to a fresh project and have no intention of ever
running an auction, these two migrations can be skipped: the
`sponsorship_requests` migration recreates `set_updated_at()` idempotently and
does not depend on them. Do not drop them from an existing project without
checking there is nothing in them.

Details of the retired settlement and refund model are in
[06 — Payments](06-payments.md), also marked dormant.

---

Next: [04 — API reference](04-api.md)
