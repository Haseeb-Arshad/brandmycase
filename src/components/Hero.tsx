"use client";

import { formatUsd, CAMPAIGN_GOAL_USD, TIER_BY_ID } from "@/data/sponsorship";
import { TRIP } from "@/data/site";
import { FundingProgress } from "@/components/FundingProgress";
import { SponsorButton } from "@/components/SponsorButton";

/**
 * The hero.
 *
 * Someone arriving from a cold email has about ten seconds. In that time this
 * has to say who I am, what happened, what I need, what it costs and what to
 * click — so the headline carries the offer, the lede carries the facts, and
 * the funding bar carries the proof. No countdown, no urgency device, no
 * statistics that are really just adjectives.
 */
export function Hero() {
  return (
    <header className="hero" id="top">
      <p className="eyebrow">
        <span className="dot" aria-hidden="true" />
        Independent developer sponsorship project
      </p>

      {/* Spans rather than hard breaks: the line break is imposed only where
          there is room for it, so narrow screens wrap naturally. */}
      <h1 className="hero-title">
        <span>I&rsquo;m taking this case to DevDay.</span>{" "}
        <span>Your brand can come with me.</span>
      </h1>

      {/* Trip first, person later. Someone arriving from a cold email wants to
          know what is being offered, not who is offering it — the introduction
          waits until the bottom of the page, where it reads as a signature
          rather than a preamble. */}
      <p className="lede">
        I&rsquo;ve been accepted to attend {TRIP.event} in {TRIP.to}
        {TRIP.date ? ` on ${TRIP.date}` : ""}, and I&rsquo;m raising{" "}
        {formatUsd(CAMPAIGN_GOAL_USD)} to get there from {TRIP.from}. A handful of
        companies can put their logo on the travel case coming with me — from{" "}
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
