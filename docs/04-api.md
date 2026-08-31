# 04 — API reference

Three endpoints. All JSON. No authentication — bidding is deliberately open, and
the only state-changing endpoint is gated by a card payment.

---

## `GET /api/board`

The entire auction in one payload: every panel with its live bid, the funding
stats, and the recent-bid ticker.

Called on page load by the server component, and refetched by the client after a
successful bid so the 3D case, the inventory grid and the funding bar all update
from one source.

`Cache-Control: no-store`.

### Response `200`

```jsonc
{
  "panels": [
    {
      // --- from the static panel map ---
      "id": "01",
      "code": "FR-CROWN",
      "name": "The Crown",
      "face": "front",                  // front | right | back | left | top
      "description": "Full-width crown band above the medallion…",
      "openingBidUsd": 48000,
      "u": 0, "v": 0.4, "w": 0.62, "h": 0.13,   // face-local geometry, metres
      "sizeLabel": "62 x 13 cm",

      // --- derived from live bids ---
      "currentBidUsd": 64500,           // null when the panel is open
      "sponsor": "Northbeam Labs",      // null when the panel is open
      "sponsorUrl": "https://…",        // null if not supplied
      "bidCount": 1,                    // live bids only
      "minimumBidUsd": 67800,           // what POST /api/bids will accept next
      "minimumDepositUsd": 13560,
      "taken": true
    }
    // … 20 total, always in panel-map order
  ],

  "stats": {
    "raisedUsd": 297500,
    "goalUsd": 500000,
    "reserveFloorUsd": 327000,          // sum of all opening bids
    "percentOfGoal": 59.5,
    "panelsTaken": 13,
    "panelsTotal": 20,
    "bidsPlaced": 13
  },

  "recent": [
    {
      "company": "Sundial Interfaces",
      "placementId": "19",
      "placementName": "Lid Crown",
      "amountUsd": 28000,
      "createdAt": "2026-08-30T14:02:11.000Z"
    }
    // … up to 8, newest first
  ]
}
```

---

## `POST /api/bids`

Place a bid on a panel and open a deposit checkout.

### Request

```jsonc
{
  "placementId": "07",                   // required, must be a known panel id
  "company": "Northbeam Labs",           // required, 2–80 chars
  "contactEmail": "partners@example.com",// required, valid email, lowercased
  "amountUsd": 11500,                    // required, positive integer, max 5,000,000
  "websiteUrl": "https://example.com",   // optional, must be a full URL
  "message": "Anything we should know"   // optional, max 500 chars
}
```

### Response `201`

```jsonc
{
  "bidId": "cmtfq3nxu0000u7vo4mwu4c2d",
  "placementId": "07",
  "amountUsd": 11500,
  "depositUsd": 2300,
  "mode": "mock",                        // "mock" | "live"
  "redirectUrl": "http://localhost:3000/success?bid=…"
}
```

In **live** mode `redirectUrl` is a Safepay Hosted Checkout URL and the client must
navigate to it; the bid is still `PENDING` and becomes live only when the
webhook fires.

In **mock** mode the deposit has already settled server-side by the time this
returns, so the client can simply refetch the board and show success.

### Response `422` — validation failed

```jsonc
{
  "error": "Check the highlighted fields.",
  "fields": {
    "placementId": "Unknown panel.",
    "company": "Company name is required.",
    "contactEmail": "Enter a valid email address."
  }
}
```

`fields` is keyed by input name so the modal can render each message inline.

### Response `409` — outbid between opening the form and submitting

```jsonc
{
  "error": "Panel 01 is now at $67,800. Raise your bid to take it.",
  "fields": { "amountUsd": "Minimum is $67,800." },
  "minimumBidUsd": 67800
}
```

The server re-reads the panel's live state on every request and never trusts a
price sent by the client. The modal updates the displayed minimum from
`minimumBidUsd` rather than silently accepting a bid that can no longer win.

### Response `502` — payment provider unavailable

```jsonc
{ "error": "Could not open the payment step. Please try again." }
```

In mock or misconfigured mode the pending bid row is deleted before this is
returned. In live mode it is retained if a Safepay tracker may already exist,
so a later webhook can reconcile it by bid metadata; `PENDING` never holds a
panel on the public board.

### Other codes

| Code | Meaning |
| --- | --- |
| `400` | Body was not valid JSON |
| `404` | `placementId` is well-formed but unknown |

---

## `POST /api/webhooks/safepay`

The only path that can promote a bid to live in production. Runs on the Node
runtime and reads the raw body — signature verification needs the exact bytes
Safepay sent, so this route must not pass through any body parser.

### Headers

`X-SFPY-SIGNATURE` is required and verified with HMAC-SHA512 against
`SAFEPAY_WEBHOOK_SECRET` before a single field of the payload is read. An
unsigned request must never be able to hand somebody a panel.

### Events handled

| Event | Effect |
| --- | --- |
| `payment.succeeded` | Validates tracker, metadata, USD amount, and currency; marks the bid `DEPOSIT_PAID`, demotes lower live bids, and starts their refunds |
| `payment.failed` | Records the failed attempt and leaves the pending bid available for checkout retry |
| `payment.refunded` | Confirms the refund amount and marks the refund state `SUCCEEDED` or `PARTIAL` |
| `authorization.succeeded`, `authorization.reversed`, `void.succeeded` | Records and acknowledges the event |

Everything else is acknowledged and ignored.

The bid id travels in `metadata.bid_id` and `metadata.order_id`, and the
Safepay tracker is stored on the bid. The handler can settle exactly one bid and
never trusts a redirect. `settleDeposit()` and the webhook ledger are
idempotent, which matters because Safepay retries events.

### Responses

| Code | Meaning |
| --- | --- |
| `200` | `{ "received": true }` |
| `400` | Missing or invalid signature |
| `500` | Supabase ledger or webhook business logic failed; Safepay should retry |
| `503` | `SAFEPAY_WEBHOOK_SECRET` is not configured |

### Local testing

```bash
# Use a public HTTPS tunnel for the local app, then add this URL in the
# Safepay sandbox dashboard under Developers > Endpoints.
https://your-public-domain.example/api/webhooks/safepay
```

---

## Trying it from the shell

```bash
# read the board
curl -s localhost:3000/api/board | jq '.stats'

# a bid below the minimum → 409
curl -s -X POST localhost:3000/api/bids \
  -H 'Content-Type: application/json' \
  -d '{"placementId":"01","company":"Test Co","contactEmail":"a@b.com","amountUsd":50000}'

# a valid bid on an open panel → 201
curl -s -X POST localhost:3000/api/bids \
  -H 'Content-Type: application/json' \
  -d '{"placementId":"10","company":"Test Co","contactEmail":"a@b.com","amountUsd":8000}'
```

---

Next: [05 — The 3D case](05-the-3d-case.md)
