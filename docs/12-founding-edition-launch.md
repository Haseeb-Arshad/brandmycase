# 12 — Founding Edition launch

> **SUPERSEDED — this is no longer the operating manual.** The site now runs
> the Brand the Case campaign: a $3,000 travel sponsorship with published
> fixed-price tiers, confirmed sponsorships in the database, and a funding bar.
> Read [13 — Brand the Case](13-brand-the-case.md) instead. This document is
> kept as the record of the inquiry-only model it replaced.

The operating manual for the site as it was shipped in the Founding Edition.

## Current state

CODEC ONE runs the **Founding Edition**: an inquiry-driven sponsorship
campaign. A company rotates the case, picks one of the twenty measured
placements, and sends a non-binding request. The request is reviewed by hand.
If there is a fit, contracting and invoicing happen directly between the
parties, outside this website.

**No payment of any kind is taken on this site.** There is no checkout, no card
form, no deposit and no auction. The payment infrastructure in this repository
is dormant and cannot be reached in the shipped configuration.

| | |
| --- | --- |
| Campaign mode | `interest` (default) |
| Payment mode | `disabled` |
| Public write endpoint | `POST /api/sponsorship-requests` |
| Public read endpoints | none — the board is static |
| Live table | `public.sponsorship_requests` |
| Homepage | statically prerendered; needs no database to render |

## The two levers

Everything hangs off `CAMPAIGN_MODE`, read in exactly one place
(`src/lib/campaign.ts`) and defaulting to `interest` for any value it does not
recognise.

```text
CAMPAIGN_MODE=interest   Founding Edition. /api/bids, /api/board and
                         /success all answer 404. Payment mode is forced
                         to `disabled`.

CAMPAIGN_MODE=auction    The dormant bid-and-deposit phase. Only then does
                         the payment mode matrix below come into play.
```

`resolvePaymentMode()` in `src/lib/payments.ts` is a pure function so the
matrix is testable rather than asserted in a comment. `tests/campaign.test.ts`
sweeps the whole cross-product.

| Campaign | NODE_ENV | Safepay credentials | Payment mode |
| --- | --- | --- | --- |
| `interest` | any | any | **disabled** |
| `auction` | production | none | **disabled** |
| `auction` | any | some | **misconfigured** (fails closed) |
| `auction` | any | all three | **live** |
| `auction` | not production | none | **mock** |

Mock mode therefore requires all three of: an explicit auction campaign, a
non-production `NODE_ENV`, and no credentials at all. A production visitor
cannot reach it by any combination of environment values.

## The inquiry flow

1. A visitor selects a placement — on the 3D case or in the inventory grid.
   Both open the same `PlacementRequestModal`.
2. The form collects company and work email (required), plus optional contact
   name, website, budget band, and message. The placement id is supplied by the
   application, not typed. An acknowledgement checkbox and a hidden honeypot
   field are both validated server-side.
3. `POST /api/sponsorship-requests` applies a soft per-client throttle, parses
   the body with `sponsorshipRequestSchema`, and hands it to
   `createSponsorshipRequest()`.
4. That function re-checks the placement against the server's own panel map,
   applies a durable per-email window, and inserts a row.
5. The confirmation states plainly that no payment was taken and nothing was
   reserved.

A request **never** changes what the site says is available. That separation is
deliberate: a stranger filling in a form must not be able to make the site
claim a placement is taken.

## Where requests are stored

`public.sponsorship_requests`, created by
`supabase/migrations/20260905000000_create_sponsorship_requests.sql`.

- RLS is enabled with **no policy**, so non-service roles see zero rows.
- `anon` and `authenticated` hold no grants; only `service_role` does.
- The application publishes **no GET endpoint** for this table.
- The only way to read requests is an authorised Supabase session — the
  dashboard, or a client holding `SUPABASE_SECRET_KEY`.

There is no admin UI, on purpose. With twenty placements and a handful of
requests, a half-built admin panel is a liability rather than a convenience.

Statuses: `NEW` → `CONTACTED` → `QUALIFIED` → `DECLINED` | `AGREED`.

```sql
-- The operator's working query.
select created_at, placement_id, company, contact_email, budget_range, status
from public.sponsorship_requests
order by created_at desc;

update public.sponsorship_requests set status = 'CONTACTED' where id = '...';
```

## Marking a placement reserved or placed

Availability lives in `src/data/placements.ts`, edited by hand and deployed.

