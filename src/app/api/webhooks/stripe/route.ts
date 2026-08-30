import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { settleDeposit } from "@/lib/auction";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/webhooks/stripe
 *
 * The only path that can promote a bid to live in production. We verify the
 * signature against the raw body before reading a single field - an unsigned
 * request must never be able to hand somebody a panel.
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */

export const dynamic = "force-dynamic";
// Signature verification needs the exact bytes Stripe sent, so this route must
// not run through any body parser.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured; the app is running in mock mode." },
      { status: 503 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is missing.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error("[stripe] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const bidId = session.client_reference_id ?? session.metadata?.bidId;
      if (!bidId) {
        console.error("[stripe] completed session with no bid reference", session.id);
        break;
      }
      // settleDeposit is a no-op unless the bid is still PENDING, which makes
      // this safe against Stripe's at-least-once delivery.
      await settleDeposit(bidId, session.id);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const bidId = session.client_reference_id ?? session.metadata?.bidId;
      if (bidId) {
        // The bidder abandoned checkout. Drop the pending claim so the panel's
        // minimum is not held up by a bid nobody paid for.
        const { error } = await getSupabaseAdmin()
          .from("bids")
          .delete()
          .eq("id", bidId)
          .eq("status", "PENDING");
        if (error) throw error;
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const bidId = charge.metadata?.bidId;
      if (bidId) {
        const { error } = await getSupabaseAdmin()
          .from("bids")
          .update({ status: "REFUNDED" })
          .eq("id", bidId);
        if (error) throw error;
      }
      break;
    }

    default:
      // Everything else is acknowledged and ignored.
      break;
  }

  return NextResponse.json({ received: true });
}
