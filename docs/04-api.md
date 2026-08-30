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

In **live** mode `redirectUrl` is a Stripe Checkout URL and the client must
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

The pending bid row is deleted before this is returned, so a failed checkout
never leaves an orphan holding up a panel's minimum.

### Other codes

| Code | Meaning |
| --- | --- |
| `400` | Body was not valid JSON |
| `404` | `placementId` is well-formed but unknown |

---

## `POST /api/webhooks/stripe`

The only path that can promote a bid to live in production. Runs on the Node
runtime and reads the raw body — signature verification needs the exact bytes
Stripe sent, so this route must not pass through any body parser.

### Headers

`stripe-signature` is required and verified against `STRIPE_WEBHOOK_SECRET`
before a single field of the payload is read. An unsigned request must never be
able to hand somebody a panel.

### Events handled

| Event | Effect |
| --- | --- |
| `checkout.session.completed` | `settleDeposit(bidId, sessionId)` — marks the bid `DEPOSIT_PAID` and every lower live bid on that panel `OUTBID`, in one transaction |
| `checkout.session.expired` | Deletes the bid if it is still `PENDING`, so an abandoned checkout does not hold up the panel's minimum |
| `charge.refunded` | Marks the bid `REFUNDED` |

Everything else is acknowledged and ignored.

The bid id travels in `client_reference_id` **and** in `metadata.bidId`, so the
handler can settle exactly one bid without trusting anything in a URL.
`settleDeposit()` is idempotent, which matters because Stripe delivers at least
once.

### Responses

| Code | Meaning |
| --- | --- |
| `200` | `{ "received": true }` |
| `400` | Missing or invalid signature |
| `500` | `STRIPE_WEBHOOK_SECRET` not configured |
| `503` | Stripe not configured — the app is in mock mode |

### Local testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
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
