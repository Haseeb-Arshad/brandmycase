import { describe, it, expect } from "vitest";
import {
  summariseFunding,
  publicSponsors,
  safeUrl,
  type ConfirmedSponsorship,
} from "@/lib/funding";
import { CAMPAIGN_GOAL_USD } from "@/data/sponsorship";

/**
 * The funding bar is the single most inflatable thing on this site, so its
 * arithmetic is tested as a boundary rather than as a calculation: what counts,
 * what does not, and what may be said out loud about a sponsor.
 */

const row = (over: Partial<ConfirmedSponsorship> = {}): ConfirmedSponsorship => ({
  id: "row",
  placementId: "02",
  tier: "ANCHOR",
  amountUsd: 1000,
  displayName: null,
  displayLogoUrl: null,
  companyUrl: null,
  displayPermission: false,
  confirmedAt: null,
  ...over,
});

describe("funding totals", () => {
  it("reports an honest zero with no sponsors", () => {
    const funding = summariseFunding([]);
    expect(funding.raisedUsd).toBe(0);
    expect(funding.confirmedCount).toBe(0);
    expect(funding.percentFunded).toBe(0);
    expect(funding.goalUsd).toBe(CAMPAIGN_GOAL_USD);
    expect(funding.remainingUsd).toBe(CAMPAIGN_GOAL_USD);
  });

  it("sums confirmed amounts and counts confirmed sponsors", () => {
    const funding = summariseFunding([
      row({ id: "a", amountUsd: 1000 }),
      row({ id: "b", amountUsd: 500, tier: "PARTNER", placementId: "01" }),
      row({ id: "c", amountUsd: 250, tier: "SUPPORTER", placementId: "06" }),
    ]);

    expect(funding.raisedUsd).toBe(1750);
    expect(funding.confirmedCount).toBe(3);
    expect(funding.remainingUsd).toBe(1250);
    expect(funding.percentFunded).toBe(58);
  });

  it("reaches the goal on one anchor and four partners", () => {
    const funding = summariseFunding([
      row({ id: "a", amountUsd: 1000 }),
      ...["01", "11", "19", "12"].map((placementId, i) =>
        row({ id: `p${i}`, amountUsd: 500, tier: "PARTNER", placementId }),
      ),
    ]);

    expect(funding.raisedUsd).toBe(CAMPAIGN_GOAL_USD);
    expect(funding.percentFunded).toBe(100);
    expect(funding.remainingUsd).toBe(0);
  });

  it("never reports more than 100 per cent, however well it goes", () => {
    const funding = summariseFunding([row({ amountUsd: 9000 })]);
    expect(funding.percentFunded).toBe(100);
    expect(funding.remainingUsd).toBe(0);
    // The raised figure itself is not clamped — that would be a lie in the
    // other direction.
    expect(funding.raisedUsd).toBe(9000);
  });

  it("ignores a nonsensical amount rather than letting it move the bar", () => {
    const funding = summariseFunding([
      row({ id: "a", amountUsd: 500 }),
      row({ id: "b", amountUsd: -400 }),
      row({ id: "c", amountUsd: Number.NaN }),
    ]);
    expect(funding.raisedUsd).toBe(500);
  });

  it("ignores what a company offered, and counts only what was agreed", () => {
    // `proposed_amount_usd` is typed into a public form by somebody who has not
    // been invoiced and has paid nothing. If it could reach this sum, anyone
    // with a fetch call could move the number on the homepage. The read in
    // `readConfirmedSponsorships` does not even select the column, so the only
    // way this could regress is somebody adding it to ConfirmedSponsorship —
    // which is exactly what this test is here to catch.
    const rows = [row({ amountUsd: 500 })] as (ConfirmedSponsorship &
      Record<string, unknown>)[];
    rows[0].proposedAmountUsd = 3000;
    rows[0].proposed_amount_usd = 3000;

    expect(summariseFunding(rows).raisedUsd).toBe(500);
  });

  it("carries the degraded flag through so a failed read is never a claim", () => {
    expect(summariseFunding([], CAMPAIGN_GOAL_USD, true).degraded).toBe(true);
    expect(summariseFunding([]).degraded).toBe(false);
  });
});

describe("naming sponsors in public", () => {
  it("names nobody without explicit permission", () => {
    const sponsors = publicSponsors([
      row({ displayName: "Northbeam Labs", displayPermission: false }),
    ]);
    expect(sponsors).toEqual([]);
  });

  it("names nobody who has permission but no display name", () => {
    // A confirmed row with permission ticked and the name still blank is a
    // half-filled record, not an anonymous sponsor to render as "".
    const sponsors = publicSponsors([row({ displayName: null, displayPermission: true })]);
    expect(sponsors).toEqual([]);
  });

  it("names a sponsor who agreed, with their tier", () => {
    const sponsors = publicSponsors([
      row({
        displayName: "Northbeam Labs",
        displayPermission: true,
        companyUrl: "https://northbeam.example",
        displayLogoUrl: "https://cdn.example/logo.svg",
      }),
    ]);

    expect(sponsors).toEqual([
      {
        name: "Northbeam Labs",
        tier: "ANCHOR",
        tierLabel: "Anchor",
        url: "https://northbeam.example/",
        logoUrl: "https://cdn.example/logo.svg",
      },
    ]);
  });

  it("refuses a link that is not http or https", () => {
    // These values are typed by hand into a database by a tired person. A
    // javascript: URL must not be able to become an href on a public page.
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl(null)).toBeNull();
    expect(safeUrl("https://example.com/logo.png")).toBe("https://example.com/logo.png");

    const sponsors = publicSponsors([
      row({
        displayName: "Northbeam Labs",
        displayPermission: true,
        companyUrl: "javascript:alert(1)",
      }),
    ]);
    expect(sponsors[0].url).toBeNull();
  });
});
