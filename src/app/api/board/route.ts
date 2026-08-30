import { NextResponse } from "next/server";
import { getAuctionBoard } from "@/lib/auction";

/**
 * GET /api/board
 *
 * The whole auction in one payload: every panel with its live bid, the funding
 * stats, and the recent-bid ticker. The client refetches this after a bid so
 * the 3D case and the inventory table update together from one source.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const board = await getAuctionBoard();
  return NextResponse.json(board, {
    headers: { "Cache-Control": "no-store" },
  });
}
