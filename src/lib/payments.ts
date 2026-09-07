import { createHmac, timingSafeEqual } from "node:crypto";
import Safepay from "@sfpy/node-core";
import { toPaymentAmount } from "@/lib/money";
import { CAMPAIGN_MODE, type CampaignMode } from "@/lib/campaign";

/**
 * FUTURE / DISABLED IN THE FOUNDING EDITION.
 *
 * This module is the provider boundary for the retired bid-and-deposit
 * auction. The Founding Edition takes no payment of any kind, so in the
 * shipped configuration every function here refuses to do anything.
 *
 * It is kept, rather than deleted, because the Safepay integration is real
 * work - signed webhooks, an idempotent event ledger, durable refunds - and
 * re-deriving it later would be worse than carrying it dormant. See
 * docs/06-payments.md and docs/12-founding-edition-launch.md.
 *
 * THE SAFETY RULE
 * ---------------
 * A mock payment is a useful development fiction and a catastrophic thing to
 * show a real visitor: it tells somebody money moved when it did not. So mock
 * mode is gated three deep. It requires all of:
 *
 *   1. CAMPAIGN_MODE=auction        (never true in the Founding Edition)
 *   2. a non-production NODE_ENV    (never true on a deployed build)
 *   3. no payment credentials at all
 *
 * Any production deployment therefore lands on `disabled` or `misconfigured`,
 * never on `mock`. `resolvePaymentMode` below is a pure function precisely so
 * that this matrix is testable rather than asserted in a comment.
 */

export type PaymentMode = "live" | "mock" | "disabled" | "misconfigured";
/** @deprecated Retained for the dormant auction modules. Use PaymentMode. */
export type PaymentsMode = PaymentMode;
export type SafepayEnvironment = "sandbox" | "production";

export interface PaymentEnvironment {
  campaignMode: CampaignMode;
  nodeEnv: string | undefined;
  publicKey: string | undefined;
  secretKey: string | undefined;
  webhookSecret: string | undefined;
}

const clean = (value: string | undefined) => value?.trim() || undefined;

/**
 * The whole payment-mode decision, as one pure function.
 *
 *   campaign is not `auction`    -> disabled   (the Founding Edition, always)
 *   production, no credentials   -> disabled
 *   any env, partial credentials -> misconfigured
 *   any env, full credentials    -> live
 *   non-production, none set     -> mock       (local development only)
 */
export function resolvePaymentMode(env: PaymentEnvironment): PaymentMode {
  // The campaign switch wins over everything. If the site is not running an
  // auction there is nothing to charge for, so no payment path may open.
  if (env.campaignMode !== "auction") return "disabled";

  const publicKey = clean(env.publicKey);
  const secretKey = clean(env.secretKey);
  const webhookSecret = clean(env.webhookSecret);

  const configured = [publicKey, secretKey, webhookSecret].filter(Boolean).length;
  if (configured === 3) return "live";
  // A half-configured account must never look healthy: it would take orders
  // and settle nothing.
  if (configured > 0) return "misconfigured";

  // No credentials at all. Deterministic mock is fine on a developer's
  // machine and is never acceptable in front of a real visitor.
  return env.nodeEnv === "production" ? "disabled" : "mock";
}

const publicKey = clean(process.env.SAFEPAY_PUBLIC_KEY);
const privateKey = clean(process.env.SAFEPAY_SECRET_KEY);
const webhookSecret = clean(process.env.SAFEPAY_WEBHOOK_SECRET);
const configuredEnvironment = process.env.SAFEPAY_ENVIRONMENT?.trim().toLowerCase();
const configuredIntent = process.env.SAFEPAY_INTENT?.trim().toUpperCase();

export const SAFEPAY_ENVIRONMENT: SafepayEnvironment =
  configuredEnvironment === "production" ? "production" : "sandbox";

export const SAFEPAY_INTENT = configuredIntent === "MPGS" ? "MPGS" : "CYBERSOURCE";

export const PAYMENT_MODE: PaymentMode = resolvePaymentMode({
  campaignMode: CAMPAIGN_MODE,
  nodeEnv: process.env.NODE_ENV,
  publicKey,
  secretKey: privateKey,
  webhookSecret,
});

/** @deprecated Retained for the dormant auction modules. Use PAYMENT_MODE. */
export const PAYMENTS_MODE: PaymentMode = PAYMENT_MODE;

/** Is any payment surface allowed to be reachable by a visitor right now? */
export function paymentsEnabled(mode: PaymentMode = PAYMENT_MODE): boolean {
  return mode === "live" || mode === "mock";
}

const safepayHost =
  SAFEPAY_ENVIRONMENT === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";

export const safepay =
  PAYMENT_MODE === "live"
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
  if (PAYMENT_MODE !== "live" || !safepay) {
    throw new Error(paymentModeError());
  }
  return safepay;
}

/** One place that turns a non-live mode into an operator-legible message. */
export function paymentModeError(mode: PaymentMode = PAYMENT_MODE): string {
  switch (mode) {
    case "disabled":
      return "Payments are disabled. The campaign runs in interest mode: sponsorships are invoiced directly and no payment is taken on the site.";
    case "misconfigured":
      return "Safepay is partially configured; set SAFEPAY_PUBLIC_KEY, SAFEPAY_SECRET_KEY, and SAFEPAY_WEBHOOK_SECRET.";
    case "mock":
      return "Safepay is in local mock mode and has no live credentials.";
    case "live":
      return "Safepay live credentials are configured.";
  }
}

/** Create a hosted Safepay Express Checkout session for the refundable deposit. */
export async function createDepositSession(req: DepositRequest): Promise<DepositSession> {
  const base = siteUrl();

  if (PAYMENT_MODE === "disabled" || PAYMENT_MODE === "misconfigured") {
    throw new Error(paymentModeError());
  }

  if (PAYMENT_MODE === "mock") {
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

/**
 * Can the webhook route accept anything at all?
 *
 * Both conditions matter. A configured secret with payments disabled must
 * still refuse: settling a bid while the public site is an inquiry campaign
 * would put money against an offer nobody was shown.
 */
export function webhookIsConfigured(): boolean {
  return PAYMENT_MODE === "live" && Boolean(webhookSecret);
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
