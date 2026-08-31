import { createHmac, timingSafeEqual } from "node:crypto";
import Safepay from "@sfpy/node-core";
import { toPaymentAmount } from "@/lib/money";

/**
 * Provider boundary for the auction.
 *
 * With no Safepay keys, local development stays deterministic and uses the
 * mock path. A partially configured account is deliberately not treated as
 * mock mode: that would make a deployment look healthy while silently taking
 * no real payments.
 */

export type PaymentsMode = "mock" | "live" | "misconfigured";
export type SafepayEnvironment = "sandbox" | "production";

const publicKey = process.env.SAFEPAY_PUBLIC_KEY?.trim();
const privateKey = process.env.SAFEPAY_SECRET_KEY?.trim();
const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim();
const configuredEnvironment = process.env.SAFEPAY_ENVIRONMENT?.trim().toLowerCase();
const configuredIntent = process.env.SAFEPAY_INTENT?.trim().toUpperCase();

export const SAFEPAY_ENVIRONMENT: SafepayEnvironment =
  configuredEnvironment === "production" ? "production" : "sandbox";

export const SAFEPAY_INTENT =
  configuredIntent === "MPGS" ? "MPGS" : "CYBERSOURCE";

const hasAnyPaymentConfig = Boolean(publicKey || privateKey || webhookSecret);
export const PAYMENTS_MODE: PaymentsMode =
  publicKey && privateKey && webhookSecret
    ? "live"
    : hasAnyPaymentConfig
      ? "misconfigured"
      : "mock";

const safepayHost =
  SAFEPAY_ENVIRONMENT === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";

export const safepay =
  PAYMENTS_MODE === "live"
    ? new Safepay(privateKey!, { authType: "secret", host: safepayHost })
    : null;

export interface DepositSession {
  mode: "live" | "mock";
  /** Where the browser should go next. */
  redirectUrl: string;
  /** Provider-side reference, stored on the bid. */
  reference: string;
}

export interface DepositRequest {
  bidId: string;
  placementName: string;
  placementId: string;
  company: string;
  contactEmail: string;
  bidAmountUsd: number;
  depositUsd: number;
}

export interface RefundRequest {
  tracker: string;
  currency: string;
  amountMinor: number;
}

export interface SafepayWebhookEvent {
  token: string;
  type: string;
  version?: string;
  data?: Record<string, unknown>;
  delivery_attempts?: number;
  next_attempt_at?: string;
  [key: string]: unknown;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function responseReference(value: unknown): string | null {
  const root = record(value);
  const data = record(root?.data);
  const tracker = record(data?.tracker);
  const action = record(data?.action);
  return (
    stringValue(tracker?.token) ??
    stringValue(action?.token) ??
    stringValue(data?.token) ??
    stringValue(root?.token)
  );
}

function requireLiveClient(): NonNullable<typeof safepay> {
  if (PAYMENTS_MODE !== "live" || !safepay) {
    throw new Error(
      PAYMENTS_MODE === "misconfigured"
        ? "Safepay is partially configured; set SAFEPAY_PUBLIC_KEY, SAFEPAY_SECRET_KEY, and SAFEPAY_WEBHOOK_SECRET."
        : "Safepay live credentials are not configured.",
    );
  }
  return safepay;
}

/** Create a hosted Safepay Express Checkout session for the refundable deposit. */
export async function createDepositSession(req: DepositRequest): Promise<DepositSession> {
  const base = siteUrl();

  if (PAYMENTS_MODE === "mock") {
    const reference = "mock_dep_" + req.bidId;
    return {
      mode: "mock",
      reference,
      redirectUrl: `${base}/success?bid=${encodeURIComponent(req.bidId)}&mode=mock`,
    };
  }

  const client = requireLiveClient();
  const sessionResponse = await client.payments.session.setup({
    merchant_api_key: publicKey,
    intent: SAFEPAY_INTENT,
    mode: "payment",
    entry_mode: "raw",
    currency: "USD",
    amount: toPaymentAmount(req.depositUsd),
    metadata: {
      order_id: req.bidId,
      bid_id: req.bidId,
      placement_id: req.placementId,
      company: req.company,
      contact_email: req.contactEmail,
      bid_amount_usd: String(req.bidAmountUsd),
      deposit_usd: String(req.depositUsd),
    },
    include_fees: false,
  });

  const sessionData = record(record(sessionResponse)?.data);
  const tracker = stringValue(record(sessionData?.tracker)?.token);
  if (!tracker) throw new Error("Safepay did not return a payment tracker.");

  const authResponse = await client.client.passport.create();
  const authToken = stringValue(record(authResponse)?.data);
  if (!authToken) throw new Error("Safepay did not return a checkout token.");

  const redirectUrl = client.checkout.createCheckoutUrl({
    env: SAFEPAY_ENVIRONMENT,
    tbt: authToken,
    tracker,
    source: "hosted",
    redirect_url: `${base}/success?bid=${encodeURIComponent(req.bidId)}&provider=safepay`,
    cancel_url: `${base}/?cancelled=${encodeURIComponent(req.placementId)}`,
  });

  return { mode: "live", reference: tracker, redirectUrl };
}

/** Ask Safepay to refund a captured payment to the original payment method. */
export async function refundSafepayPayment(req: RefundRequest): Promise<string | null> {
  const client = requireLiveClient();
  const response = await client.order.cancel.refund(req.tracker, {
    currency: req.currency,
    amount: req.amountMinor,
  });
  return responseReference(response);
}

/** Verify Safepay's raw-body HMAC-SHA512 webhook signature. */
export function verifySafepayWebhook(
  rawBody: string,
  signature: string | null,
  secretOverride?: string,
): SafepayWebhookEvent {
  const secret = secretOverride === undefined ? webhookSecret : secretOverride.trim();
  if (!secret) throw new Error("SAFEPAY_WEBHOOK_SECRET is not configured.");
  if (!signature?.trim()) throw new Error("Missing X-SFPY-SIGNATURE header.");

  const expected = createHmac("sha512", secret)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("hex");
  const received = signature.trim().replace(/^sha512=/i, "").toLowerCase();
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error("Invalid Safepay webhook signature.");
  }

  const parsed: unknown = JSON.parse(rawBody);
  const event = record(parsed);
  const token = stringValue(event?.token);
  const type = stringValue(event?.type);
  if (!event || !token || !type) throw new Error("Invalid Safepay webhook payload.");

  return { ...event, token, type, data: record(event.data) ?? undefined };
}

export function webhookIsConfigured(): boolean {
  return Boolean(webhookSecret);
}

export function webhookMetadataValue(
  metadata: unknown,
  key: string,
): string | null {
  const value = record(metadata)?.[key];
  if (typeof value === "string") return value;
  return stringValue(record(value)?.value);
}

export function webhookNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function webhookString(value: unknown): string | null {
  return stringValue(value);
}
