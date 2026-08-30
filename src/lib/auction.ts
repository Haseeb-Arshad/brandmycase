import { LIVE_BID_STATUSES } from "@/lib/db";
import { getSupabaseAdmin, type BidRow } from "@/lib/supabase";
import {
  PLACEMENTS,
  GOAL_USD,
  RESERVE_FLOOR_USD,
  getPlacement,
  type Placement,
} from "@/data/placements";
import { depositFor, minimumNextBid } from "@/lib/money";

/**
 * The auction service.
 *
 * This is the only module that knows how a static panel plus a pile of bid rows
 * becomes "what the site shows". Both the page (server component) and the JSON
 * API call in here, so the rendered board and the API can never disagree.
 */

export interface PanelState extends Placement {
  /** Highest live bid on this panel, or null if nobody has claimed it. */
  currentBidUsd: number | null;
  /** Company holding the panel right now. */
  sponsor: string | null;
  sponsorUrl: string | null;
  /** How many live bids this panel has attracted. */
  bidCount: number;
  /** Smallest bid the API will accept next. */
  minimumBidUsd: number;
  /** Deposit due on that minimum bid. */
  minimumDepositUsd: number;
  taken: boolean;
}

export interface AuctionBoard {
  panels: PanelState[];
  stats: {
    raisedUsd: number;
    goalUsd: number;
    reserveFloorUsd: number;
    percentOfGoal: number;
    panelsTaken: number;
    panelsTotal: number;
    bidsPlaced: number;
  };
  recent: RecentBid[];
}

export interface RecentBid {
  company: string;
  placementId: string;
  placementName: string;
  amountUsd: number;
  createdAt: string;
}

const BID_COLUMNS =
  "id, placement_id, company, contact_email, website_url, message, amount_usd, deposit_usd, status, payment_provider, payment_ref, created_at, updated_at";

function requireRows<T>(
  data: T[] | null,
  error: { message: string } | null,
  operation: string,
): T[] {
  if (error) throw new Error(`Supabase ${operation} failed: ${error.message}`);
  return data ?? [];
}

/**
 * Build the whole board in two queries rather than one per panel.
 *
 * We pull every live bid once and fold it in memory. With 20 panels the row
 * count is tiny, and it keeps the panel ordering identical to PLACEMENTS -
 * which is what the 3D scene indexes against.
 */
export async function getAuctionBoard(): Promise<AuctionBoard> {
  const supabase = getSupabaseAdmin();
  const liveResult = await supabase
    .from("bids")
    .select(BID_COLUMNS)
    .in("status", [...LIVE_BID_STATUSES])
    .order("amount_usd", { ascending: false });
  const liveBids = requireRows(liveResult.data as BidRow[] | null, liveResult.error, "live board read");

  const byPlacement = new Map<string, typeof liveBids>();
  for (const bid of liveBids) {
    const list = byPlacement.get(bid.placement_id);
    if (list) list.push(bid);
    else byPlacement.set(bid.placement_id, [bid]);
  }

  const panels: PanelState[] = PLACEMENTS.map((placement) => {
    // Already sorted desc by the query, so index 0 is the leader.
    const bids = byPlacement.get(placement.id) ?? [];
    const leader = bids[0] ?? null;
    const currentBidUsd = leader?.amount_usd ?? null;
    const minimumBidUsd = minimumNextBid(placement.openingBidUsd, currentBidUsd);

    return {
      ...placement,
      currentBidUsd,
      sponsor: leader?.company ?? null,
      sponsorUrl: leader?.website_url ?? null,
      bidCount: bids.length,
      minimumBidUsd,
      minimumDepositUsd: depositFor(minimumBidUsd),
      taken: leader !== null,
    };
  });

  const raisedUsd = panels.reduce((sum, p) => sum + (p.currentBidUsd ?? 0), 0);
  const panelsTaken = panels.filter((p) => p.taken).length;

  const recentResult = await supabase
    .from("bids")
    .select(BID_COLUMNS)
    .in("status", [...LIVE_BID_STATUSES])
    .order("created_at", { ascending: false })
    .limit(8);
  const recentRows = requireRows(recentResult.data as BidRow[] | null, recentResult.error, "recent board read");

  const recent: RecentBid[] = recentRows.map((bid) => ({
    company: bid.company,
    placementId: bid.placement_id,
    placementName: getPlacement(bid.placement_id)?.name ?? bid.placement_id,
    amountUsd: bid.amount_usd,
    createdAt: new Date(bid.created_at).toISOString(),
  }));

  return {
    panels,
    stats: {
      raisedUsd,
      goalUsd: GOAL_USD,
      reserveFloorUsd: RESERVE_FLOOR_USD,
      percentOfGoal: Math.round((raisedUsd / GOAL_USD) * 1000) / 10,
      panelsTaken,
      panelsTotal: panels.length,
      bidsPlaced: liveBids.length,
    },
    recent,
  };
}

/** The state of one panel, for validating an incoming bid. */
export async function getPanelState(placementId: string): Promise<PanelState | null> {
  const placement = getPlacement(placementId);
  if (!placement) return null;

  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("bids")
    .select(BID_COLUMNS)
    .eq("placement_id", placementId)
    .in("status", [...LIVE_BID_STATUSES])
    .order("amount_usd", { ascending: false });
  const bids = requireRows(result.data as BidRow[] | null, result.error, "panel state read");

  const leader = bids[0] ?? null;
  const currentBidUsd = leader?.amount_usd ?? null;
  const minimumBidUsd = minimumNextBid(placement.openingBidUsd, currentBidUsd);

  return {
    ...placement,
    currentBidUsd,
    sponsor: leader?.company ?? null,
    sponsorUrl: leader?.website_url ?? null,
    bidCount: bids.length,
    minimumBidUsd,
    minimumDepositUsd: depositFor(minimumBidUsd),
    taken: leader !== null,
  };
}

/**
 * Promote a bid to live once its deposit clears, and demote whoever it beat.
 *
 * Runs in a transaction: a bid must never be marked DEPOSIT_PAID without the
 * previous leader being marked OUTBID in the same commit, or the board would
 * briefly show two live leaders on one panel.
 */
export async function settleDeposit(bidId: string, paymentRef: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("settle_bid", {
    p_bid_id: bidId,
    p_payment_ref: paymentRef,
  });
  if (error) throw new Error(`Supabase bid settlement failed: ${error.message}`);
}
