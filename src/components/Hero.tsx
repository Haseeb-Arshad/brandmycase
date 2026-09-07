"use client";

import { formatUsd, TIER_BY_ID } from "@/data/sponsorship";
import { TRIP } from "@/data/site";
import { useCampaign } from "@/components/CampaignProvider";
import { FundingProgress } from "@/components/FundingProgress";
import { SponsorButton } from "@/components/SponsorButton";

/**
 * The hero.
 *
 * Four lines, in this order: what is on offer, where it is going, what it
 * costs, and the button. Someone arriving from a cold email has about ten
 * seconds, and the headline has to spend them on the offer rather than on an
 * introduction or an appeal.
 *
 * The copy is deliberately not written as fundraising. Nobody is being asked
 * for money toward a goal here — a company is being offered a physical
 * placement at a price. The $3,000 is on the funding bar underneath, where a
 * number belongs, and it does not need a sentence pleading for it.
 */
export function Hero() {
  const { stats } = useCampaign();

  return (
    <header className="hero" id="top">
      <p className="eyebrow">
        <span className="dot" aria-hidden="true" />
        Independent sponsorship project
        <span className="eyebrow-sep" aria-hidden="true">
          ·
        </span>
        <span className="tnum">{stats.available}</span> of {stats.total} placements
        open
      </p>

      <h1>Your brand, on my case.</h1>

      <p className="lede">
        Your logo travels on the hardest-working object in tech: a developer&rsquo;s
        carry-on. {TRIP.to}, for {TRIP.event}
        {TRIP.date ? `, ${TRIP.date}` : ""}. Placements from{" "}
        {formatUsd(TIER_BY_ID.SUPPORTER.priceUsd)}.
      </p>

      <p className="disclosure-chip">{TRIP.disclosure}</p>

      <div className="hero-actions">
        <SponsorButton source="hero">Sponsor the trip</SponsorButton>
        <a className="link-blue" href="#case">
          See the case ›
        </a>
      </div>

      <FundingProgress />
    </header>
  );
}
