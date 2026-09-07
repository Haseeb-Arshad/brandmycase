# Brand the Case — a travel sponsorship project by Haseeb Arshad

A developer from Pakistan was accepted to attend **OpenAI DevDay** in San
Francisco. This site raises **$3,000** in B2B sponsorship for the trip by
selling physical brand placements on the travel case going with him. Companies
rotate a real 3D model of the case, pick a placement, and send an inquiry.

## Read this first

- **This is an independent project.** OpenAI does not sponsor, endorse,
  organise, approve, partner with or otherwise participate in this campaign.
  Haseeb has been accepted to attend DevDay as an attendee; that is the entire
  relationship. It is stated in the hero, the founder section, the FAQ, the
  transparency section, the terms and the footer, and it must stay that way.
- **No payment is taken on this site.** No checkout, no card form, no deposit.
  A company sends an inquiry; Haseeb confirms availability and invoices them
  directly, off-site.
- **Fixed prices, three tiers.** Anchor $1,000 (1 placement), Partner $500
  (4 placements), Supporter $250 (15 placements). One Anchor plus four
  Partners is exactly the $3,000 goal; a test holds that arithmetic in place.
- **Only CONFIRMED sponsorships count.** The funding bar sums confirmed rows in
  Supabase and nothing else — not inquiries, not sent invoices. A panel is
  shown as taken only because a confirmed sponsorship says so.
- **Nothing is invented.** No sample sponsors, no testimonials, no impressions,
  no attendance figures, no placeholder email address. Where a fact has not
  been supplied — the portrait, the acceptance screenshot, the budget split —
  the interface renders honestly without it and accepts it later through
  configuration. `npm run preflight` lists exactly what is missing.
- **The retired auction is dormant, not deleted.** Every payment module is
  gated behind `CAMPAIGN_MODE=auction` and marked `FUTURE / DISABLED`.

Start at [docs/13 — Brand the Case](docs/13-brand-the-case.md).

<!-- ------------------------------------------------------------------ -->

## Quick start

```bash
npm install
cp .env.example .env      # set SUPABASE_URL and SUPABASE_SECRET_KEY
npm run setup             # apply the Supabase migrations
npm run dev               # http://localhost:3000
```

The homepage renders **without a database**: no confirmed sponsorships means an
unfunded campaign with all twenty placements open, which is the truth on day
one. Supabase is needed to store an inquiry and to record sponsorships.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run the Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run preflight` | Report what the current environment would do in production |
| `npm run db:migrate` | Apply Supabase migrations |

<!-- ------------------------------------------------------------------ -->

## What is in here

```
src/
  app/
    page.tsx                  the campaign, in conversion order
    layout.tsx                metadata, Inter, optional analytics script
    opengraph-image.tsx       the share card — type only, no logos
    globals.css               the whole design system, one file, no framework
    privacy/page.tsx          what is collected and why
    terms/page.tsx            non-binding, no payment, independent
    api/sponsorship-requests/ POST — the one live endpoint
    api/bids/                 FUTURE / DISABLED — 404 in interest mode
    api/board/                FUTURE / DISABLED — 404 in interest mode
    api/webhooks/safepay/     FUTURE / DISABLED — 503 in interest mode
    success/page.tsx          FUTURE / DISABLED — notFound() in interest mode
  components/
    CampaignProvider.tsx      one snapshot, one form, every entry point
    Hero.tsx                  headline, offer, funding bar
    FundingProgress.tsx       confirmed money only
    Founder.tsx               who is carrying the case + acceptance proof
    Packages.tsx              the three tiers
    CaseSection.tsx           the 3D case + the same panels as buttons
    CaseStage.tsx             rotation model, drag, face switcher
    SponsorshipModal.tsx      the inquiry form
    Sections.tsx              server-rendered editorial sections
    SponsorButton.tsx         the CTA, wherever it appears
    TrackedLink.tsx           an external link that reports an event
    Nav.tsx                   sticky nav
    three/                    the case: canvas, scene, model, panels, textures
  data/
    placements.ts             THE PANEL MAP — geometry and print sizes
    sponsorship.ts            THE OFFER — tiers, prices, panel assignment, goal
    site.ts                   campaign copy, founder, FAQ, budget, disclosures
    internal-index.ts         FUTURE / DISABLED — the retired price ladder
  lib/
    funding.ts                confirmed sponsorships -> funding + sponsor list
    placement-board.ts        panels + tiers + confirmed rows -> the board
    sponsorship.ts            the inquiry service and its availability checks
    analytics.ts              conversion events, no dependency, no cookie
    validation.ts             Zod request schemas
    rate-limit.ts             small in-process throttle
    supabase.ts               server-only Supabase client and database types
    campaign.ts               the one campaign-mode switch
    payments.ts auction.ts    FUTURE / DISABLED
    money.ts refunds.ts       FUTURE / DISABLED
    payment-events.ts db.ts   FUTURE / DISABLED
supabase/
  migrations/                 canonical schema
scripts/
  preflight.mjs               production configuration check
  gen-panel-table.mts         regenerates the sponsor-kit table
