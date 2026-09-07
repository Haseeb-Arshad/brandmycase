"use client";

import { useEffect } from "react";
import { useCampaign } from "@/components/CampaignProvider";
import { formatUsd } from "@/data/sponsorship";
import { track } from "@/lib/analytics";

/**
 * The three sponsorships.
 *
 * A sponsor picks a tier here, not a panel: three prices is a decision
 * somebody can make in a lift, twenty is a spreadsheet. The panel choice comes
 * afterwards, on the case itself, and it is optional.
 *
 * Availability counts are real. A tier with nothing left says so and cannot be
 * selected, which is the entire value of showing counts at all.
 */
export function Packages() {
  const { tiers, openSponsorForm } = useCampaign();

  useEffect(() => {
    track("view_package", { tiers: tiers.length });
  }, [tiers.length]);

  return (
    <section className="section packages" id="sponsorship">
      <div className="wrap">
        <div className="section-head">
          <p className="section-kicker">Sponsorship</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Three ways to come along.
          </h2>
          <p className="lede">
            {/* Deliberately does not use the word "auction", even to deny one.
                A cold-email visitor has never heard of the previous version of
                this site, and denying a thing introduces it. */}
            Fixed prices, invoiced properly, no negotiation theatre. Pick a tier —
            you can choose the exact panel on the case afterwards.
          </p>
        </div>

        <div className="package-grid">
          {tiers.map((tier) => {
            const soldOut = tier.available === 0;
            return (
              <article className="package" key={tier.id} data-tier={tier.id} data-soldout={soldOut}>
                <header>
                  <p className="package-label">{tier.label}</p>
                  <p className="package-price tnum">{formatUsd(tier.priceUsd)}</p>
                  <p className="package-summary">{tier.summary}</p>
                </header>

                <ul className="package-includes">
                  {tier.includes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>

                <footer>
                  <p className="package-avail" data-soldout={soldOut}>
                    {soldOut
                      ? "All taken for now"
                      : `${tier.available} of ${tier.total} available`}
                  </p>
                  {/* A full tier stays clickable on purpose: "ask about a
                      waitlist" is a real answer, and a dead button is not. */}
                  <button
                    type="button"
                    className="pill-blue"
                    onClick={() => {
                      track("click_sponsor", { source: "package", tier: tier.id });
                      openSponsorForm({ tier: tier.id, source: "package" });
                    }}
                  >
                    {soldOut ? "Ask about a waitlist" : `Sponsor at ${formatUsd(tier.priceUsd)}`}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        <p className="fine-print">
          Prices are in US dollars and are invoiced after I confirm availability. No
          payment is taken on this website. Sponsorship funds the trip and the case;
          it buys a physical placement and the deliverables listed below, and nothing
          else.
        </p>
      </div>
    </section>
  );
}
