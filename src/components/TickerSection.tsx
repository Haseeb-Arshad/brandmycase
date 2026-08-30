"use client";

import { useAuction } from "@/components/AuctionProvider";
import { formatUsd } from "@/lib/money";

/** Relative time, coarse on purpose — "18h ago" not "18h 04m 22s ago". */
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** The recent-bid feed. Proof the auction is a live thing and not a price list. */
export function TickerSection() {
  const { recent } = useAuction();
  if (recent.length === 0) return null;

  return (
    <section className="section" style={{ paddingTop: 0 }} aria-label="Recent bids">
      <div className="wrap">
        <div className="section-head" style={{ marginBottom: 34 }}>
          <p className="section-kicker">Latest activity</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Who moved last.
          </h2>
        </div>

        <ul className="ticker">
          {recent.map((bid, i) => (
            <li key={`${bid.placementId}-${bid.createdAt}-${i}`}>
              <b>{bid.company}</b>
              <span>took</span>
              <b>
                {bid.placementId} · {bid.placementName}
              </b>
              <span>for</span>
              <span className="amt tnum">{formatUsd(bid.amountUsd)}</span>
              <span className="when" suppressHydrationWarning>
                {ago(bid.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
