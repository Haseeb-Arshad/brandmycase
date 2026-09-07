import { NextResponse } from "next/server";
import { getAuctionBoard } from "@/lib/auction";
import { auctionEndpointsEnabled } from "@/lib/campaign";

/**
 * GET /api/board — FUTURE / DISABLED.
 *
 * The retired auction payload: every panel with its live bid, the funding
 * stats and the recent-bid ticker. It answers 404 unless CAMPAIGN_MODE is
 * explicitly `auction`, so no bid amount, sponsor name or funding figure can
 * be read off the live site.
 *
 * The live board is rendered on the server from `src/lib/placement-board.ts`
 * and handed to the page. It has no JSON endpoint because the browser has
 * nothing to refetch.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  if (!auctionEndpointsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const board = await getAuctionBoard();
  return NextResponse.json(board, {
    headers: { "Cache-Control": "no-store" },
  });
}
