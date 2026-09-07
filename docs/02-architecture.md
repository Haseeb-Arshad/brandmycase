# 02 — Architecture

> **Partly superseded.** The stack, the rendering strategy and the module
> boundaries below still hold. Two things have changed: the homepage is now
> rendered per request (it reads confirmed sponsorships from Supabase) rather
> than prerendered from static configuration, and the offer lives in
> `src/data/sponsorship.ts` alongside the panel map. See
> [13 — Brand the Case](13-brand-the-case.md).

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15, App Router | The homepage is a server component with no data dependency, so it prerenders to static output |
| Language | TypeScript, `strict` | The placement map is the contract; types enforce it |
| 3D | three.js + React Three Fiber 9 + drei 10 | R3F 9 pairs with React 19 |
| Database | Supabase Postgres via `@supabase/server` | Server-only client. One table: sponsorship requests |
| Payments | *none* | The Founding Edition takes no payment. Safepay exists as dormant infrastructure — see [06](06-payments.md) |
| Validation | Zod | One schema per endpoint, parsed before anything touches the database |
| Styling | One hand-written CSS file | The design system is ~40 tokens and ~60 components; a utility framework would be more machinery than the problem needs |
| Tests | Vitest | Geometry, request validation, and the payment-disabling matrix |

## Rendering strategy

The page is mostly server-rendered. Three components ship JavaScript, and only
because they need pointer interaction.

```
app/page.tsx                      SERVER  getPlacementBoard() — static, no DB
└── CampaignProvider              CLIENT  holds the board, hosts the modal
    ├── Nav                       SERVER  (passed through as children)
    ├── CaseHero                  CLIENT  reads board stats, wraps the stage
    │   └── CaseStage             CLIENT  rotation, drag, face switcher
    │       └── CaseCanvas        CLIENT  dynamic(ssr:false) — three.js
    ├── TrustStrip / Story /      SERVER  static editorial, zero JS
    │   HowItWorks / FoundingSponsors /
    │   FoundingEdition / PlannedRoute /
    │   WhatItFunds / ArtworkSection /
    │   Transparency / FaqSection / SiteFooter
    └── InventorySection          CLIENT  filtering + click-to-request
```

Server components can be children of a client provider, so the editorial
sections stay on the server even though they sit inside `CampaignProvider` in
the tree. That is why the initial JS bundle is ~103 kB and three.js is not in
it at all.

**three.js is dynamically imported with `ssr: false`.** It touches `window` at
module scope and cannot be evaluated on the server. `CaseCanvas` exists purely
as the split point; `CaseStage` renders a placeholder until it loads.

## The board is static

`getPlacementBoard()` in `src/lib/placement-board.ts` derives the whole board
synchronously from `src/data/placements.ts`. There is no query, no refetch, no
polling and no JSON endpoint for it.

That is a safety property as much as a performance one. There is no code path
on the public site that can return a sponsor, a price or an amount, because
there is no code path that returns anything but static configuration. The
homepage renders correctly before Supabase is even provisioned.

`PlacementState` — the shape that reaches the browser — carries only id, code,
name, face, description, size label, tier, status and geometry. No monetary
field exists on it, and `tests/panels.test.ts` serialises the board to prove
one cannot be added by accident.

Moving availability into Supabase later means making one function async.
Nothing above it changes.

## Request flow: a placement request

```
Browser              POST /api/sponsorship-requests
                       │
                       ├─ 1. rateLimit(clientKey)                429 + Retry-After
                       │      in-process speed bump, not a security boundary
                       │
                       ├─ 2. sponsorshipRequestSchema.safeParse  422 with `fields`
                       │      · placement id must be in the panel map
                       │      · budget must be one of six bands
                       │      · acknowledgement checkbox must be true
                       │      · honeypot must be empty
                       │      · every string length-capped
                       │
                       ├─ 3. getPlacementState(id)               404 unknown
                       │      re-checked server-side; not requestable → 409
                       │
                       ├─ 4. per-email window (Supabase)         429 over the cap
                       │      same email + same placement → treated as received
                       │
                       └─ 5. insert one row, status NEW

               201 { received: true, paymentTaken: false, reserved: false, id }
```

Nothing in this flow charges anything, and nothing in it changes what the
public board says is available. Those two properties are the product.

Zod strips unknown keys, so a client cannot smuggle an amount into the row even
by sending one — `tests/sponsorship.test.ts` asserts it.

## The disabled payment surface

`CAMPAIGN_MODE` (default `interest`) is read in one place,
`src/lib/campaign.ts`, and everything else derives from it:

- `/api/bids` answers **404** before reading the body or touching Supabase
- `/api/board` answers **404**
- `/success` calls `notFound()`
- `/api/webhooks/safepay` answers **503** and settles nothing
- `resolvePaymentMode()` returns `disabled` regardless of credentials

`resolvePaymentMode()` is a pure function so the matrix can be swept
exhaustively in `tests/campaign.test.ts` rather than asserted in a comment, and
`tests/api-guards.test.ts` invokes the route handlers themselves so a guard
cannot be removed while unit tests stay green. The full matrix is in
[12 — Founding Edition launch](12-founding-edition-launch.md).

## Why placements are not in the database

The twenty placements are physical areas on a real shell. They do not change
because a user did something; they change because someone redesigns the case,
which is a code change. Modelling them as rows would mean:

- the 3D scene waiting on a query to know where to draw
- geometry drifting from what was quoted, silently
- no type safety on `placementId` anywhere

As typed constants they are validated at build time, checked by
`tests/panels.test.ts`, and `z.enum(placementIds)` rejects an unknown placement
at the API boundary for free.

## Error handling posture

| Status | When |
| --- | --- |
| **422** | Body failed validation. Carries `fields` keyed by input name, which the modal renders inline and wires to each input with `aria-describedby` |
| **429** | Client throttle, or too many requests from one email address. Carries `Retry-After` |
| **409** | The placement exists but is no longer open to requests |
| **404** | Unknown placement — or any retired auction endpoint, in the shipped configuration |
| **503** | Supabase could not record the request |

A repeat request for the same placement from the same address inside the window
is answered as **received**, not as an error: it is almost always a double
submit, and an error screen there would read as a failure when the request is
already safely stored.

---

Next: [03 — Data model](03-data-model.md)
