/** Bid states that count as a live claim on a panel. */
export const LIVE_BID_STATUSES = ["DEPOSIT_PAID", "WON"] as const;

export type BidStatus =
  | "PENDING"
  | "DEPOSIT_PAID"
  | "OUTBID"
  | "WON"
  | "REFUNDED"
  | "REJECTED";
