# 13 — Brand the Case

The operating manual for the site as it is shipped today. If you read one
document before touching this repository, read this one. It supersedes
[12 — Founding Edition launch](12-founding-edition-launch.md).

## What this campaign is

Haseeb Arshad, a developer from Pakistan, has been accepted to attend **OpenAI
DevDay** in San Francisco. The site raises **$3,000** toward the trip by selling
physical brand placements on the travel case going with him.

A visitor arriving from a cold email should understand, in about ten seconds:
who Haseeb is, that he was accepted to attend DevDay, why he needs sponsorship,
that the goal is $3,000, what a sponsor gets, that it costs $250–$1,000, and
where to click.

## The two rules

**1. Independent.** OpenAI does not sponsor, endorse, organise, approve,
partner with or otherwise participate in this campaign. Haseeb has been
accepted to attend as an attendee; that is the whole relationship. The site may
say so truthfully. It may not carry OpenAI logos, badges, mock acceptance
graphics or any visual that implies a relationship. The disclosure appears in
the hero, the proof card, the FAQ, the transparency section, the terms and the
footer.

**2. Nothing invented.** No testimonials, no sponsor logos, no attendance
numbers, no impressions, no press coverage, no travel dates, no guarantees. If
a fact has not been supplied, the interface renders honestly without it and
takes it later through configuration. This is enforced by design, not by
discipline alone: there is no code path that can produce a sponsor name without
a confirmed database row that has permission attached.

## The sponsorship model

Fixed prices. No bidding, no auction, no countdown, no "minimum next bid".

| Tier | Price | Placements | Panels |
| --- | --- | --- | --- |
| Anchor | $1,000 | 1 | 02 — The Medallion |
| Partner | $500 | 4 | 01, 11, 12, 19 — the crowns and the back field |
| Supporter | $250 | 15 | everything else |

One Anchor plus four Partners is exactly $3,000. `tests/sponsorship-config.test.ts`
holds that arithmetic, that every panel is in exactly one tier, and that no
tier's copy promises an outcome the project does not control.

All of it lives in **`src/data/sponsorship.ts`**. Change a price there and the
package cards, the panel grid, the 3D chips, the form, the share image and the
sponsor kit all change together. `src/data/placements.ts` stays what it always
was: the physical map of the object, with no commercial field in it.

## The funnel

```
visitor picks a tier (or a panel on the case)
   -> sponsorship form: company, contact, work email, website,
      optional social, optional message, independence acknowledgement
   -> POST /api/sponsorship-requests
   -> row written with status INTERESTED
   -> success screen: "I'll personally confirm availability and send the
      invoice. No payment has been taken."
   -> Haseeb replies, agrees terms, sends an invoice off-site
   -> payment clears -> row moved to CONFIRMED with amount_usd
   -> funding bar moves; panel shows as taken; logo appears IF permitted
```

No payment surface is involved anywhere in that path. Safepay and the bid
endpoints are dormant behind `CAMPAIGN_MODE=auction`.

### Status vocabulary

`INTERESTED → CONTACTED → INVOICED → CONFIRMED`, with `DECLINED` and
`CANCELLED` as exits. Only **CONFIRMED** rows reach the public site, and the
database refuses a CONFIRMED row that has no tier or no positive amount.

## Operating it

Everything below is done in the Supabase table editor. There is no admin UI,
and building one for a table you touch a few times a month would be the wrong
trade.

**A new inquiry arrives.** It appears as `status = 'INTERESTED'`. Reply from
your own inbox. Set `status = 'CONTACTED'` so you can see what you have
answered.

**You have sent an invoice.** Set `status = 'INVOICED'`.

**They have paid.** Set `status = 'CONFIRMED'` and `amount_usd` to the dollars
actually received. `confirmed_at` is stamped by a trigger. The funding bar and
the panel state update on the next page render.

**They agreed to be named.** Set `display_name`, optionally `display_logo_url`,
and set `display_permission = true`. Nothing about a sponsor renders until that
flag is true and a display name exists — a confirmed sponsorship on its own
shows the panel as "Reserved" and nothing more.

**They said no, or it fell through.** `DECLINED` or `CANCELLED`. Either one
takes the panel out of the sponsored set and back into availability.

**You want to hold a panel off the market yourself.** Set `hold: "HELD"` on
that placement in `src/data/placements.ts` and deploy. It is an editorial
decision, so it lives in the repository where it can be reviewed, not in a row
somebody could mistake for a sale.

## Database

One table, `public.sponsorship_requests`, extended by
`supabase/migrations/20260908000000_sponsorship_campaign.sql`.

Added: `tier`, `company_url`, `social_url`, `amount_usd`, `display_name`,
`display_logo_url`, `display_permission`, `confirmed_at`. `placement_id` became
nullable, because a tier can be sponsored with no panel preference. The old
`NEW / QUALIFIED / AGREED` statuses are migrated to the new vocabulary in the
same migration, and `budget_range` is left in place for historic rows but is no
longer written.

