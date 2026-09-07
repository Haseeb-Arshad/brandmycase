# 01 — Overview

> **LEGACY — written for the previous CODEC ONE / Founding Edition model.**
> The campaign is now **Brand the Case**: a $3,000 travel sponsorship for one
> developer's trip to OpenAI DevDay, sold as three fixed-price tiers. The
> object, the panel map and the print sizes below are unchanged and still
> accurate. Everything about branding, pricing, tiers, availability and the
> campaign story is superseded by [13 — Brand the Case](13-brand-the-case.md).

## The product

CODEC ONE is an independent physical sponsorship experiment.

The object is a **76 × 110 × 40 cm** moulded hardshell trunk with an anodised
aluminium split frame. Its outer surface is divided into **twenty measured
placements** across **five faces** — front shell, right spine, back shell, left
spine, and lid. Each placement is a real, printable area with a fixed size.

The site is currently running the **Founding Edition**: a small number of
companies can become part of the first physical edition of the object.
Sponsors' artwork is cut in 3M cast vinyl, laminated, fitted by hand, and
photographed. The first planned appearance is around the creator's trip to San
Francisco in September 2026.

The site's job is to make that legible in about four seconds: rotate the case,
see the twenty placements, pick one, ask about it.

## How it is sold

**By conversation, not by checkout.** A company sends a non-binding placement
request. It is reviewed by hand. If there is a fit, placement, scope, artwork,
timing and commercial terms are agreed directly, and contracting and invoicing
happen outside this website.

**No payment is taken on the site.** No checkout, no card form, no deposit, no
auction. The payment infrastructure in this repository is dormant and
unreachable in the shipped configuration. See
[12 — Founding Edition launch](12-founding-edition-launch.md).

**No price is published.** Placements carry a tier — prime, feature, founding —
which communicates relative prominence without attaching a number to an
unproven first campaign. Terms are agreed per sponsorship.

**A request reserves nothing.** Availability is maintained by hand in
`src/data/placements.ts` and moves only when a real agreement exists. A
stranger filling in a form cannot make the site claim a placement is taken.

**Companies can be declined.** The edition is small and the object is personal.
No payment will have been taken at that point, because none is taken at all.

## Why a case

A billboard is seen by strangers. A case is seen by the people you are trying
to reach, at the moment they are most receptive — the security queue, the
overhead bin, the hotel lobby, the side of the stage, the baggage belt.

## What a Founding Sponsor receives

Everything on this list is something the project controls and can deliver:

- a physical placement — supplied artwork produced and fitted to the measured
  panel selected;
- a studio photography set of the finished branded object;
- inclusion in the CODEC ONE build log and project documentation;
- inclusion in project content where the case naturally appears.

What is **not** offered, and must never be implied: official event sponsorship
status, event rights, credentials, venue access, introductions, guaranteed
impressions, guaranteed photographs at any named event, or endorsement by
anybody.

## The placement map at a glance

| Face | Placements |
| --- | --- |
| Front shell | 6 |
| Right spine | 4 |
| Back shell | 4 |
| Left spine | 4 |
| Lid | 2 |
| **Total** | **20** |

The full table, with codes, print sizes and tiers, is in
[09 — Sponsor kit](09-sponsor-kit.md).

## What is deliberately not here

**No accounts, no login.** Sending a request takes a company name and a work
email. A login wall in front of the one action the site exists for would be
machinery with nothing behind it.

**No live board, no websockets, no polling.** Availability changes a handful of
times a year and is application configuration, so the homepage is statically
prerendered and needs no database to render. There is no public JSON endpoint
for the board because the browser has nothing to refetch.

**No admin UI.** Reading requests and moving their status are rare,
high-consequence actions done through an authorised Supabase session. A
half-built admin panel is a liability.

**No payment surface.** See above, and
[06 — Payments](06-payments.md), which documents the dormant infrastructure.

## Honesty constraints

These are not decoration. They are the reason a company can take this project
seriously, and they are load-bearing in both directions — legally, and in the
first thirty seconds a sponsor spends on the page.

**Independence.** The creator has received an invitation to attend OpenAI
DevDay 2026 in San Francisco. That is the entire relationship. CODEC ONE is not
sponsored by, endorsed by, affiliated with, or operated by OpenAI or any event
organiser. This is stated in the hero, in the trust strip, in the transparency
section, in the FAQ, in the terms, and in the footer.

**Nothing unbooked is described as booked.** San Francisco is the anchor
because there is an invitation behind it. Every other city on the route is
labelled proposed or under consideration, because none of them are booked.

**Nothing outside the project's control is promised.** Whether a physical
object can be carried into a venue is governed by that venue. So the offer is
narrowed to what the project can actually deliver: the placement and the media
package.

**No invented sponsors, bids, metrics or scarcity.** There are none in this
repository and none may be added. `tests/panels.test.ts` asserts every
placement ships as `OPEN` and that no monetary field can reach the browser.

Keep all of this when editing `src/data/site.ts`.

---

Next: [02 — Architecture](02-architecture.md)
