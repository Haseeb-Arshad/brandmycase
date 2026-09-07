import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { bidSchema, fieldErrors } from "@/lib/validation";
import { getPanelState, settleDeposit } from "@/lib/auction";
import { depositFor, formatUsd, toPaymentAmount } from "@/lib/money";
import { createDepositSession, PAYMENT_MODE, paymentsEnabled } from "@/lib/payments";
import { refundOutbidBids } from "@/lib/refunds";
import { auctionEndpointsEnabled } from "@/lib/campaign";

/**
 * POST /api/bids — FUTURE / DISABLED IN THE FOUNDING EDITION.
 *
 * The retired bid-and-deposit endpoint. While CAMPAIGN_MODE is `interest` this
 * route does not exist as far as a caller is concerned: it answers 404 before
 * reading the body, before touching Supabase, and before any payment code
 * runs. Somebody who finds the path in an old copy of the site cannot create a
 * bid row, cannot open a checkout, and above all cannot trigger a mock
 * settlement that would tell them money had moved.
 *
 * With CAMPAIGN_MODE=auction and real credentials the original flow is:
 *
 *   1. validate the body
 *   2. re-read the panel's live state (never trust a price from the client)
 *   3. reject anything below the current minimum
 *   4. write a PENDING bid
 *   5. open a deposit checkout
 *
 * The bid only becomes live once the deposit settles - via the Safepay webhook
 * in live mode, or immediately here in mock mode. Until then it holds no claim
 * on the panel, so two people bidding at once cannot both take it.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Gate one: the campaign is not an auction, so there is nothing to bid on.
  if (!auctionEndpointsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Gate two: the auction is on but no usable payment backend is configured.
  // Refuse rather than record a bid that can never settle.
  if (!paymentsEnabled()) {
    return NextResponse.json(
      { error: "Bidding is unavailable while payments are not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = bidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  const input = parsed.data;

  const panel = await getPanelState(input.placementId);
  if (!panel) {
    return NextResponse.json({ error: "Unknown panel." }, { status: 404 });
  }

  // The authoritative minimum comes from the server, right now - not from
  // whatever the page was showing when the form was opened.
  if (input.amountUsd < panel.minimumBidUsd) {
    return NextResponse.json(
      {
        error: `Panel ${panel.id} is now at ${formatUsd(panel.minimumBidUsd)}. Raise your bid to take it.`,
        fields: { amountUsd: `Minimum is ${formatUsd(panel.minimumBidUsd)}.` },
        minimumBidUsd: panel.minimumBidUsd,
      },
      { status: 409 },
    );
  }

  const depositUsd = depositFor(input.amountUsd);
  const bidId = crypto.randomUUID();

  const { data: bid, error: insertError } = await getSupabaseAdmin()
    .from("bids")
    .insert({
      id: bidId,
      placement_id: input.placementId,
      company: input.company,
      contact_email: input.contactEmail,
      website_url: input.websiteUrl ?? null,
      message: input.message ?? null,
      amount_usd: input.amountUsd,
      deposit_usd: depositUsd,
      status: "PENDING",
      payment_provider: PAYMENT_MODE === "live" ? "safepay" : "mock",
      payment_currency: "USD",
      payment_amount_minor: toPaymentAmount(depositUsd),
    })
    .select("id")
    .single();

  if (insertError || !bid) {
    console.error("[bids] Supabase insert failed", insertError);
    return NextResponse.json(
      { error: "Could not record your bid. Please try again." },
      { status: 503 },
    );
  }

  let session;
  try {
    session = await createDepositSession({
      bidId: bid.id,
      placementId: panel.id,
      placementName: panel.name,
      company: input.company,
      contactEmail: input.contactEmail,
      bidAmountUsd: input.amountUsd,
      depositUsd,
    });
  } catch (error) {
    // A live tracker may already exist if a later SDK step failed. Keep that
    // row so a provider webhook can still reconcile it by bid metadata. Local
    // mock/misconfigured attempts have no provider-side payment to reconcile.
    if (PAYMENT_MODE !== "live") {
      await getSupabaseAdmin().from("bids").delete().eq("id", bid.id);
    }
    console.error("[bids] checkout failed", error);
    return NextResponse.json(
      { error: "Could not open the payment step. Please try again." },
      { status: 502 },
    );
  }

  // In mock mode no webhook is coming, so settle here to keep the two modes
  // behaviourally identical from the browser's point of view.
  if (session.mode === "mock") {
    const settlement = await settleDeposit(bid.id, session.reference);
    await refundOutbidBids(settlement.outbidBids);
  } else {
    const { error } = await getSupabaseAdmin()
      .from("bids")
      .update({ payment_ref: session.reference })
      .eq("id", bid.id);
    if (error) throw error;
  }

  return NextResponse.json(
    {
      bidId: bid.id,
      placementId: panel.id,
      amountUsd: input.amountUsd,
      depositUsd,
      mode: session.mode,
      redirectUrl: session.redirectUrl,
    },
    { status: 201 },
  );
}
