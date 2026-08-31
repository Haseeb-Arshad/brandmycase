# Safepay integration plan

## Current boundary

The signed-in merchant account is the Safepay account named `DevDay`. Safepay
currently reports that live payments are disabled until merchant onboarding is
complete. Account activation, identity verification, bank verification, and
secret creation remain account-owner actions and must not be guessed or
automated from this repository.

The application currently has a legacy mock/live payment boundary. This plan
uses Safepay for live payments while retaining a deterministic mock mode for
local development.

## Product payment contract

- Currency shown and stored by the auction: whole USD.
- Deposit: `max(ceil(bid * 20%), $50)`.
- Deposit is captured through a Safepay hosted checkout.
- A bid is not live until a verified Safepay `payment.succeeded` webhook settles
  it in Supabase.
- Outbid and rejected deposits are refunded through the original payment
  method and remain visibly pending until a refund webhook confirms completion.
- The remaining 80% is a separate payment after the winning proof is approved.
  The first implementation uses a new hosted checkout link for this payment;
  it does not silently charge a saved card.

## Implementation phases

1. Add a provider-neutral payment contract and a Safepay adapter using the
   official Node library and hosted Express Checkout flow.
2. Add a Safepay webhook that verifies the raw
   payload HMAC before reading event data, records idempotent events, checks
   tracker/metadata/amount/currency, and then settles the bid.
3. Extend Supabase with provider-neutral payment and refund fields plus a
   webhook-event ledger. Keep all raw card details out of the database.
4. Add a server-side refund operation and a durable `REFUND_PENDING` state so
   outbid/rejected refunds can be retried and reconciled.
5. Update environment and deployment documentation with sandbox/live
   endpoints, webhook URL, key placement, and the account-owner checklist.
6. Verify mock behavior, signed webhook behavior, malformed/duplicate events,
   amount mismatches, build, and typecheck locally. Live proof requires the
   completed Safepay account, sandbox/live keys, a public HTTPS deployment, and
   a real test payment.

## Safepay dashboard checklist

- Complete every onboarding step: business, contact, address, business,
  transaction, owner, bank, and document details.
- Obtain the sandbox account separately for integration testing.
- Obtain the public API key, private API secret, and webhook HMAC secret from
  the correct environment.
- Add `https://<production-domain>/api/webhooks/safepay` as an HTTPS endpoint
  and subscribe to payment success, failure, and refund events.
- Confirm with Safepay that the account may accept international USD cards,
  settle to the intended Pakistani bank account, and issue refunds for the
  intended auction duration.

## Explicit non-goals

- No PayPal workaround, proxy merchant, fake jurisdiction, or account sharing.
- No raw PAN, CVV, or full card number storage.
- No claim that live payouts or international cards work until Safepay has
  approved the account and a real end-to-end test passes.
