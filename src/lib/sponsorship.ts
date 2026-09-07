import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { readConfirmedSponsorships } from "@/lib/funding";
import { buildPlacementBoard } from "@/lib/placement-board";
import { TIER_BY_ID, tierForPanel } from "@/data/sponsorship";
import type { SponsorshipInquiryInput } from "@/lib/validation";

/**
 * The sponsorship inquiry service.
 *
 * This is server-only. There is no browser path to the table: the anon and
 * authenticated roles hold no grant on it, RLS is on with no permissive
 * policy, and nothing in the application exposes a GET. Inquiries carry other
 * companies' contact details, so the only way to read them is an authorised
 * Supabase session.
 *
 * WHAT AN INQUIRY DOES NOT DO
 * ---------------------------
 * It does not reserve the panel, it does not count toward funding, and it
 * does not take money. It is written as INTERESTED and moves forward only when
 * the owner moves it by hand:
 *
 *   INTERESTED -> CONTACTED -> INVOICED -> CONFIRMED
 *                                       -> DECLINED / CANCELLED
 *
 * Only CONFIRMED, with an amount, reaches the public site.
 */

export const SPONSORSHIP_STATUSES = [
  "INTERESTED",
  "CONTACTED",
  "INVOICED",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
] as const;

export type SponsorshipStatus = (typeof SPONSORSHIP_STATUSES)[number];

/** The status every inquiry starts in. Nothing else may be written by a form. */
export const INITIAL_STATUS: SponsorshipStatus = "INTERESTED";

/** How many inquiries one email address may send in a rolling window. */
const EMAIL_LIMIT = 5;
const EMAIL_WINDOW_HOURS = 24;

export type CreateInquiryResult =
  | { ok: true; id: string; duplicate: boolean }
  | {
      ok: false;
      reason:
        | "unknown_placement"
        | "unavailable"
        | "tier_mismatch"
        | "rate_limited"
        | "unavailable_storage"
        | "storage";
    };

export async function createSponsorshipInquiry(
  input: SponsorshipInquiryInput,
): Promise<CreateInquiryResult> {
  if (!supabaseConfigured()) {
    // Better to tell a company the form is broken than to accept their
    // details, show a thank-you screen, and drop them on the floor.
    console.error("[sponsorship] inquiry received with no Supabase configured");
    return { ok: false, reason: "unavailable_storage" };
  }

  const tier = TIER_BY_ID[input.tier as keyof typeof TIER_BY_ID];
  if (!tier) return { ok: false, reason: "tier_mismatch" };

  // Panel availability is decided here, against the database, and never by
  // whatever the browser believed when the page was rendered.
  if (input.placementId) {
    const panelTier = tierForPanel(input.placementId);
    if (!panelTier) return { ok: false, reason: "unknown_placement" };
    if (panelTier.id !== tier.id) return { ok: false, reason: "tier_mismatch" };

    const { confirmed, degraded } = await readConfirmedSponsorships();
    if (degraded) return { ok: false, reason: "storage" };

    const placement = buildPlacementBoard(confirmed).placements.find(
      (p) => p.id === input.placementId,
    );
    if (!placement) return { ok: false, reason: "unknown_placement" };
    if (!placement.available) return { ok: false, reason: "unavailable" };
  }

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - EMAIL_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const recent = await supabase
    .from("sponsorship_requests")
    .select("id, placement_id, tier")
    .eq("contact_email", input.contactEmail)
    .gte("created_at", since);

  if (recent.error) {
    console.error("[sponsorship] recent-inquiry lookup failed", recent.error);
    return { ok: false, reason: "storage" };
  }

  const rows = (recent.data ?? []) as Array<{
    id: string;
    placement_id: string | null;
    tier: string | null;
  }>;

  // Somebody re-sending the same request is almost always a double submit or a
  // nervous second try, not abuse. Acknowledge it as received rather than
  // showing an error for something already sitting in the inbox.
  const existing = rows.find(
    (row) =>
      row.tier === input.tier &&
      (row.placement_id ?? null) === (input.placementId ?? null),
  );
  if (existing) return { ok: true, id: existing.id, duplicate: true };

  if (rows.length >= EMAIL_LIMIT) return { ok: false, reason: "rate_limited" };

  const id = crypto.randomUUID();
  const { error } = await supabase.from("sponsorship_requests").insert({
    id,
    tier: tier.id,
    placement_id: input.placementId ?? null,
    company: input.company,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    company_url: input.companyUrl,
    website_url: input.companyUrl,
    social_url: input.socialUrl ?? null,
    message: input.message ?? null,
    status: INITIAL_STATUS,
    // Deliberately not set here: amount_usd, display_name, display_logo_url,
    // display_permission, confirmed_at. Those are the owner's to fill in once
    // an invoice is actually paid.
  });

  if (error) {
    console.error("[sponsorship] insert failed", error);
    return { ok: false, reason: "storage" };
  }

  return { ok: true, id, duplicate: false };
}
