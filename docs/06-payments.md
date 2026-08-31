# 06 — Payments

## Two modes, one provider boundary

`src/lib/payments.ts` exposes the auction payment contract. It uses Safepay’s
official Node library for live hosted checkout and a deterministic local mock
when no Safepay keys are present.

| Mode | Configuration | Behaviour |
| --- | --- | --- |
| `mock` | All Safepay keys blank | Mints a local `mock_dep_<bidId>` reference and settles the bid inline. No money leaves the machine. |
| `live` | Public key, private key, and webhook secret present | Creates a Safepay tracker and hosted checkout URL. The bid remains `PENDING` until a verified webhook arrives. |
| `misconfigured` | Only some payment keys present | Refuses checkout rather than silently pretending to take a real payment. |

Safepay’s hosted Express Checkout flow creates a tracker, creates a short-lived
passport token, generates a hosted checkout URL, and redirects the customer.
The return URL is informational; only the signed webhook can settle the bid.

## The deposit rules

Defined in `src/lib/money.ts` and tested at their boundaries in
`tests/money.test.ts`:

```text
DEPOSIT_PERCENT      = 20      // env: DEPOSIT_PERCENT
DEPOSIT_MINIMUM_USD  = 50      // env: DEPOSIT_MINIMUM_USD

depositFor(amountUsd) = max(ceil(amountUsd * 20 / 100), 50)
```

Amounts are whole USD in the auction. `toPaymentAmount()` converts USD to the
processor’s smallest unit exactly once at the Safepay boundary.

## Environment

```dotenv
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
SAFEPAY_PUBLIC_KEY="sec_..."
SAFEPAY_SECRET_KEY="..."
SAFEPAY_WEBHOOK_SECRET="..."
SAFEPAY_ENVIRONMENT="sandbox" # sandbox | production
SAFEPAY_INTENT="CYBERSOURCE"  # CYBERSOURCE | MPGS
```

The public API key identifies the merchant account. The private API secret is
used only on the server to create trackers, passport tokens, and refunds. The
webhook secret is used only on the server to verify `X-SFPY-SIGNATURE`. None of
these values belongs in a `NEXT_PUBLIC_*` variable, browser code, Git, or chat.

Sandbox and production credentials are different. Use the sandbox dashboard
and test cards before applying the production keys.

## Webhook

Register this HTTPS endpoint in Safepay:

```text
https://yourdomain.com/api/webhooks/safepay
```

Subscribe to at least:

- `payment.succeeded`
- `payment.failed`
- `payment.refunded`
- `authorization.succeeded`
- `authorization.reversed`
- `void.succeeded`

The route reads the raw request body and calculates HMAC-SHA512 with
`SAFEPAY_WEBHOOK_SECRET`. It compares the result with the
`X-SFPY-SIGNATURE` header before parsing or trusting the payload.

The provider event token is stored in `payment_webhook_events` with a unique
`(provider, event_id)` key. Duplicate deliveries are acknowledged without
repeating settlement or refund work.

For `payment.succeeded`, the server verifies:

1. the bid id in `metadata.bid_id` or `metadata.order_id`;
2. the Safepay tracker matches the bid’s stored payment reference;
3. the currency is USD; and
4. the smallest-unit amount equals the server-calculated 20% deposit.

Only then does the atomic `settle_bid` RPC mark the bid `DEPOSIT_PAID` and mark
any lower live bid on that panel `OUTBID`.

## Refunds

The settlement RPC returns the demoted bids. The server requests a full refund
for each captured Safepay deposit and records the lifecycle on the bid:

```text
NOT_REQUESTED → PENDING → PROCESSING → SUCCEEDED
                                      └→ PARTIAL
                                      └→ FAILED
```

Safepay’s `payment.refunded` webhook is the final confirmation. A failed
request stays recorded with an error and is retried in a bounded batch whenever
the next successful payment webhook is processed. The Safepay dashboard remains
the manual fallback for operational refunds.

The current campaign rules use a captured refundable deposit rather than a
long-lived authorization hold. Do not promise a refund window longer than
Safepay’s documented card-refund limit without written provider confirmation.

## Remaining balance

The final 80% is intentionally not charged from the public bid endpoint. It is
collected after the auction closes and the sponsor approves the artwork proof.
For the first release, send a separate Safepay hosted payment link or invoice
to the winning sponsor. A future tokenized/off-session charge must require
explicit customer consent, provider approval, and an authenticated operator
workflow; it must not be an unauthenticated public URL action.

## Security posture

- The webhook is the only live path that promotes a bid.
- The server recalculates the minimum bid and deposit; client amounts are never
  trusted.
- Raw card numbers and CVV are never handled or stored by this application.
- Payment and webhook event references are stored for reconciliation, not card
  credentials.
- A partial Safepay configuration fails closed instead of entering mock mode.

## Local verification

Run the deterministic suite:

```bash
npm test
npm run typecheck
npm run build
```

For a live-like integration test, use a Safepay sandbox account, configure the
sandbox keys, expose the app through a public HTTPS URL, register the sandbox
webhook endpoint, place a test bid, and verify:

```text
PENDING → DEPOSIT_PAID
old leader → OUTBID → refund PROCESSING → SUCCEEDED
```

Local build success does not prove live account approval, international card
acceptance, Pakistani bank settlement, or provider payout timing.