docs/                         start at 13, then 01
tests/                        Vitest: geometry, funding, validation, guards
```

<!-- ------------------------------------------------------------------ -->

## The four ideas worth knowing

**1. The panel map is one file; the offer is another.**
`src/data/placements.ts` holds the geometry, print size and copy for all twenty
placements — nothing commercial. `src/data/sponsorship.ts` holds the tiers,
the prices and which panels belong to which tier. The 3D scene, the panel grid,
the form, the API validation and the sponsor kit all read from those two, so a
placement cannot drift between what is rendered, what is offered and what is
fabricated. `tests/panels.test.ts` proves no placement overhangs its face and no
two on a face overlap — that test caught a real collision between 07 and 08.

**2. Only confirmed money is money.** `summariseFunding()` is a pure function
over confirmed sponsorships; `tests/funding.test.ts` sweeps what counts and what
does not. A confirmed row with no amount cannot exist — the database rejects it
— and a sponsor is named on the page only where `display_permission` is true
and a display name was entered deliberately.

**3. The server owns availability.** A browser can suggest a panel; only the
server decides. The inquiry endpoint re-reads confirmed sponsorships before
accepting anything, refuses a panel that is taken and refuses a panel that is
not in the tier being bought. Underneath that, a partial unique index makes two
CONFIRMED rows on one panel impossible at the database level.

**4. Payments fail closed, three deep.** Mock payments are useful locally and
catastrophic in front of a real visitor: they say money moved when it did not.
Reaching mock mode requires an explicit auction campaign, a non-production
`NODE_ENV`, **and** no credentials at all. `resolvePaymentMode()` is a pure
function so `tests/campaign.test.ts` can sweep the entire cross-product, and
`tests/api-guards.test.ts` calls the route handlers themselves so a guard
cannot be deleted while unit tests stay green.

<!-- ------------------------------------------------------------------ -->

## Documentation

| | |
| --- | --- |
| [13 — Brand the Case](docs/13-brand-the-case.md) | **Start here.** The campaign, the sponsorship model, operations, deployment, open TODOs |
| [01 — Overview](docs/01-overview.md) | What the product is and how it is sold |
| [02 — Architecture](docs/02-architecture.md) | Stack, rendering strategy, request flow |
| [03 — Data model](docs/03-data-model.md) | The sponsorship table and its access boundary |
| [04 — API reference](docs/04-api.md) | Every endpoint, with request and response shapes |
| [05 — The 3D case](docs/05-the-3d-case.md) | Geometry, the coordinate system, the rotation model |
| [06 — Payments](docs/06-payments.md) | FUTURE / DISABLED — the mode matrix and dormant provider |
| [07 — Design system](docs/07-design-system.md) | Tokens, type scale, component patterns |
| [08 — Deployment](docs/08-deployment.md) | Env vars, migrations, hosting, launch checklist |
| [09 — Sponsor kit](docs/09-sponsor-kit.md) | Artwork spec and the full placement table |
| [10 — Supabase boundary](docs/10-supabase-migration.md) | Runtime database boundary and rollout |
| [11 — Safepay integration plan](docs/11-safepay-integration-plan.md) | FUTURE / DISABLED — provider setup for a later phase |
| [12 — Founding Edition launch](docs/12-founding-edition-launch.md) | LEGACY — the previous inquiry-only model, superseded by 13 |

Documents 01–12 were written for the previous CODEC ONE model. Their geometry,
architecture, 3D and design material still applies; anything they say about
pricing, tiers, availability or the campaign story is superseded by 13.

<!-- ------------------------------------------------------------------ -->

## Before this goes public

Everything below is a decision only Haseeb can make. `npm run preflight` prints
the same list against whatever environment you run it in.

**A real contact inbox.** Set `NEXT_PUBLIC_CONTACT_EMAIL`. Until it is set the
site shows no email address and points people at the form — a working fallback,
but not what you want on a page you are cold-emailing from. It is deliberately
not a placeholder: a fake-looking address on a sponsorship page is worse than
none.

**A portrait, and profile links.** `NEXT_PUBLIC_FOUNDER_PHOTO` plus any of the
GitHub / LinkedIn / X / website URLs. Without them the founder card shows a
monogram and nothing a sponsor can check you against.

**The acceptance proof.** `NEXT_PUBLIC_ACCEPTANCE_PROOF_IMAGE`, if you choose
to publish a redacted screenshot. Do not point it at anything carrying OpenAI
branding you have not established you may reproduce. Unset, the card offers the
confirmation privately, which is honest and enough.

**The budget.** `NEXT_PUBLIC_BUDGET_*_USD`, once flights and accommodation are
actually quoted. Unset, the section lists the categories and says the split is
not published yet. Do not put a number there you have not costed.

**Legal identity and review.** `/privacy` and `/terms` name no registered
company, address, jurisdiction or registration number, because none has been
supplied to this repository. They are practical launch copy describing what the
application actually does — not a claim that legal review has occurred. The
refund and cancellation terms that bind are the ones written on the invoice.

## Licence

Unlicensed — private project scaffold.
