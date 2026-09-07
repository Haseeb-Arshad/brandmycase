/**
 * The sponsorship model.
 *
 * One file owns the commercial shape of this campaign: what a sponsorship
 * costs, which physical panels belong to which tier, and what the campaign is
 * trying to raise. Components read tiers from here and never hard-code a
 * price, so changing the offer is an edit to this file rather than a search
 * through the interface.
 *
 * The physical map — where each panel sits on the shell and how big it prints
 * — stays in `src/data/placements.ts`. This file layers commerce on top of it
 * and never touches the geometry.
 *
 * THE ARITHMETIC
 * --------------
 * One Anchor at $1,000 plus four Partners at $500 is exactly the $3,000 goal.
 * That is deliberate: the campaign is fundable by five companies, and the
 * fifteen Supporter placements exist so a smaller company can still take part
 * rather than to inflate the ceiling. `tests/sponsorship-config.test.ts` holds
 * that arithmetic in place.
 */

import { PLACEMENTS } from "@/data/placements";

/** What the trip needs, in whole US dollars. */
export const CAMPAIGN_GOAL_USD = 3000;

export type TierId = "ANCHOR" | "PARTNER" | "SUPPORTER";

export interface Tier {
  id: TierId;
  /** Short label used on panels and chips. */
  label: string;
  /** Full name used in package cards and the form. */
  name: string;
  priceUsd: number;
  /** One line under the price. */
  summary: string;
  /** What this tier gets, over and above the base deliverables. */
  includes: string[];
  /** Physical panels reserved for this tier, by placement id. */
  panelIds: string[];
}

/**
 * Tier order is presentation order everywhere: Anchor first.
 *
 * Panel assignments follow visibility. The medallion is the single most
 * photographed surface on the case, so it is the Anchor placement. The four
 * crowns and the back field carry the object in wide shots, so they are the
 * Partner placements. Everything else is a Supporter placement.
 */
export const TIERS: Tier[] = [
  {
    id: "ANCHOR",
    label: "Anchor",
    name: "Anchor sponsor",
    priceUsd: 1000,
    summary: "The centre plate of the case. One company only.",
    includes: [
      "The largest placement on the front face",
      "Named first wherever sponsors are listed",
      "Your logo in the hero photograph of the finished case",
    ],
    panelIds: ["02"],
  },
  {
    id: "PARTNER",
    label: "Partner",
    name: "Partner sponsor",
    priceUsd: 500,
    summary: "A full-width band or field on one of the case's main faces.",
    includes: [
      "A high-visibility placement on the front, back or lid",
      "Named in the sponsor list and in trip updates",
    ],
    panelIds: ["01", "11", "19", "12"],
  },
  {
    id: "SUPPORTER",
    label: "Supporter",
    name: "Supporting sponsor",
    priceUsd: 250,
    summary: "A smaller placement on a spine, rail or tile.",
    includes: ["A placement on the case", "Named in the sponsor list"],
    // Everything not claimed by a larger tier. Derived rather than typed out,
    // so a new panel cannot silently end up in no tier at all.
    panelIds: PLACEMENTS.map((p) => p.id).filter(
      (id) => !["02", "01", "11", "19", "12"].includes(id),
    ),
  },
];

export const TIER_BY_ID: Record<TierId, Tier> = Object.fromEntries(
  TIERS.map((tier) => [tier.id, tier]),
) as Record<TierId, Tier>;

export const TIER_IDS: TierId[] = TIERS.map((tier) => tier.id);

/** panel id -> tier id. Built once; every lookup goes through it. */
export const PANEL_TIER: Record<string, TierId> = Object.fromEntries(
  TIERS.flatMap((tier) => tier.panelIds.map((id) => [id, tier.id])),
);

export function tierForPanel(panelId: string): Tier | null {
  const id = PANEL_TIER[panelId];
  return id ? TIER_BY_ID[id] : null;
}

export function isTierId(value: unknown): value is TierId {
  return typeof value === "string" && value in TIER_BY_ID;
}

/**
 * What sponsorship at every tier would raise if the whole case sold. Not
 * displayed anywhere — it exists so a test can prove the goal is reachable
 * without over-selling the object.
 */
export function maximumRaiseUsd(): number {
  return TIERS.reduce((sum, tier) => sum + tier.priceUsd * tier.panelIds.length, 0);
}

/** "$1,000" */
export function formatUsd(amountUsd: number): string {
  return "$" + Math.round(amountUsd).toLocaleString("en-US");
}
