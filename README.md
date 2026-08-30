# CODEC — Brand the case

A full-stack sponsorship auction for the twenty physical panels of a travelling
hardshell case. Companies rotate a real 3D model of the case, pick a panel on
any of its five faces, and bid for it. The winning bids are printed in cast
vinyl, fitted to the shell, and travel for twelve months.

The UI follows [brandmymac.com](https://brandmymac.com): white ground, Inter,
a centred single column, rounded cards, soft layered shadows, green for money
and blue for the primary action.

<!-- ------------------------------------------------------------------ -->

## Quick start

```bash
npm install
cp .env.example .env      # every value already has a working local default
npm run setup             # prisma generate + db push + seed
npm run dev               # http://localhost:3000
```

That is the whole setup. **No Stripe account is needed** — with the keys blank
the payment layer runs in `mock` mode and the full bid flow works end to end
locally. See [docs/06-payments.md](docs/06-payments.md) to switch it to live.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm test` | Run the Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Wipe and reseed the auction |
| `npm run db:studio` | Prisma Studio, to inspect bids |

<!-- ------------------------------------------------------------------ -->

## What is in here

```
src/
  app/
    page.tsx                  server component; reads the board, renders the page
    layout.tsx                Inter via next/font, metadata
    globals.css               the whole design system, one file, no framework
    success/page.tsx          Stripe Checkout return page
    api/board/route.ts        GET  the whole auction in one payload
    api/bids/route.ts         POST place a bid, open a deposit checkout
    api/webhooks/stripe/      POST the only path that can make a bid live
  components/
    AuctionProvider.tsx       shared board state + the modal host
    CaseHero.tsx              centred hero: stats, headline, funding, the case
    CaseStage.tsx             rotation model, drag, face switcher
    BidModal.tsx              the bid form
    InventorySection.tsx      the 20 panels as filterable cards
    TickerSection.tsx         recent-bid feed
    Sections.tsx              static server-rendered editorial sections
    three/
      CaseCanvas.tsx          the <Canvas>, dynamically imported (ssr: false)
      CaseScene.tsx           lights, environment, the spin rig, contact shadows
      CaseModel.tsx           the case, built from primitives — no .glb
      Panel.tsx               one brandable panel, with hover lift
      panelTexture.ts         draws each panel's chip to a canvas texture
  data/
    placements.ts             THE PANEL MAP — geometry, pricing, copy
    site.ts                   campaign copy, tour, FAQ, specs
  lib/
    auction.ts                joins static panels to live bids
    money.ts                  deposits, minimum increments, formatting
    stripe.ts                 live/mock payment backends behind one function
    validation.ts             Zod request schemas
    db.ts                     PrismaClient singleton
prisma/
  schema.prisma               one model: Bid
  seed.ts                     a plausible mid-campaign board (fictional brands)
docs/                         the documentation set — start at 01-overview.md
tests/                        Vitest: panel geometry and money rules
```

<!-- ------------------------------------------------------------------ -->

## The two ideas worth knowing

**1. The panel map is one file.** `src/data/placements.ts` holds the geometry,
the price, the print size, and the sales copy for all twenty panels. The 3D
scene, the inventory grid, the bid modal, the API validation, and the sponsor
kit all read from it. A panel physically cannot drift between what is rendered,
what is sold, and what is fabricated. `tests/panels.test.ts` proves no panel
overhangs its face and no two panels on a face overlap — that test caught a real
collision between panels 07 and 08 during the build.

**2. Panels are hardware, bids are data.** The twenty panels are fixed physical
areas on a real shell, so they are typed constants, not database rows. The
database holds exactly one model — `Bid` — and the "current state" of a panel is
derived: the highest bid whose deposit has settled. See
[docs/03-data-model.md](docs/03-data-model.md).

<!-- ------------------------------------------------------------------ -->

## Documentation

| | |
| --- | --- |
| [01 — Overview](docs/01-overview.md) | What the product is and the rules of the auction |
| [02 — Architecture](docs/02-architecture.md) | Stack, rendering strategy, request flow |
| [03 — Data model](docs/03-data-model.md) | Why there is only one table, and the bid lifecycle |
| [04 — API reference](docs/04-api.md) | Every endpoint, with request and response shapes |
| [05 — The 3D case](docs/05-the-3d-case.md) | Geometry, the coordinate system, the rotation model |
| [06 — Payments](docs/06-payments.md) | Deposits, mock vs live, webhooks, going live |
| [07 — Design system](docs/07-design-system.md) | Tokens, type scale, component patterns |
| [08 — Deployment](docs/08-deployment.md) | Postgres, env vars, hosting, checklist |
| [09 — Sponsor kit](docs/09-sponsor-kit.md) | Artwork spec and the full panel table |

<!-- ------------------------------------------------------------------ -->

## Before this goes public — read this

Two things in this repo are placeholders and **must** be dealt with first.

**The seeded sponsors are invented.** Every company on the board
(Northbeam Labs, Halcyon Compute, and the rest) is fictional. They exist so the
site has something to render in development. Run `npm run db:reset` against an
emptied `DEMO_BIDS` array, or replace them with brands that have actually
signed. Never ship an invented company as a real sponsor.

**There is no affiliation with anyone.** The copy throughout is written as
attendance, not endorsement: the case *goes to* these events the way any
attendee does. Nothing claims that OpenAI, Anthropic, or any conference
organiser sponsors, endorses, or is affiliated with this campaign, because none
of them do. That framing is deliberate and load-bearing — claiming an
affiliation you do not have is a trademark problem and the fastest way to lose a
sponsor's trust. If you edit the copy in `src/data/site.ts`, keep it that way.

## Licence

Unlicensed — private project scaffold.
