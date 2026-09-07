import { CAMPAIGN_GOAL_USD, TIER_BY_ID, isTierId, type TierId } from "@/data/sponsorship";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { buildPlacementBoard, type PlacementBoard } from "@/lib/placement-board";

/**
 * Funding state.
 *
 * ONE RULE RUNS THIS FILE: only a CONFIRMED sponsorship with a real amount
 * counts. An inquiry does not count. A sent invoice does not count. A panel
 * somebody is talking about does not count. The progress bar on the homepage
 * is a claim about money that has actually been agreed, and it is the easiest
 * thing on the site to quietly inflate, so the filter lives in one pure
 * function that a test can hold down.
 *
 * The second rule: when the database cannot be reached, the campaign reports
 * zero and says so internally (`degraded`). Understating is survivable.
 * Guessing is not.
 */

export interface ConfirmedSponsorship {
  id: string;
  placementId: string | null;
  tier: TierId;
  amountUsd: number;
  /** Owner-entered display name. Absent means "do not name them". */
  displayName: string | null;
  displayLogoUrl: string | null;
  companyUrl: string | null;
  /** Has the sponsor agreed to be named publicly? */
  displayPermission: boolean;
  confirmedAt: string | null;
}

/** What the browser is allowed to know about a sponsor. */
export interface PublicSponsor {
  name: string;
  tier: TierId;
  tierLabel: string;
  url: string | null;
  logoUrl: string | null;
}

export interface FundingState {
  goalUsd: number;
  raisedUsd: number;
  remainingUsd: number;
  /** 0-100, clamped. */
  percentFunded: number;
  confirmedCount: number;
  /** True when the read failed and the figures are a floor, not a total. */
  degraded: boolean;
}

/** Only http(s) links reach an href. Cheap, and it never has to be revisited. */
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Sum confirmed sponsorships into the numbers the hero renders.
 *
 * Pure, so the arithmetic is testable without a database, and total by
 * construction: the caller decides what "confirmed" means once, at the query.
 */
export function summariseFunding(
  confirmed: ConfirmedSponsorship[],
  goalUsd: number = CAMPAIGN_GOAL_USD,
  degraded = false,
): FundingState {
  const raisedUsd = confirmed.reduce(
    (sum, row) => sum + (Number.isFinite(row.amountUsd) && row.amountUsd > 0 ? row.amountUsd : 0),
    0,
  );

  return {
    goalUsd,
    raisedUsd,
    remainingUsd: Math.max(0, goalUsd - raisedUsd),
    percentFunded: goalUsd > 0 ? Math.min(100, Math.round((raisedUsd / goalUsd) * 100)) : 0,
    confirmedCount: confirmed.length,
    degraded,
  };
}

/**
 * The sponsors the site may name.
 *
 * A confirmed sponsorship is not permission to publish a company's name. Only
 * rows with `displayPermission` and a display name are returned, so the
 * default for a sponsor nobody has asked is silence.
 */
export function publicSponsors(confirmed: ConfirmedSponsorship[]): PublicSponsor[] {
  return confirmed
    .filter((row) => row.displayPermission && row.displayName)
    .map((row) => ({
      name: row.displayName as string,
      tier: row.tier,
      tierLabel: TIER_BY_ID[row.tier]?.label ?? row.tier,
      url: safeUrl(row.companyUrl),
      logoUrl: safeUrl(row.displayLogoUrl),
    }));
}

interface ConfirmedRow {
  id: string;
  placement_id: string | null;
  tier: string | null;
  amount_usd: number | null;
  display_name: string | null;
  display_logo_url: string | null;
  company_url: string | null;
  display_permission: boolean | null;
  confirmed_at: string | null;
}

/**
 * Map a database row to a confirmed sponsorship, or drop it.
 *
 * A CONFIRMED row with no amount or an unknown tier is a data-entry mistake.
 * It is skipped rather than counted as zero-and-displayed, so a half-filled
 * row cannot put an unnamed sponsor on the page or a wrong count in the hero.
 */
function toConfirmed(row: ConfirmedRow): ConfirmedSponsorship | null {
  if (!isTierId(row.tier)) return null;
  const amount = Number(row.amount_usd);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: row.id,
    placementId: row.placement_id,
    tier: row.tier,
    amountUsd: Math.round(amount),
    displayName: row.display_name,
    displayLogoUrl: row.display_logo_url,
    companyUrl: row.company_url,
    displayPermission: row.display_permission === true,
    confirmedAt: row.confirmed_at,
  };
}

/**
 * Read every confirmed sponsorship.
 *
 * Selects the display columns and nothing else — no contact email, no
 * message, no internal note ever leaves the database on this path, so there
 * is no way for one to reach a server component and then a rendered page.
 *
 * Returns an empty list when Supabase is not configured, which is what makes
 * the site runnable with no credentials at all.
 */
export async function readConfirmedSponsorships(): Promise<{
  confirmed: ConfirmedSponsorship[];
  degraded: boolean;
}> {
  if (!supabaseConfigured()) return { confirmed: [], degraded: false };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("sponsorship_requests")
      .select(
        "id, placement_id, tier, amount_usd, display_name, display_logo_url, company_url, display_permission, confirmed_at",
      )
      .eq("status", "CONFIRMED")
      .order("confirmed_at", { ascending: true });

    if (error) {
      console.error("[funding] confirmed sponsorship read failed", error);
      return { confirmed: [], degraded: true };
    }

    const rows = (data ?? []) as unknown as ConfirmedRow[];
    return { confirmed: rows.map(toConfirmed).filter((r): r is ConfirmedSponsorship => r !== null), degraded: false };
  } catch (error) {
    console.error("[funding] confirmed sponsorship read threw", error);
    return { confirmed: [], degraded: true };
  }
}

export interface CampaignSnapshot {
  board: PlacementBoard;
  funding: FundingState;
  sponsors: PublicSponsor[];
}

/**
 * Everything the homepage needs, from one query.
 *
 * The board and the funding bar are two views of the same set of confirmed
 * rows, so they are read together and can never disagree about how many
 * sponsors there are.
 */
export async function getCampaignSnapshot(): Promise<CampaignSnapshot> {
  const { confirmed, degraded } = await readConfirmedSponsorships();
  return {
    board: buildPlacementBoard(confirmed),
    funding: summariseFunding(confirmed, CAMPAIGN_GOAL_USD, degraded),
    sponsors: publicSponsors(confirmed),
  };
}
