import {
  PAYMENTS_MODE,
  refundSafepayPayment,
} from "@/lib/payments";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toPaymentAmount } from "@/lib/money";

export interface OutbidBid {
  id: string;
  paymentRef: string | null;
}

interface RefundableBid {
  id: string;
  payment_provider: string;
  payment_ref: string | null;
  payment_currency: string;
  payment_amount_minor: number | null;
  deposit_usd: number;
  refund_status: string;
}

export async function requestDepositRefund(bidId: string): Promise<void> {
  const result = await getSupabaseAdmin()
    .from("bids")
    .select(
      "id, payment_provider, payment_ref, payment_currency, payment_amount_minor, deposit_usd, refund_status",
    )
    .eq("id", bidId)
    .maybeSingle();
  if (result.error) throw new Error(`Supabase refund lookup failed: ${result.error.message}`);
  const bid = result.data as RefundableBid | null;
  if (!bid) throw new Error(`Cannot refund unknown bid ${bidId}.`);
  if (bid.refund_status === "SUCCEEDED") return;
  if (!bid.payment_ref) throw new Error(`Bid ${bidId} has no payment reference to refund.`);

  const amountMinor = bid.payment_amount_minor ?? toPaymentAmount(bid.deposit_usd);
  const requestedAt = new Date().toISOString();

  const pendingUpdate = await getSupabaseAdmin()
    .from("bids")
    .update({
      refund_status: "PENDING",
      refund_requested_at: requestedAt,
      refund_error: null,
    })
    .eq("id", bidId)
    .neq("refund_status", "SUCCEEDED");
  if (pendingUpdate.error) {
    throw new Error(`Supabase refund state update failed: ${pendingUpdate.error.message}`);
  }

  try {
    let refundRef: string | null = null;
    if (PAYMENTS_MODE === "mock") {
      refundRef = `mock_ref_${bidId}`;
    } else {
      if (bid.payment_provider !== "safepay") {
        throw new Error(`Bid ${bidId} belongs to unsupported provider ${bid.payment_provider}.`);
      }
      refundRef = await refundSafepayPayment({
        tracker: bid.payment_ref,
        currency: bid.payment_currency || "USD",
        amountMinor,
      });
    }

    const { error } = await getSupabaseAdmin()
      .from("bids")
      .update({
        refund_status: PAYMENTS_MODE === "mock" ? "SUCCEEDED" : "PROCESSING",
        refund_ref: refundRef,
        refund_amount_minor: amountMinor,
        refund_error: null,
        refunded_at: PAYMENTS_MODE === "mock" ? requestedAt : null,
      })
      .eq("id", bidId);
    if (error) throw new Error(`Supabase refund result update failed: ${error.message}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refund error.";
    await getSupabaseAdmin()
      .from("bids")
      .update({ refund_status: "FAILED", refund_error: message.slice(0, 500) })
      .eq("id", bidId);
    throw error;
  }
}

/** Process every bid that the settlement transaction demoted. */
export async function refundOutbidBids(bids: OutbidBid[]): Promise<void> {
  let firstError: unknown;
  for (const bid of bids) {
    try {
      await requestDepositRefund(bid.id);
    } catch (error) {
      firstError ??= error;
      console.error("[payments] outbid refund failed", { bidId: bid.id, error });
    }
  }
  if (firstError) throw firstError;
}

/** Retry a small bounded batch left in PENDING or FAILED after a prior attempt. */
export async function refundPendingDeposits(): Promise<void> {
  const result = await getSupabaseAdmin()
    .from("bids")
    .select("id")
    .in("status", ["OUTBID", "REJECTED"])
    .in("refund_status", ["PENDING", "FAILED"])
    .order("updated_at", { ascending: true })
    .limit(25);
  if (result.error) {
    throw new Error(`Supabase pending refund lookup failed: ${result.error.message}`);
  }

  let firstError: unknown;
  for (const row of (result.data ?? []) as Array<{ id: string }>) {
    try {
      await requestDepositRefund(row.id);
    } catch (error) {
      firstError ??= error;
      console.error("[payments] pending refund retry failed", { bidId: row.id, error });
    }
  }
  if (firstError) throw firstError;
}

export async function markRefundSucceeded(
  bidId: string,
  refundAmountMinor: number,
  complete: boolean,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("bids")
    .update({
      refund_status: complete ? "SUCCEEDED" : "PARTIAL",
      refund_amount_minor: refundAmountMinor,
      refunded_at: complete ? new Date().toISOString() : null,
      refund_error: null,
    })
    .eq("id", bidId);
  if (error) throw new Error(`Supabase refund confirmation update failed: ${error.message}`);
}
