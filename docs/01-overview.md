# 01 — Overview

## The product

CODEC sells advertising space on a physical object that travels.

The object is **CODEC ONE**: a 76 × 110 × 40 cm moulded hardshell trunk with an
anodised aluminium split frame. Its outer surface is divided into **twenty
measured panels** across **five faces** — front shell, right spine, back shell,
left spine, and lid. Each panel is a real, printable area with a fixed size.

Companies bid for panels. Winning artwork is cut in 3M cast vinyl, laminated,
fitted by hand, and photographed. The panel stays on the shell for twelve
months while the case travels twelve cities, starting with DevDay in San
Francisco.

The site's job is to make that legible in about four seconds: rotate the case,
see what is taken and what is open, pick a panel, bid.

## Why a case

A billboard is seen by strangers. A case is seen by the people you are trying
to reach, at the moment they are most receptive — the security queue, the
overhead bin, the hotel lobby, the side of the stage, the baggage belt. It is
the one object that is in every room that matters and gets photographed in all
of them.

## Rules of the auction

**Opening bid.** Every panel has a published opening price, laddered by
visibility. The front crown and medallion carry the case in every photograph
and are priced accordingly; the wheel wells are the cheapest way onto the
shell. The sum of all twenty opening bids — the reserve floor — is
**$327,000**. The campaign goal is **$500,000**.

**First bidder pays the asking price.** With no live bid on a panel, the
minimum acceptable bid is exactly the opening bid.

**Increments.** Once a panel is live, each new bid must clear the current one by
5%, rounded up to the next $100, with a $100 floor. This stops a panel being
ratcheted a dollar at a time. The rule lives in `minimumNextBid()` in
`src/lib/money.ts` and is tested at its boundaries.

**Deposits.** Placing a bid takes a 20% deposit by card, minimum $50. The bid
holds no claim on the panel until that deposit settles. If you are outbid at any
point before the auction closes, the deposit is refunded in full and
automatically. The remaining 80% is charged only when the auction closes in your
favour and the printed proof is approved.

**Right of refusal.** Brands can be declined. The deposit is returned in full,
with no fee. Panels are not resold or sublicensed without approval.

**Loss and damage.** The case is insured for the term, and a reserve shell with
an identical panel map is held. If the primary case is destroyed, panels are
reprinted to the reserve at the operator's cost and the term continues. If the
tour is cancelled outright, unused months are refunded pro rata.

## The panel map at a glance

| Face | Panels | Opening range |
| --- | --- | --- |
| Front shell | 6 | $11,000 – $48,000 |
| Right spine | 4 | $8,000 – $16,000 |
| Back shell | 4 | $8,000 – $20,000 |
| Left spine | 4 | $8,000 – $16,000 |
| Lid | 2 | $12,000 – $22,000 |
| **Total** | **20** | **$327,000 floor** |

The full table, with codes and print sizes, is in
[09 — Sponsor kit](09-sponsor-kit.md).

## What is deliberately not here

**No user accounts.** Bidding takes a company name, a work email, and a card.
Adding auth would add a login wall in front of the one action the site exists
for. Bidders are identified by the email on the bid.

**No live websockets.** The board refetches after your own bid, and on page
load. At twenty panels and a bid every few hours, a socket would be
infrastructure with nothing to carry. `GET /api/board` is one query and returns
the entire auction; polling it is trivial to add if the pace ever justifies it.

**No admin UI.** Accepting a brand, declining one, or closing the auction are
rare, high-consequence actions done against the database directly
through the database operations workflow). A half-built admin panel is a liability; the bid
lifecycle in [03 — Data model](03-data-model.md) documents exactly which status
transitions are legal.

## Honesty constraints

The copy on this site is written as **attendance, not endorsement**. The case
goes to DevDay the way any attendee goes: with a ticket. Nothing on the site
says or implies that OpenAI, Anthropic, or any conference organiser sponsors,
endorses, or is affiliated with the campaign, because none of them do. This is
stated explicitly in the FAQ, under the tour section, and in the footer.

This is not decoration. Sponsors are buying proximity to a real audience, and
the value of that collapses the moment the offer looks like it is claiming an
affiliation it does not have. Keep the framing when editing
`src/data/site.ts`.

Similarly, any seeded sponsor from the retired local fixture was fictional and labelled as
such. See the warning at the end of the [README](../README.md).

---

Next: [02 — Architecture](02-architecture.md)
