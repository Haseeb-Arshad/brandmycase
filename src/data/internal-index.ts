/**
 * FUTURE / DISABLED IN THE FOUNDING EDITION — internal placement index.
 *
 * The relative price ladder from the retired auction phase, kept as a record
 * of how the twenty placements were originally weighted against each other.
 *
 * WHY IT IS IN ITS OWN FILE
 * -------------------------
 * `src/data/placements.ts` is imported by client components — the 3D scene
 * needs the geometry and the face labels — so everything in it is compiled
 * into the browser bundle. Values here are not rendered anywhere, but a number
 * sitting beside "The Crown" in a JavaScript chunk is still a number a curious
 * sponsor can find and read as a price. So they live here instead, imported
 * only by `src/lib/auction.ts`, which is server-only and dormant.
 *
 * These are NOT Founding Edition prices. Founding Edition terms are agreed per
 * sponsorship, in conversation, and are never published on the site.
 *
 * If you are re-enabling payments, read docs/12-founding-edition-launch.md
 * before treating any figure here as current.
 */

export const INTERNAL_PLACEMENT_INDEX_USD: Record<string, number> = {
  "01": 48000,
  "02": 36000,
  "03": 18000,
  "04": 18000,
  "05": 14000,
  "06": 11000,
  "07": 10000,
  "08": 16000,
  "09": 13000,
  "10": 8000,
  "11": 20000,
  "12": 15000,
  "13": 11000,
  "14": 8000,
  "15": 10000,
  "16": 16000,
  "17": 13000,
  "18": 8000,
  "19": 22000,
  "20": 12000,
};

/** Falls back rather than throwing: a missing index must not break a build. */
export function internalIndexFor(placementId: string): number {
  return INTERNAL_PLACEMENT_INDEX_USD[placementId] ?? 0;
}