Three constraints do real work:

- `sponsorship_requests_confirmed_complete_check` — a CONFIRMED row must have a
  tier and a positive amount. The funding bar sums confirmed rows, so a
  half-filled one would be a sponsor on the page funding nothing.
- `sponsorship_requests_confirmed_placement_key` — a partial unique index on
  `placement_id where status = 'CONFIRMED'`. Two sponsors cannot hold the same
  panel, whatever the application does.
- RLS enabled with **no policy**, and no grants to `anon` or `authenticated`.
  The table is reachable only by the service role.

The public read path (`src/lib/funding.ts`) selects display columns only.
`contact_email`, `message` and `social_url` never leave the database on a page
render, and `tests/panels.test.ts` serialises the whole board to prove it.

## Environment

See `.env.example` for the annotated list. The essentials:

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | yes | Server-only. Never in a `NEXT_PUBLIC_*` value |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://case.haseeburshad.me` in production. Metadata, canonicals and the share image derive from it |
| `NEXT_PUBLIC_CONTACT_EMAIL` | strongly | Unset, the site shows no address and points at the form |
| `NEXT_PUBLIC_FOUNDER_PHOTO` | no | Unset, the founder card shows a monogram |
| `NEXT_PUBLIC_GITHUB_URL` and friends | no | Only configured links render |
| `NEXT_PUBLIC_EVENT_DATE` | no | Unset, no date is stated anywhere |
| `NEXT_PUBLIC_ACCEPTANCE_PROOF_IMAGE` | no | Unset, the proof card offers the confirmation on request |
| `NEXT_PUBLIC_BUDGET_*_USD` | no | Unset, the budget section shows categories with no figures |
| `NEXT_PUBLIC_ANALYTICS_SRC` + `_DOMAIN` | no | Both or neither. No dependency, no cookie |
| `CAMPAIGN_MODE` | no | Leave unset. `auction` re-opens the retired flow |

`npm run preflight` reports what a given environment would actually do, and
lists what has not been supplied yet.

## Deploying to case.haseeburshad.me

1. `npm run test && npm run typecheck && npm run build` — all three green.
2. Apply migrations: `npm run db:migrate` (or run both SQL files in the
   Supabase SQL editor, in filename order).
3. Verify in Supabase: the table has the new columns, RLS is on, and there is
   no policy on it.
4. Set the environment variables above on the host. `NEXT_PUBLIC_SITE_URL`
   must be `https://case.haseeburshad.me` — nothing hard-codes the domain, so
   getting this wrong silently breaks canonicals and the share card.
5. `NODE_ENV=production npm run preflight` — it must exit zero.
6. Point the DNS record for `case` at the host and let the certificate issue.
7. Load the page and check: the funding bar reads `$0 of $3,000`, all twenty
   placements are open, the sponsor section says founding positions are open,
   and no sponsor logo appears anywhere.
8. Send yourself a test inquiry. Confirm the row lands as `INTERESTED`, the
   success screen says no payment was taken, and nothing on the public page
   changed as a result.
9. Delete the test row.
10. Share the URL somewhere that renders Open Graph cards and check the image
    and title.

## Retained but dormant

Deliberately kept, gated behind `CAMPAIGN_MODE=auction`, and unreachable in the
shipped configuration:

- `src/lib/payments.ts` — the Safepay integration and the payment-mode matrix
- `src/lib/auction.ts`, `src/lib/refunds.ts`, `src/lib/money.ts`,
  `src/lib/payment-events.ts`, `src/lib/db.ts`
- `src/data/internal-index.ts` — the retired price ladder, server-only
- `POST /api/bids`, `GET /api/board`, `POST /api/webhooks/safepay`, `/success`
- The `bids` and `payment_webhook_events` tables and the `settle_bid` function

`tests/campaign.test.ts` and `tests/api-guards.test.ts` prove they stay shut.
If a future version re-enables payments, read [06](06-payments.md) and
[11](11-safepay-integration-plan.md) — and rewrite the public copy first. The
technical integration is the easy half.

## TODO — needs information only Haseeb can supply

- A real contact inbox (`NEXT_PUBLIC_CONTACT_EMAIL`).
- A portrait, and at least one profile link.
- The acceptance proof, if it is to be published — redacted, and without OpenAI
  branding unless permission to reproduce it has been established.
- Real budget figures, once flights and accommodation are quoted.
- The event date, if it should appear on the page.
- Invoice terms: what the invoice says about cancellation and refunds. `/terms`
  deliberately publishes no blanket refund policy, because that belongs in an
  agreement with a named counterparty rather than in website copy.
- A decision on legal identity: `/privacy` and `/terms` name no registered
  entity, because none has been supplied.
