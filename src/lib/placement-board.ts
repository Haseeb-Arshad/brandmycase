import {
  PLACEMENTS,
  getPlacement,
  type Placement,
} from "@/data/placements";
import {
  TIERS,
  TIER_BY_ID,
  tierForPanel,
  type TierId,
} from "@/data/sponsorship";
import type { ConfirmedSponsorship } from "@/lib/funding";

/**
 * The placement board — what the 3D case, the panel grid and the sponsorship
 * form all read.
 *
 * It is the physical panel map joined to the sponsorship tiers and then to
 * whatever is actually confirmed in the database. Three inputs, one shape, one
 * place where "is this panel still available?" is decided.
 *
 * WHAT IS ON THIS TYPE IS WHAT REACHES THE BROWSER. `PlacementState` is
 * serialised into the client bundle by the campaign provider, so it carries a
 * price (public), a tier (public) and — only where a sponsor has granted
 * permission — a name. It carries no contact email, no message, no inquiry
 * status and no internal note, because there is no field here for one to
 * travel in.
 */

export type PlacementAvailability = "OPEN" | "HELD" | "SPONSORED";

export const AVAILABILITY_LABELS: Record<PlacementAvailability, string> = {
  OPEN: "Available",
  HELD: "On hold",
  SPONSORED: "Sponsored",
};

export interface PlacementSponsor {
  name: string;
  url: string | null;
  logoUrl: string | null;
}

export interface PlacementState {
  id: string;
  code: string;
  name: string;
  face: Placement["face"];
  description: string;
  sizeLabel: string;
  tier: TierId;
  tierLabel: string;
  priceUsd: number;
  status: PlacementAvailability;
  statusLabel: string;
  /** Can a company still ask for this placement? */
  available: boolean;
  /**
   * The sponsor, only when the placement is confirmed AND they agreed to be
   * named. A confirmed placement with no permission renders as "Reserved".
   */
  sponsor: PlacementSponsor | null;
  /** Face-local geometry, in metres — the 3D scene needs these. */
  u: number;
  v: number;
  w: number;
  h: number;
}

export interface TierAvailability {
  id: TierId;
  label: string;
  name: string;
  priceUsd: number;
  summary: string;
  includes: string[];
  total: number;
  available: number;
}

export interface PlacementBoard {
  placements: PlacementState[];
  tiers: TierAvailability[];
  stats: {
    total: number;
    available: number;
    sponsored: number;
    held: number;
    faces: number;
  };
}

/**
 * Build the board from the confirmed sponsorships.
 *
 * Pure, and takes the confirmed rows as an argument rather than fetching them,
 * so every availability rule in here can be tested against a handful of rows
 * with no database in the room.
 */
export function buildPlacementBoard(
  confirmed: ConfirmedSponsorship[] = [],
): PlacementBoard {
  // A confirmed sponsorship without a panel (a tier bought with no preference)
  // funds the campaign but occupies nothing, so it is not in this map.
  const byPanel = new Map<string, ConfirmedSponsorship>();
  for (const row of confirmed) {
    if (row.placementId) byPanel.set(row.placementId, row);
  }

  const placements = PLACEMENTS.map<PlacementState>((placement) => {
    const tier = tierForPanel(placement.id) ?? TIER_BY_ID.SUPPORTER;
    const sponsorship = byPanel.get(placement.id);

    const status: PlacementAvailability = sponsorship
      ? "SPONSORED"
      : placement.hold === "HELD"
        ? "HELD"
        : "OPEN";

    return {
      id: placement.id,
      code: placement.code,
      name: placement.name,
      face: placement.face,
      description: placement.description,
      sizeLabel: placement.sizeLabel,
      tier: tier.id,
      tierLabel: tier.label,
      priceUsd: tier.priceUsd,
      status,
      statusLabel: AVAILABILITY_LABELS[status],
      available: status === "OPEN",
      sponsor:
        sponsorship && sponsorship.displayPermission && sponsorship.displayName
          ? {
              name: sponsorship.displayName,
              url: sponsorship.companyUrl,
              logoUrl: sponsorship.displayLogoUrl,
            }
          : null,
      u: placement.u,
      v: placement.v,
      w: placement.w,
      h: placement.h,
    };
  });

  const byId = new Map(placements.map((p) => [p.id, p]));

  const tiers = TIERS.map<TierAvailability>((tier) => ({
    id: tier.id,
    label: tier.label,
    name: tier.name,
    priceUsd: tier.priceUsd,
    summary: tier.summary,
    includes: tier.includes,
    total: tier.panelIds.length,
    available: tier.panelIds.filter((id) => byId.get(id)?.available).length,
  }));

  const count = (status: PlacementAvailability) =>
    placements.filter((p) => p.status === status).length;

  return {
    placements,
    tiers,
    stats: {
      total: placements.length,
      available: count("OPEN"),
      sponsored: count("SPONSORED"),
      held: count("HELD"),
      faces: new Set(placements.map((p) => p.face)).size,
    },
  };
}

/**
 * One placement's current state — used server-side to re-check availability
 * when a request arrives. The browser's opinion about what is free is never
 * the one that decides.
 */
export function resolvePlacement(
  id: string,
  confirmed: ConfirmedSponsorship[] = [],
): PlacementState | null {
  if (!getPlacement(id)) return null;
  return buildPlacementBoard(confirmed).placements.find((p) => p.id === id) ?? null;
}
