"use client";

import { useOptionalCampaign } from "@/components/CampaignProvider";
import { track } from "@/lib/analytics";
import type { TierId } from "@/data/sponsorship";

/**
 * The one call to action, wherever it appears.
 *
 * Server-rendered sections drop this in rather than becoming client components
 * themselves. Every instance opens the same dialog through the same provider,
 * so there is no second sponsorship path to keep in sync.
 */
export function SponsorButton({
  source,
  tier,
  className = "pill-blue",
  children,
}: {
  /** Which button this is. Analytics only; never stored. */
  source: string;
  tier?: TierId;
  className?: string;
  children: React.ReactNode;
}) {
  const campaign = useOptionalCampaign();

  // Off the campaign page — /terms, /privacy — there is no form to open, so
  // the button becomes what it means: a way back to the sponsorship section.
  if (!campaign) {
    return (
      <a
        className={className}
        href="/#sponsorship"
        onClick={() => track("click_sponsor", { source, ...(tier ? { tier } : {}) })}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        track("click_sponsor", { source, ...(tier ? { tier } : {}) });
        campaign.openSponsorForm({ source, tier: tier ?? null });
      }}
    >
      {children}
    </button>
  );
}
