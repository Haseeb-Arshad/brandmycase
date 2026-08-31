# 02 — Architecture

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15, App Router | Server components mean the board is rendered with real bids in the first paint |
| Language | TypeScript, `strict` | The panel map is the contract; types enforce it |
| 3D | three.js + React Three Fiber 9 + drei 10 | R3F 9 pairs with React 19 |
| Database | Supabase Postgres via `@supabase/server` | Server-only client; live bids stay in the hosted database |
| Payments | Safepay Hosted Checkout, with a mock backend | Pakistan-compatible provider boundary with signed webhooks and refunds |
| Validation | Zod | One schema per endpoint, parsed before anything touches the database |
| Styling | One hand-written CSS file | The design system is ~40 tokens and ~60 components; a utility framework would be more machinery than the problem needs |
| Tests | Vitest | Geometry and money rules |

## Rendering strategy

The page is mostly server-rendered. Only three components ship JavaScript for
auction state, and one more for the 3D.

```
app/page.tsx                      SERVER  reads the board via getAuctionBoard()
└── AuctionProvider               CLIENT  holds board state, hosts the modal
    ├── Nav                       SERVER  (passed through as children)
    ├── CaseHero                  CLIENT  needs live stats + the countdown
    │   └── CaseStage             CLIENT  rotation, drag, face switcher
    │       └── CaseCanvas        CLIENT  dynamic(ssr:false) — three.js
    ├── StatsStrip / Story /      SERVER  static editorial, zero JS
    │   TourSection / HowItWorks /
    │   FaqSection / SiteFooter
    ├── InventorySection          CLIENT  filtering + click-to-bid
    └── TickerSection             CLIENT  reads recent bids
```

Server components can be children of a client provider, so the editorial
sections stay on the server even though they sit inside `AuctionProvider` in
the tree. That is why the initial JS bundle is ~103 kB and three.js is not in
it at all.

**three.js is dynamically imported with `ssr: false`.** It touches `window` at
module scope and cannot be evaluated on the server. `CaseCanvas` exists purely
as the split point; `CaseStage` renders a placeholder until it loads.

## Request flow: placing a bid

```
Browser                    POST /api/bids
                             │
                             ├─ 1. bidSchema.safeParse(body)          422 on failure
                             │
                             ├─ 2. getPanelState(placementId)         re-read live state
                             │       (never trust a price from the client)
                             │
                             ├─ 3. amount < minimumBidUsd ?           409 with the new floor
                             │
                             ├─ 4. Supabase bids.insert({ PENDING })   holds no claim yet
                             │
                             ├─ 5. createDepositSession(...)
                             │       ├── live: Safepay Hosted Checkout tracker
                             │       └── mock: local reference
                             │
                             │      on mock failure: delete the bid, 502
                             │      live failure: retain it for webhook reconciliation
                             │
                             └─ 6. mock  → settleDeposit() inline
                                   live  → store tracker, wait for the Safepay webhook

                     201 { bidId, depositUsd, mode, redirectUrl }
```

The bid becomes live only in `settleDeposit()`, which runs in a transaction:
the new bid is marked `DEPOSIT_PAID` and every lower live bid on that panel is
marked `OUTBID` in the same commit. Without the transaction the board could
briefly show two live leaders on one panel.

In live mode the only caller of `settleDeposit()` is the Safepay webhook, after
signature verification. Nothing in a URL can promote a bid.

## Request flow: reading the board

`getAuctionBoard()` in `src/lib/auction.ts` is the single place that turns
"twenty static panels + a pile of bid rows" into what the site shows. It runs
two queries and folds the result in memory:

1. every live bid, ordered by amount descending
2. the eight most recent live bids, for the ticker

then maps `PLACEMENTS` over the grouped bids. Because it iterates `PLACEMENTS`,
panel order is stable and identical to the order the 3D scene indexes against.

Both `app/page.tsx` (server render) and `GET /api/board` (client refetch) call
this same function, so the rendered board and the API can never disagree.

## Why panels are not in the database

The twenty panels are physical areas on a real shell. They do not change
because a user did something; they change because someone redesigns the case,
which is a code change with a migration-free deploy. Modelling them as rows
would mean:

- the 3D scene waiting on a query to know where to draw
- geometry drifting from what was quoted, silently
- no type safety on `placementId` anywhere

As typed constants they are validated at build time, checked by
`tests/panels.test.ts`, and `z.enum(placementIds)` rejects an unknown panel at
the API boundary for free.

## Error handling posture

- **422** — the body failed validation. Response carries `fields` keyed by
  input name, which the modal renders inline.
- **409** — the bid was valid but is now below the panel's minimum. Response
  carries `minimumBidUsd`; the modal updates the figure in place rather than
  silently accepting a losing bid.
- **502** — the payment provider could not open a session. The pending bid is
  deleted first.
- **400 / 503** on the webhook — bad signature, or Safepay not configured.

A failed board refresh is deliberately swallowed: the board on screen is still
valid, just seconds stale, and an error toast would be noise.

---

Next: [03 — Data model](03-data-model.md)
