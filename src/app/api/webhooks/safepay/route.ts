import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { settleDeposit } from "@/lib/auction";
import {
  verifySafepayWebhook,
  webhookIsConfigured,
  webhookMetadataValue,
  webhookNumber,
  webhookString,
} from "@/lib/payments";
import { finishPaymentWebhook, recordPaymentWebhook } from "@/lib/payment-events";
import {
  markRefundSucceeded,
  refundOutbidBids,
  refundPendingDeposits,
} from "@/lib/refunds";
import { toPaymentAmount } from "@/lib/money";

/**
 * POST /api/webhooks/safepay
 *
 * Safepay is the only authority that can make a production bid live. The raw
 * body is verified with HMAC-SHA512 before JSON fields are trusted. Event
 * tokens are persisted so retries are harmless.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BidPaymentRow {
  id: string;
  status: string;
  payment_provider: string;
  payment_ref: string | null;
  payment_currency: string;
  payment_amount_minor: number | null;
  deposit_usd: number;
}

const PAYMENT_COLUMNS =
  "id, status, payment_provider, payment_ref, payment_currency, payment_amount_minor, deposit_usd";

async function findBid(
  bidId: string | null,
  tracker: string | null,
): Promise<BidPaymentRow | null> {
  const supabase = getSupabaseAdmin();
  if (bidId) {
    const byId = await supabase
      .from("bids")
      .select(PAYMENT_COLUMNS)
      .eq("id", bidId)
      .maybeSingle();
    if (byId.error) throw new Error(`Supabase webhook bid lookup failed: ${byId.error.message}`);
    if (byId.data) return byId.data as BidPaymentRow;
  }

  if (!tracker) return null;
  const byTracker = await supabase
    .from("bids")
    .select(PAYMENT_COLUMNS)
    .eq("payment_ref", tracker)
    .maybeSingle();
  if (byTracker.error) {
    throw new Error(`Supabase webhook tracker lookup failed: ${byTracker.error.message}`);
  }
  return (byTracker.data as BidPaymentRow | null) ?? null;
}

function requirePaymentData(eventType: string, data: Record<string, unknown> | undefined) {
  if (!data) throw new Error(`${eventType} webhook has no data.`);
  return data;
}

async function handlePaymentSucceeded(data: Record<string, unknown>): Promise<void> {
  const tracker = webhookString(data.tracker);
  const bidId = webhookMetadataValue(data.metadata, "bid_id") ??
    webhookMetadataValue(data.metadata, "order_id");
  if (!tracker || !bidId) {
    throw new Error("Safepay success webhook is missing tracker or bid metadata.");
  }

  const bid = await findBid(bidId, tracker);
  if (!bid) throw new Error(`Safepay success webhook references unknown bid ${bidId}.`);
  if (bid.payment_provider !== "safepay") {
    throw new Error(`Bid ${bid.id} is not a Safepay bid.`);
  }
  if (bid.payment_ref && bid.payment_ref !== tracker) {
    throw new Error(`Safepay tracker does not match bid ${bid.id}.`);
  }

  const amount = webhookNumber(data.amount);
  const currency = webhookString(data.currency)?.toUpperCase();
  const expectedAmount = bid.payment_amount_minor ?? toPaymentAmount(bid.deposit_usd);
  if (amount === null || amount !== expectedAmount) {
    throw new Error(`Safepay amount mismatch for bid ${bid.id}.`);
  }
  if (currency !== "USD" || bid.payment_currency.toUpperCase() !== currency) {
    throw new Error(`Safepay currency mismatch for bid ${bid.id}.`);
  }

  const settlement = await settleDeposit(bid.id, tracker);
  const { error } = await getSupabaseAdmin()
    .from("bids")
    .update({
      payment_ref: tracker,
      payment_currency: currency,
      payment_amount_minor: amount,
      payment_captured_at: new Date().toISOString(),
    })
    .eq("id", bid.id);
  if (error) throw new Error(`Supabase payment confirmation update failed: ${error.message}`);

  let refundError: unknown;
  try {
    await refundOutbidBids(settlement.outbidBids);
  } catch (error) {
    refundError = error;
  }
  // A retry may find the settlement already applied; this second pass catches
  // any older pending refund that failed after a previous webhook attempt.
  try {
    await refundPendingDeposits();
  } catch (error) {
    refundError ??= error;
  }
  if (refundError) throw refundError;
}

async function handlePaymentRefunded(data: Record<string, unknown>): Promise<void> {
  const tracker = webhookString(data.tracker);
  const bidId = webhookMetadataValue(data.metadata, "bid_id") ??
    webhookMetadataValue(data.metadata, "order_id");
  const bid = await findBid(bidId, tracker);
  if (!bid) throw new Error("Safepay refund webhook references an unknown payment.");

  const amount = webhookNumber(data.refund_amount);
  if (amount === null || amount <= 0) {
    throw new Error(`Safepay refund webhook has no valid amount for bid ${bid.id}.`);
  }
  const currency = webhookString(data.currency)?.toUpperCase();
  if (!currency || currency !== bid.payment_currency.toUpperCase()) {
    throw new Error(`Safepay refund currency mismatch for bid ${bid.id}.`);
  }
  const balance = webhookNumber(data.balance);
  const expectedAmount = bid.payment_amount_minor ?? toPaymentAmount(bid.deposit_usd);
  if (balance !== null && (balance < 0 || balance > expectedAmount)) {
    throw new Error(`Safepay refund balance mismatch for bid ${bid.id}.`);
  }
  const complete = balance === 0 || amount >= expectedAmount;
  const cumulativeAmount =
    balance === null ? amount : Math.max(amount, expectedAmount - Math.max(balance, 0));
  await markRefundSucceeded(bid.id, cumulativeAmount, complete);
}

export async function POST(request: NextRequest) {
  if (!webhookIsConfigured()) {
    return NextResponse.json(
      { error: "Safepay webhook secret is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  let event;
  try {
    event = verifySafepayWebhook(rawBody, request.headers.get("X-SFPY-SIGNATURE"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook.";
    console.error("[safepay] webhook verification failed", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let admission;
  try {
    admission = await recordPaymentWebhook(event);
  } catch (error) {
    console.error("[safepay] webhook ledger insert failed", error);
    return NextResponse.json({ error: "Could not record webhook." }, { status: 500 });
  }
  if (admission === "DUPLICATE") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const data = requirePaymentData(event.type, event.data);
    switch (event.type) {
      case "payment.succeeded":
        await handlePaymentSucceeded(data);
        break;
      case "payment.refunded":
        await handlePaymentRefunded(data);
        break;
      case "payment.failed":
        // Keep the PENDING bid so a shopper can retry the hosted checkout. A
        // failed attempt must not promote a bid or delete a still-valid tracker.
        break;
      case "authorization.succeeded":
      case "authorization.reversed":
      case "void.succeeded":
        break;
      default:
        // Safepay can add event types; unknown events are recorded and acked.
        break;
    }

    await finishPaymentWebhook(event.token, "PROCESSED");
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    console.error("[safepay] webhook processing failed", message);
    try {
      await finishPaymentWebhook(event.token, "FAILED", message);
    } catch (ledgerError) {
      console.error("[safepay] webhook failure ledger update failed", ledgerError);
    }
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
