# 04 — API reference

> **LEGACY request shape.** `POST /api/sponsorship-requests` is still the one
> live endpoint, but its body changed with the sponsorship model: it now takes
> `tier` (required), an optional `placementId`, `contactName` and `companyUrl`
> (both required) and `socialUrl`, and no longer takes `budgetRange`. The
> authority is `src/lib/validation.ts`; the flow is in
> [13 — Brand the Case](13-brand-the-case.md). The dormant endpoints below are
> unchanged.

One live endpoint. Three dormant ones that answer 404 or 503 in the shipped
configuration.

All JSON. No authentication — sending a placement request is deliberately open,
and the endpoint writes an inquiry, not an order.

---

## `POST /api/sponsorship-requests`

Record a non-binding placement request. This is the only state-changing
endpoint on the Founding Edition site.

It takes no payment, collects no payment credential, and does not change what
the public board says is available.

### Request

```jsonc
{
  "placementId": "02",                          // required, must be a known placement
  "company": "Northbeam Labs",                  // required, 2–120 chars
  "contactEmail": "partnerships@northbeam.com", // required, valid email, ≤200
  "contactName": "Ada Okafor",                  // optional, ≤120
  "websiteUrl": "https://northbeam.com",        // optional, full URL, ≤200
  "budgetRange": "2_5K_5K",                     // optional, one of six bands
  "message": "We'd like the medallion…",        // optional, ≤2000
  "acknowledged": true,                         // required, must be exactly true
  "companyFax": ""                              // honeypot, must be empty
}
```

**Budget bands** — `UNDECIDED`, `UNDER_1K`, `1K_2_5K`, `2_5K_5K`, `5K_10K`,
`OVER_10K`. These are a qualification signal, not a price list, and are never
tied to a particular placement.

**`acknowledged`** is the "I understand this is a sponsorship inquiry and does
not reserve or purchase the placement" checkbox. `z.literal(true)` — `"true"`,
`1` and `false` are all rejected.

**`companyFax`** is a honeypot, hidden off-screen in the form. Any value is a
hard reject; an empty string is stripped and never stored.

Unknown keys are stripped by Zod, so a client cannot smuggle an amount into the
row even by sending one.

### Response `201`

```jsonc
{
  "received": true,
  "paymentTaken": false,
  "reserved": false,
  "id": "3f6b0c2a-…"
}
```

`paymentTaken` and `reserved` are constants. They are in the payload so that
any future consumer of this endpoint — a form, a script, a log line — carries
the same statement the confirmation screen makes.

A repeat request for the same placement from the same email inside the 24-hour
window returns this same body with the existing row's id.

### Errors

| Status | Body | When |
| --- | --- | --- |
| `400` | `{ error }` | Body was not JSON |
| `404` | `{ error: "Unknown placement." }` | `placementId` is not in the panel map |
| `409` | `{ error }` | The placement is no longer open to requests |
| `422` | `{ error, fields }` | Validation failed. `fields` is keyed by input name and rendered inline by the modal |
| `429` | `{ error }` + `Retry-After` | Client throttle (8 / 10 min) or per-email cap (5 / 24 h) |
| `503` | `{ error }` | Supabase could not record the request |

### There is no GET

Requests carry other companies' contact details and budget signals. The only
way to read them is an authorised Supabase session. This is not an oversight;
do not add a read endpoint without an authentication story.

---

## FUTURE / DISABLED IN THE FOUNDING EDITION

The three endpoints below belong to the retired bid-and-deposit auction. In the
shipped configuration (`CAMPAIGN_MODE=interest`, the default) they refuse
before touching Supabase or any payment code. `tests/api-guards.test.ts`
invokes each handler directly to prove it.

### `POST /api/bids`

```jsonc
// Shipped configuration, any body:
404 { "error": "Not found." }
```

Guarded twice: first on `auctionEndpointsEnabled()`, then on
`paymentsEnabled()`. With `CAMPAIGN_MODE=auction` but no usable payment
backend it answers `503` rather than recording a bid that could never settle.

Under an explicit auction with live credentials it validates the body, re-reads
the panel's live state, rejects anything below the current server-side minimum
with `409`, writes a `PENDING` bid, and opens a deposit checkout. The bid holds
no claim on the panel until a verified webhook settles it.

### `GET /api/board`

```jsonc
// Shipped configuration:
404 { "error": "Not found." }
```

Returned the full auction payload — every panel with its live bid, the funding
stats, and the recent-bid ticker. No bid amount, sponsor name or funding figure
is readable from the live site.

The Founding Edition board is static and server-rendered from
`src/lib/placement-board.ts`. It has no JSON endpoint because the browser has
nothing to refetch.

### `POST /api/webhooks/safepay`

```jsonc
// Shipped configuration:
503 { "error": "Safepay webhooks are not enabled for this deployment." }
```

`webhookIsConfigured()` now requires the payment mode to be `live`, which in
turn requires `CAMPAIGN_MODE=auction`. A webhook secret left in an environment
cannot reopen the settlement path on its own.

Under an explicit auction it verifies the raw body with HMAC-SHA512 against
`X-SFPY-SIGNATURE` before parsing, records the event token for idempotency, and
only then settles. See [06 — Payments](06-payments.md).

### `GET /success`

Calls `notFound()` unless `CAMPAIGN_MODE=auction`. It was the Safepay checkout
return page; a page that says "deposit received" must not be reachable on a
site that takes no payment.

---

Next: [05 — The 3D case](05-the-3d-case.md)
