import { describe, it, expect } from "vitest";
import {
  depositFor,
  minimumNextBid,
  formatUsd,
  formatUsdCompact,
  toStripeAmount,
  DEPOSIT_MINIMUM_USD,
} from "@/lib/money";

/**
 * Money rules decide who wins a panel and what they are charged, so they are
 * tested at the boundaries rather than the happy path.
 */

describe("depositFor", () => {
  it("takes 20% of the bid", () => {
    expect(depositFor(50_000)).toBe(10_000);
    expect(depositFor(48_000)).toBe(9_600);
  });

  it("rounds up so we never under-collect a dollar", () => {
    // 20% of 1001 is 200.2 — must become 201, not 200.
    expect(depositFor(1001)).toBe(201);
  });

  it("never drops below the floor, however small the bid", () => {
    expect(depositFor(10)).toBe(DEPOSIT_MINIMUM_USD);
    expect(depositFor(1)).toBe(DEPOSIT_MINIMUM_USD);
  });
});

describe("minimumNextBid", () => {
  it("lets the first bidder pay exactly the opening price", () => {
    expect(minimumNextBid(48_000, null)).toBe(48_000);
  });

  it("requires a 5% increment, rounded up to the next $100", () => {
    // 5% of 64,500 is 3,225 -> rounds up to 3,300.
    expect(minimumNextBid(48_000, 64_500)).toBe(67_800);
  });

  it("enforces a $100 floor on the increment so tiny bids cannot ratchet", () => {
    // 5% of 500 is 25, which would allow a $25 raise; the floor lifts it to 100.
    expect(minimumNextBid(500, 500)).toBe(600);
  });

  it("always returns strictly more than the current bid", () => {
    for (const current of [100, 999, 1000, 8_000, 48_000, 1_000_000]) {
      expect(minimumNextBid(100, current)).toBeGreaterThan(current);
    }
  });
});

describe("formatting", () => {
  it("formats full amounts with separators", () => {
    expect(formatUsd(48_000)).toBe("$48,000");
    expect(formatUsd(1_250_000)).toBe("$1,250,000");
  });

  it("compacts to K and M for the 3D panel chips", () => {
    expect(formatUsdCompact(48_000)).toBe("$48K");
    expect(formatUsdCompact(64_500)).toBe("$64.5K");
    expect(formatUsdCompact(1_000_000)).toBe("$1M");
    expect(formatUsdCompact(1_250_000)).toBe("$1.3M");
    expect(formatUsdCompact(750)).toBe("$750");
  });
});

describe("toStripeAmount", () => {
  it("converts whole dollars to cents exactly once", () => {
    expect(toStripeAmount(9_600)).toBe(960_000);
    expect(toStripeAmount(50)).toBe(5_000);
  });
});
