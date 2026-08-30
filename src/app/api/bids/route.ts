import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bidSchema, fieldErrors } from "@/lib/validation";
import { getPanelState, settleDeposit } from "@/lib/auction";
import { depositFor, formatUsd } from "@/lib/money";
import { createDepositSession, PAYMENTS_MODE } from "@/lib/stripe";

/**
 * POST /api/bids
 *
 * Place a bid on a panel. The flow is:
 *
 *   1. validate the body
 *   2. re-read the panel's live state (never trust a price from the client)
 *   3. reject anything below the current minimum
 *   4. write a PENDING bid
 *   5. open a deposit checkout
 *
 * The bid only becomes live once the deposit settles - via the Stripe webhook
 * in live mode, or immediately here in mock mode. Until then it holds no claim
 * on the panel, so two people bidding at once cannot both take it.
 */

export async function POST(request: NextRequest) {
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

  const bid = await prisma.bid.create({
    data: {
      placementId: input.placementId,
      company: input.company,
      contactEmail: input.contactEmail,
      websiteUrl: input.websiteUrl ?? null,
      message: input.message ?? null,
      amountUsd: input.amountUsd,
      depositUsd,
      status: "PENDING",
      paymentProvider: PAYMENTS_MODE === "live" ? "stripe" : "mock",
    },
  });

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
    // Never leave an orphan PENDING row behind a failed checkout.
    await prisma.bid.delete({ where: { id: bid.id } });
    console.error("[bids] checkout failed", error);
    return NextResponse.json(
      { error: "Could not open the payment step. Please try again." },
      { status: 502 },
    );
  }

  // In mock mode no webhook is coming, so settle here to keep the two modes
  // behaviourally identical from the browser's point of view.
  if (session.mode === "mock") {
    await settleDeposit(bid.id, session.reference);
  } else {
    await prisma.bid.update({
      where: { id: bid.id },
      data: { paymentRef: session.reference },
    });
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
