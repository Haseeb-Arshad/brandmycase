"use client";

import { useEffect, useState } from "react";
import { useAuction } from "@/components/AuctionProvider";
import { CaseStage } from "@/components/CaseStage";
import { formatUsd } from "@/lib/money";
import { SITE } from "@/data/site";

/**
 * Hero — centred single column: live count, headline, lede, funding, latest
 * bid, then the case itself in its card, then the actions.
 *
 * The countdown renders client-side only. Computing it during SSR would bake
 * the server's clock into the HTML and mismatch on hydration a second later.
 */

function useCountdown(iso: string): string | null {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const end = new Date(iso).getTime();

    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        setText("Auction closed");
        return;
      }
      const d = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setText(`Auction ends in ${d}d ${h}h ${m}m`);
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return text;
}

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CaseHero() {
  const { stats, recent } = useAuction();
  const countdown = useCountdown(SITE.auctionEndsAt);
  const latest = recent[0];

  const pct = Math.min(100, stats.percentOfGoal);

  return (
    <header className="hero" id="top">
      <p className="eyebrow">
        <span className="dot" aria-hidden="true" />
        {stats.panelsTaken} of {stats.panelsTotal} panels claimed
        <span style={{ opacity: 0.5 }}>·</span>
        <span className="tnum">{stats.bidsPlaced}</span> live bids
      </p>

      <h1>Your brand, on my case.</h1>

      <p className="lede">
        Your logo travels on the hardest-working object in tech: a founder&rsquo;s
        carry-on. San Francisco for DevDay, then eleven cities after it.
      </p>

      <div className="raise" id="auction">
        <div className="raise-topline">
          <strong className="tnum">
            {formatUsd(stats.raisedUsd)}
            <span>raised</span>
          </strong>
          <span className="raise-goal">
            of {formatUsd(stats.goalUsd)} · <b className="tnum">{stats.percentOfGoal}%</b>
          </span>
        </div>

        <div
          className="progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Funding progress"
        >
          <span style={{ width: `${pct}%` }} />
        </div>

        <p className="raise-note">
          {countdown ?? "Auction open"} · you can still outbid any panel
        </p>
      </div>

      {latest && (
        <p className="hero-latest" suppressHydrationWarning>
          <b>{latest.company}</b> took <b>{latest.placementName}</b> for{" "}
          <span className="tnum">{formatUsd(latest.amountUsd)}</span>
          <span className="muted">· {ago(latest.createdAt)}</span>
        </p>
      )}

      <CaseStage />

      <div className="hero-actions">
        <a className="pill-blue" href="#inventory">
          Get a panel
        </a>
        <a className="link-blue" href="#how">
          How it works ›
        </a>
      </div>
    </header>
  );
}
