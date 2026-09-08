import { readFileSync } from "node:fs";
import { describe, it, expect, beforeEach } from "vitest";
import { sponsorshipInquirySchema, fieldErrors } from "@/lib/validation";
import { SPONSORSHIP_STATUSES, INITIAL_STATUS } from "@/lib/sponsorship";
import { PLACEMENTS } from "@/data/placements";
import { TIERS, TIER_IDS } from "@/data/sponsorship";
import { rateLimit, resetRateLimits, clientKey } from "@/lib/rate-limit";

/**
 * The sponsorship form is the only way a stranger can write to this
 * application, so its schema is the security boundary. These tests check the
 * boundary rather than the happy path: what it refuses, what it normalises,
 * and what it refuses to let through even when the browser insists.
 */

const valid = {
  tier: "PARTNER",
  company: "Northbeam Labs",
  contactName: "Sam Okafor",
  contactEmail: "Partnerships@Northbeam.example ",
  companyUrl: "northbeam.example",
  acknowledged: true as const,
};

describe("sponsorship inquiry schema", () => {
  it("accepts a minimal inquiry and normalises what it stores", () => {
    const parsed = sponsorshipInquirySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    // Email is trimmed and lower-cased so the per-address window in
    // `createSponsorshipInquiry` cannot be walked around with capitals.
    expect(parsed.data.contactEmail).toBe("partnerships@northbeam.example");
    // A bare domain is a URL people type; it is stored as an absolute one.
    expect(parsed.data.companyUrl).toBe("https://northbeam.example");
    expect(parsed.data.placementId).toBeUndefined();
    expect(parsed.data.socialUrl).toBeUndefined();
  });

  it("accepts every tier the site offers, and nothing else", () => {
    for (const tier of TIER_IDS) {
      expect(
        sponsorshipInquirySchema.safeParse({ ...valid, tier }).success,
        `tier ${tier} was rejected`,
      ).toBe(true);
    }

    for (const bad of ["PLATINUM", "anchor", "", 1000, null]) {
      expect(
        sponsorshipInquirySchema.safeParse({ ...valid, tier: bad }).success,
        `tier ${String(bad)} was accepted`,
      ).toBe(false);
    }
  });

  it("accepts every placement id in the panel map, and nothing else", () => {
    for (const placement of PLACEMENTS) {
      const parsed = sponsorshipInquirySchema.safeParse({
        ...valid,
        placementId: placement.id,
      });
      expect(parsed.success, `placement ${placement.id} was rejected`).toBe(true);
    }

    for (const bad of ["00", "21", "1", "01 ", "'; drop table --"]) {
      const parsed = sponsorshipInquirySchema.safeParse({ ...valid, placementId: bad });
      expect(parsed.success, `placement "${bad}" was accepted`).toBe(false);
    }

    // No panel preference is a valid answer, not a validation error.
    const blank = sponsorshipInquirySchema.safeParse({ ...valid, placementId: "" });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.placementId).toBeUndefined();
  });

  it("requires a real email address", () => {
    for (const bad of ["", "nobody", "nobody@", "@example.com", "a b@example.com"]) {
      const parsed = sponsorshipInquirySchema.safeParse({ ...valid, contactEmail: bad });
      expect(parsed.success, `email "${bad}" was accepted`).toBe(false);
    }
  });

  it("requires a company, a person and a website", () => {
    for (const field of ["company", "contactName", "companyUrl"] as const) {
      expect(
        sponsorshipInquirySchema.safeParse({ ...valid, [field]: "" }).success,
        `${field} was allowed to be blank`,
      ).toBe(false);
    }
  });

  it("refuses a website that is not a website", () => {
    for (const bad of ["localhost", "not a url", "ftp://files.example", "https://"]) {
      expect(
        sponsorshipInquirySchema.safeParse({ ...valid, companyUrl: bad }).success,
        `company url "${bad}" was accepted`,
      ).toBe(false);
    }

    const parsed = sponsorshipInquirySchema.safeParse({
      ...valid,
      socialUrl: "linkedin.com/in/somebody",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.socialUrl).toBe("https://linkedin.com/in/somebody");
    }
  });

  it("caps every string so one inquiry cannot carry a megabyte", () => {
    const long = "x".repeat(5000);
    for (const field of ["company", "contactName", "message"] as const) {
      expect(
        sponsorshipInquirySchema.safeParse({ ...valid, [field]: long }).success,
        `${field} accepted 5000 characters`,
      ).toBe(false);
    }
    expect(
      sponsorshipInquirySchema.safeParse({
        ...valid,
        companyUrl: "https://a.example/" + long,
      }).success,
    ).toBe(false);
  });

  it("refuses an inquiry that has not acknowledged what it is", () => {
    for (const bad of [false, undefined, "true", 1]) {
      const parsed = sponsorshipInquirySchema.safeParse({ ...valid, acknowledged: bad });
      expect(parsed.success, `acknowledged ${String(bad)} was accepted`).toBe(false);
    }
  });

  it("rejects anything that fills the honeypot", () => {
    expect(
      sponsorshipInquirySchema.safeParse({ ...valid, companyFax: "+1 555 0100" }).success,
    ).toBe(false);

    // An empty honeypot is what a person sends, and it must not become a field.
    const clean = sponsorshipInquirySchema.safeParse({ ...valid, companyFax: "" });
    expect(clean.success).toBe(true);
    if (clean.success) expect(clean.data.companyFax).toBeUndefined();
  });

  it("lets a company offer more than the tier price", () => {
    for (const [input, expected] of [
      [750, 750],
      ["750", 750],
      ["1,500", 1500],
      [" $3,000 ", 3000],
    ] as const) {
      const parsed = sponsorshipInquirySchema.safeParse({
        ...valid,
        proposedAmountUsd: input,
      });
      expect(parsed.success, `offer ${String(input)} was rejected`).toBe(true);
      if (parsed.success) expect(parsed.data.proposedAmountUsd).toBe(expected);
    }

    // Omitting it means "the tier price", which is the common case.
    const bare = sponsorshipInquirySchema.safeParse(valid);
    expect(bare.success).toBe(true);
    if (bare.success) expect(bare.data.proposedAmountUsd).toBeUndefined();
  });

  it("refuses an offer below the price of the tier being bought", () => {
    // The tier is what buys the panel. "The Anchor placement for $50" is not a
    // negotiation, it is a misunderstanding — and the browser must not be the
    // thing that decides.
    const low = sponsorshipInquirySchema.safeParse({
      ...valid,
      tier: "ANCHOR",
      proposedAmountUsd: 50,
    });
    expect(low.success).toBe(false);
    if (!low.success) {
      expect(fieldErrors(low.error).proposedAmountUsd).toMatch(/\$1,000/);
    }

    // Exactly the tier price is fine; a penny under it is not.
    expect(
      sponsorshipInquirySchema.safeParse({ ...valid, tier: "PARTNER", proposedAmountUsd: 500 })
        .success,
    ).toBe(true);
    expect(
      sponsorshipInquirySchema.safeParse({ ...valid, tier: "PARTNER", proposedAmountUsd: 499 })
        .success,
    ).toBe(false);
  });

  it("refuses an offer that is not whole dollars", () => {
    for (const bad of [0, -100, 250.5, "lots", "", "1e9999", 2_000_000]) {
      expect(
        sponsorshipInquirySchema.safeParse({ ...valid, proposedAmountUsd: bad }).success,
        `offer ${String(bad)} was accepted`,
      ).toBe(false);
    }
  });

  it("has no field through which money or a status could be submitted", () => {
    // These are the fields that decide what the public page says about funding
    // and about who sponsored what. Zod strips unknown keys, so a client cannot
    // smuggle any of them into the row.
    const parsed = sponsorshipInquirySchema.safeParse({
      ...valid,
      amountUsd: 3000,
      status: "CONFIRMED",
      displayName: "Northbeam Labs",
      displayPermission: true,
      confirmedAt: "2026-09-01T00:00:00Z",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const keys = Object.keys(parsed.data);
    for (const forbidden of [
      // `proposedAmountUsd` IS submittable — it is what a company offers. The
      // fields below are not: they are what the owner records once money has
      // actually arrived, and they are what the public page reads.
      "amountUsd",
      "status",
      "displayName",
      "displayPermission",
      "confirmedAt",
    ]) {
      expect(keys, `a client could set ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("reports one message per field for the form to render inline", () => {
    const parsed = sponsorshipInquirySchema.safeParse({
      tier: "PLATINUM",
      company: "N",
      contactName: "",
      contactEmail: "nope",
      companyUrl: "",
      acknowledged: false,
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(Object.keys(fieldErrors(parsed.error)).sort()).toEqual([
      "acknowledged",
      "company",
      "companyUrl",
      "contactEmail",
      "contactName",
      "tier",
    ]);
  });
});

describe("sponsorship lifecycle", () => {
  it("starts every inquiry as INTERESTED", () => {
    expect(INITIAL_STATUS).toBe("INTERESTED");
    expect(SPONSORSHIP_STATUSES).toContain("INTERESTED");
  });

  it("keeps CONFIRMED as its own step, after invoicing", () => {
    expect(SPONSORSHIP_STATUSES).toEqual([
      "INTERESTED",
      "CONTACTED",
      "INVOICED",
      "CONFIRMED",
      "DECLINED",
      "CANCELLED",
    ]);
  });
});

describe("the migration and the application agree", () => {
  // The Postgres CHECK constraints and the TypeScript unions are two
  // independent copies of the same lists. If one drifts, a valid submission
  // starts failing at the database with a 503 the user cannot act on — so read
  // the migration itself rather than trusting that both were updated together.
  const sql = readFileSync(
    "supabase/migrations/20260908000000_sponsorship_campaign.sql",
    "utf8",
  );

  it("accepts every status the application can write", () => {
    for (const status of SPONSORSHIP_STATUSES) {
      expect(sql, `status ${status} is missing from the CHECK constraint`).toContain(
        `'${status}'`,
      );
    }
    expect(sql).toContain("set default 'INTERESTED'");
  });

  it("accepts every tier the application can write", () => {
    for (const tier of TIERS) {
      expect(sql, `tier ${tier.id} is missing from the CHECK constraint`).toContain(
        `'${tier.id}'`,
      );
    }
  });

  it("caps columns at least as loosely as the schema does", () => {
    // A column shorter than the schema allows would turn a valid submission
    // into a database error.
    expect(sql).toContain("between 2 and 120"); // company
    expect(sql).toContain("length(contact_email) <= 200");
    expect(sql).toContain("length(contact_name) <= 120");
    expect(sql).toContain("length(message) <= 2000");
    expect(sql).toContain("length(company_url) <= 200");
  });

  it("makes it impossible for two sponsors to confirm on one panel", () => {
    expect(sql).toContain("create unique index");
    expect(sql).toContain("where status = 'CONFIRMED' and placement_id is not null");
  });

  it("keeps what was offered separate from what was paid", () => {
    // Two columns, on purpose. One is written by strangers; one is what the
    // funding bar sums.
    const offer = readFileSync(
      "supabase/migrations/20260909000000_proposed_amount.sql",
      "utf8",
    );
    expect(offer).toContain("proposed_amount_usd");
    expect(offer).toContain("sponsorship_requests_proposed_amount_check");
    // It must never be introduced as a replacement for amount_usd.
    expect(offer).not.toMatch(/drop column\s+.*amount_usd/i);
  });

  it("refuses a confirmed sponsorship with no amount behind it", () => {
    // The funding bar sums confirmed rows. A confirmed row with a null amount
    // would be a sponsor on the page funding nothing.
    expect(sql).toContain("sponsorship_requests_confirmed_complete_check");
    expect(sql).toContain("amount_usd is not null and amount_usd > 0");
  });

  it("keeps the table server-only", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on table public.sponsorship_requests from public, anon, authenticated");
    expect(sql).not.toMatch(/create policy/i);
  });
});

describe("rate limiting", () => {
  beforeEach(() => resetRateLimits());

  it("allows a burst and then refuses, with a retry hint", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 60_000, 1000).allowed).toBe(true);
    }
    const blocked = rateLimit("k", 3, 60_000, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("forgets hits once the window has passed", () => {
    expect(rateLimit("k", 1, 60_000, 1000).allowed).toBe(true);
    expect(rateLimit("k", 1, 60_000, 2000).allowed).toBe(false);
    expect(rateLimit("k", 1, 60_000, 70_000).allowed).toBe(true);
  });

  it("keeps separate clients separate", () => {
    expect(rateLimit("a", 1, 60_000, 1000).allowed).toBe(true);
    expect(rateLimit("b", 1, 60_000, 1000).allowed).toBe(true);
  });

  it("reads a client key from proxy headers, falling back to unknown", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.4, 70.41.3.18" }))).toBe(
      "203.0.113.4",
    );
    expect(clientKey(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
