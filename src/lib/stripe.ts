import Stripe from "stripe";
import { toStripeAmount } from "@/lib/money";

/**
 * Payments.
 *
 * The site has to be runnable by anyone who clones it, including with no Stripe
 * account. So the payment layer has two interchangeable backends behind one
 * function:
 *
 *   LIVE  - STRIPE_SECRET_KEY is set. Real Checkout Session, real webhook.
 *   MOCK  - no key. A deposit reference is minted locally and the caller is
 *           redirected straight to the success page. Nothing leaves the box.
 *
 * Both return the same shape, so no route handler has to branch on the mode.
 */

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

export const PAYMENTS_MODE: "live" | "mock" = secretKey ? "live" : "mock";

export const stripe = secretKey
  ? new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" })
  : null;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

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

/**
 * Create a deposit checkout for a bid.
 *
 * The bid id travels in `client_reference_id` and in metadata so the webhook
 * can settle exactly one bid without trusting anything in the URL.
 */
export async function createDepositSession(req: DepositRequest): Promise<DepositSession> {
  const base = siteUrl();

  if (!stripe) {
    // MOCK: mint a stable, obviously-fake reference. The checkout route settles
    // the bid immediately rather than waiting for a webhook that will never come.
    const reference = "mock_dep_" + req.bidId;
    return {
      mode: "mock",
      reference,
      redirectUrl: `${base}/success?bid=${encodeURIComponent(req.bidId)}&mode=mock`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: req.contactEmail,
    client_reference_id: req.bidId,
    metadata: {
      bidId: req.bidId,
      placementId: req.placementId,
      company: req.company,
      bidAmountUsd: String(req.bidAmountUsd),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: toStripeAmount(req.depositUsd),
          product_data: {
            name: `CODEC ONE - deposit on panel ${req.placementId} (${req.placementName})`,
            description:
              `Refundable deposit against a ${"$" + req.bidAmountUsd.toLocaleString("en-US")} ` +
              `bid for ${req.company}. Returned in full if the bid is outbid or declined.`,
          },
        },
      },
    ],
    success_url: `${base}/success?bid=${req.bidId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?cancelled=${req.placementId}`,
  });

  if (!session.url) throw new Error("Stripe returned a session with no URL.");

  return { mode: "live", reference: session.id, redirectUrl: session.url };
}
