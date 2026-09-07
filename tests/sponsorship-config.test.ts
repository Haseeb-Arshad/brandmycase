import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_GOAL_USD,
  PANEL_TIER,
  TIERS,
  TIER_BY_ID,
  formatUsd,
  isTierId,
  maximumRaiseUsd,
  tierForPanel,
} from "@/data/sponsorship";
import { PLACEMENTS } from "@/data/placements";

/**
 * The offer, held in place.
 *
 * These are cheap tests for an expensive mistake: a panel in no tier (so it
 * renders with a price nobody set), a panel in two tiers, or a goal that
 * cannot be reached by the packages actually being sold.
 */

describe("sponsorship tiers", () => {
  it("prices the campaign at $3,000", () => {
    expect(CAMPAIGN_GOAL_USD).toBe(3000);
  });

  it("offers exactly three tiers, most expensive first", () => {
    expect(TIERS.map((t) => t.id)).toEqual(["ANCHOR", "PARTNER", "SUPPORTER"]);
    expect(TIERS.map((t) => t.priceUsd)).toEqual([1000, 500, 250]);
  });

  it("puts every panel in exactly one tier", () => {
    const assigned = TIERS.flatMap((tier) => tier.panelIds);
    expect(assigned).toHaveLength(PLACEMENTS.length);
    expect(new Set(assigned).size).toBe(PLACEMENTS.length);

    for (const placement of PLACEMENTS) {
      expect(
        tierForPanel(placement.id),
        `placement ${placement.id} belongs to no tier`,
      ).not.toBeNull();
      expect(PANEL_TIER[placement.id]).toBeTruthy();
    }
  });

  it("assigns no tier to a panel that does not exist", () => {
    expect(tierForPanel("99")).toBeNull();
    expect(tierForPanel("")).toBeNull();
  });

  it("keeps the anchor exclusive and the partner tier small", () => {
    expect(TIER_BY_ID.ANCHOR.panelIds).toEqual(["02"]);
    expect(TIER_BY_ID.PARTNER.panelIds).toHaveLength(4);
  });

  it("reaches the goal on one anchor plus the partner tier", () => {
    // The campaign has to be fundable by about five companies. If this ever
    // fails, either the goal moved or the packages did, and the homepage is
    // promising a number the offer cannot deliver.
    const anchorPlusPartners =
      TIER_BY_ID.ANCHOR.priceUsd +
      TIER_BY_ID.PARTNER.priceUsd * TIER_BY_ID.PARTNER.panelIds.length;

    expect(anchorPlusPartners).toBe(CAMPAIGN_GOAL_USD);
    expect(maximumRaiseUsd()).toBeGreaterThanOrEqual(CAMPAIGN_GOAL_USD);
  });

  it("describes every tier without promising an outcome", () => {
    const forbidden =
      /guarantee|impressions|reach|audience|exclusive access|official|OpenAI|DevDay/i;

    for (const tier of TIERS) {
      expect(tier.summary).toBeTruthy();
      expect(tier.includes.length).toBeGreaterThan(0);
      for (const line of [tier.summary, ...tier.includes]) {
        expect(line, `tier ${tier.id} promises something it cannot control`).not.toMatch(
          forbidden,
        );
      }
    }
  });

  it("recognises its own tier ids and nothing else", () => {
    expect(isTierId("ANCHOR")).toBe(true);
    expect(isTierId("anchor")).toBe(false);
    expect(isTierId("PLATINUM")).toBe(false);
    expect(isTierId(undefined)).toBe(false);
    expect(isTierId(1000)).toBe(false);
  });

  it("formats money the way the page reads it", () => {
    expect(formatUsd(1000)).toBe("$1,000");
    expect(formatUsd(250)).toBe("$250");
    expect(formatUsd(0)).toBe("$0");
  });
});
