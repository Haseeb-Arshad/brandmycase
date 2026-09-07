/**
 * Campaign mode.
 *
 * The site has two possible commercial shapes and exactly one of them is
 * switched on at a time:
 *
 *   interest  (default, and what the sponsorship campaign runs)
 *             Companies send a non-binding sponsorship inquiry. Nothing is
 *             charged, nothing is reserved automatically, and every payment
 *             surface in the application is off.
 *
 *   auction   (dormant)
 *             The retired bid-and-deposit flow. Kept compiling so a future
 *             version can be brought back deliberately rather than rewritten,
 *             but it cannot be reached unless CAMPAIGN_MODE says so.
 *
 * This module is the only place the switch is read. Everything downstream --
 * the payment mode, the legacy bid endpoint, the checkout return page --
 * derives from it, so there is one lever rather than five.
 */

export type CampaignMode = "interest" | "auction";

export const CAMPAIGN_MODES: CampaignMode[] = ["interest", "auction"];

/**
 * Resolve the campaign mode from a raw environment value.
 *
 * Anything unrecognised, blank or absent falls back to `interest`. Failing
 * closed matters here: a typo in a deployment variable must not be able to
 * turn a payment flow on.
 */
export function resolveCampaignMode(raw: string | undefined): CampaignMode {
  const value = raw?.trim().toLowerCase();
  return value === "auction" ? "auction" : "interest";
}

export const CAMPAIGN_MODE: CampaignMode = resolveCampaignMode(
  process.env.CAMPAIGN_MODE,
);

/** True while the site is running the inquiry-driven sponsorship campaign. */
export function isInterestMode(mode: CampaignMode = CAMPAIGN_MODE): boolean {
  return mode === "interest";
}

/**
 * Are the retired auction endpoints (`/api/bids`, `/api/board`, `/success`)
 * allowed to do anything at all? Only in explicit auction mode.
 */
export function auctionEndpointsEnabled(
  mode: CampaignMode = CAMPAIGN_MODE,
): boolean {
  return mode === "auction";
}