```ts
{ id: "02", code: "FR-MED", name: "The Medallion", face: "front",
  description: "...",
  tier: "prime", status: "RESERVED",   // <- OPEN | IN_CONVERSATION | RESERVED | PLACED
  u: 0, v: 0.13, w: 0.34, h: 0.34, sizeLabel: size(0.34, 0.34) },
```

| Status | Means | Requestable |
| --- | --- | --- |
| `OPEN` | Nobody has been promised it | yes |
| `IN_CONVERSATION` | A request is being discussed, nothing agreed | yes |
| `RESERVED` | Terms agreed, placement held | no |
| `PLACED` | Artwork produced and fitted | no |

**Never set `RESERVED` or `PLACED` without a real agreement**, and never add a
sponsor name to the repository for a company that has not signed one.
`tests/panels.test.ts` asserts every placement ships as `OPEN`; if you
legitimately reserve one, update that test in the same commit so the change is
visible in review rather than silent.

Moving this into Supabase later means making `getPlacementBoard()` async in
`src/lib/placement-board.ts`. `PlacementState` is already the shape the UI
consumes, so nothing above that module changes.

## Production environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SECRET_KEY` | yes | Server-only. Never in a `NEXT_PUBLIC_*` value |
| `SUPABASE_PUBLISHABLE_KEY` | no | Unused; database access is server-side |
| `SUPABASE_JWKS_URL` | no | For future authenticated routes |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://` origin, used for metadata |
| `NEXT_PUBLIC_CONTACT_EMAIL` | yes in production | The inbox shown on the site |
| `CAMPAIGN_MODE` | no | Defaults to `interest`. Leave it unset |
| `SAFEPAY_*`, `DEPOSIT_*` | no | Dormant. Leave blank |

If `NEXT_PUBLIC_CONTACT_EMAIL` is unset the site does **not** invent an
address: it omits every `mailto:` and points people at the placement request
form instead, which is a real working contact mechanism. `npm run preflight`
reports it as an error in production so it cannot ship unnoticed by accident.

## Preflight

```bash
npm run preflight
```

Reads the environment the way the application does and prints the resolved
campaign and payment modes, then fails non-zero on anything unsafe: a half
configured payment account, a placeholder contact address, a `NEXT_PUBLIC_*`
value that looks like a secret, a non-HTTPS production origin.

It is a separate command rather than a build step so a developer without
production secrets is never blocked by it.

## Launch checklist

See [08 — Deployment](08-deployment.md) for the full checklist.

## Re-enabling payments safely, later

Do not do this casually. The order matters.

1. Complete Safepay merchant onboarding and obtain **sandbox** credentials.
2. Read [11 — Safepay integration plan](11-safepay-integration-plan.md) and
   [06 — Payments](06-payments.md) in full.
3. Decide what is actually being sold and write the terms first. The retired
   auction promised things this project did not control — twelve guaranteed
   cities, insurance, a reserve shell, automatic refunds. Those claims have
   been removed from the site and must not return without something real
   behind them.
4. Re-check every public string. The Founding Edition copy states, in several
   places, that no payment is taken on this site. All of it becomes false the
   moment a checkout exists.
5. On a **staging** deployment only: set `CAMPAIGN_MODE=auction` with sandbox
   credentials and verify `PENDING → DEPOSIT_PAID` end to end, including the
   signed webhook and a refund.
6. Only then consider production keys — and re-read step 4.

`npm run preflight` treats `CAMPAIGN_MODE=auction` as an error precisely so
that switching it on is a deliberate act rather than a stray environment
variable.

## TODO — needs information only the operator can supply

- [ ] **A real contact inbox.** Set `NEXT_PUBLIC_CONTACT_EMAIL`. Until then the
      site directs people to the request form.
- [ ] **Legal identity.** `/privacy` and `/terms` name no registered company,
      address, jurisdiction or registration number, because none has been
      supplied to this repository. They refer to "the CODEC project". If a
      legal entity exists, put it in `SITE.operator` in `src/data/site.ts` and
      in both legal pages.
- [ ] **Legal review.** The privacy and terms pages are practical launch copy
      describing what the application actually does. They are not a claim that
      professional legal review has taken place. Have them reviewed before
      signing a sponsorship agreement.
- [ ] **Data retention.** `/privacy` says requests are kept while a
      conversation is live and for a reasonable period after. Decide the actual
      period and state it.

---

Back to [the documentation index](../README.md#documentation).
