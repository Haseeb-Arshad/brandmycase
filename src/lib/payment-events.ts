import { getSupabaseAdmin } from "@/lib/supabase";
import type { SafepayWebhookEvent } from "@/lib/payments";

export type PaymentWebhookStatus = "RECEIVED" | "PROCESSED" | "FAILED";
export type PaymentWebhookAdmission = "NEW" | "RETRY" | "DUPLICATE";

/**
 * Store the provider event before applying business logic. Safepay can retry
 * deliveries, so the provider event token is the idempotency key.
 */
export async function recordPaymentWebhook(
  event: SafepayWebhookEvent,
): Promise<PaymentWebhookAdmission> {
  const { error } = await getSupabaseAdmin()
    .from("payment_webhook_events")
    .insert({
      provider: "safepay",
      event_id: event.token,
      event_type: event.type,
      payload: event,
      status: "RECEIVED",
    });

  if (error?.code === "23505") {
    const existing = await getSupabaseAdmin()
      .from("payment_webhook_events")
      .select("status")
      .eq("provider", "safepay")
      .eq("event_id", event.token)
      .maybeSingle();
    if (existing.error) {
      throw new Error(`Supabase webhook ledger lookup failed: ${existing.error.message}`);
    }
    return existing.data?.status === "FAILED" ? "RETRY" : "DUPLICATE";
  }
  if (error) throw new Error(`Supabase webhook ledger insert failed: ${error.message}`);
  return "NEW";
}

export async function finishPaymentWebhook(
  eventId: string,
  status: PaymentWebhookStatus,
  errorMessage?: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("payment_webhook_events")
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: status === "PROCESSED" ? new Date().toISOString() : null,
    })
    .eq("provider", "safepay")
    .eq("event_id", eventId);

  if (error) throw new Error(`Supabase webhook ledger update failed: ${error.message}`);
}
