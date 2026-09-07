"use client";

import { useCampaign } from "@/components/CampaignProvider";
import { formatUsd } from "@/data/sponsorship";

/**
 * The funding bar.
 *
 * Every figure here is derived from CONFIRMED sponsorships in the database and
 * nothing else. Inquiries, sent invoices and conversations in progress are all
 * worth exactly zero on this bar, which is the only way it stays worth
 * looking at.
 *
 * At zero it says so plainly. A campaign that opens by pretending to be
 * half-funded has nothing left to say when a sponsor checks back.
 */
export function FundingProgress({ compact = false }: { compact?: boolean }) {
  const { funding, stats } = useCampaign();
  const { raisedUsd, goalUsd, percentFunded, confirmedCount } = funding;

  return (
    <div className="funding" data-compact={compact} id="funding">
      <div className="funding-head">
        <p className="funding-raised">
          <b className="tnum">{formatUsd(raisedUsd)}</b>
          <span>of {formatUsd(goalUsd)} funded</span>
        </p>
        <p className="funding-percent tnum" aria-hidden="true">
          {percentFunded}%
        </p>
      </div>

      <div
        className="funding-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goalUsd}
        aria-valuenow={raisedUsd}
        aria-valuetext={`${formatUsd(raisedUsd)} of ${formatUsd(goalUsd)} raised`}
        aria-label="Campaign funding"
      >
        <span style={{ width: `${percentFunded}%` }} />
      </div>

      <p className="funding-meta">
        {confirmedCount === 0 ? (
          <>
            <b>No sponsors confirmed yet</b> · {stats.available} placements open ·
            founding sponsor positions are open
          </>
        ) : (
          <>
            <b className="tnum">{confirmedCount}</b>{" "}
            {confirmedCount === 1 ? "sponsor" : "sponsors"} confirmed ·{" "}
            <b className="tnum">{stats.available}</b> of {stats.total} placements
            still open
          </>
        )}
      </p>
    </div>
  );
}
