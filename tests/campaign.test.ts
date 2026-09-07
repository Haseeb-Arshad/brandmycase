import { describe, it, expect } from "vitest";
import {
  resolveCampaignMode,
  auctionEndpointsEnabled,
  isInterestMode,
  CAMPAIGN_MODE,
  type CampaignMode,
} from "@/lib/campaign";
import { resolvePaymentMode, type PaymentMode } from "@/lib/payments";

/**
 * The safety matrix.
 *
 * The failure this project cannot survive is a production visitor being shown
 * a mock payment: a confirmation that money moved when none did. These tests
 * exist to make that outcome impossible to reintroduce by accident, so they
 * are written as an exhaustive sweep rather than a few examples.
 */

const FULL = {
  publicKey: "pk_test",
  secretKey: "sk_test",
  webhookSecret: "wh_test",
};

const NONE = {
  publicKey: undefined,
  secretKey: undefined,
  webhookSecret: undefined,
};

describe("campaign mode", () => {
  it("defaults to interest for anything unrecognised", () => {
    for (const raw of [undefined, "", "  ", "INTEREST", "sponsorship", "AUCTION!", "1"]) {
      expect(resolveCampaignMode(raw), `"${String(raw)}" did not fall back`).toBe(
        "interest",
      );
    }
  });

  it("switches to auction only for the exact word", () => {
    expect(resolveCampaignMode("auction")).toBe("auction");
    expect(resolveCampaignMode(" Auction ")).toBe("auction");
    expect(resolveCampaignMode("AUCTION")).toBe("auction");
  });

  it("ships in interest mode", () => {
    // The repository default. Flipping this is a deliberate deployment act.
    expect(CAMPAIGN_MODE).toBe("interest");
    expect(isInterestMode()).toBe(true);
  });

  it("closes the retired auction endpoints unless the campaign is an auction", () => {
    expect(auctionEndpointsEnabled("interest")).toBe(false);
    expect(auctionEndpointsEnabled("auction")).toBe(true);
    // /api/bids, /api/board and /success all read this one function, so the
    // default configuration answers 404 on every one of them.
    expect(auctionEndpointsEnabled()).toBe(false);
  });
});

describe("payment mode resolution", () => {
  it("is disabled in every environment while the campaign is interest-driven", () => {
    for (const nodeEnv of ["development", "test", "production", undefined]) {
      for (const creds of [NONE, FULL, { ...NONE, secretKey: "sk_test" }]) {
        expect(
          resolvePaymentMode({ campaignMode: "interest", nodeEnv, ...creds }),
          `interest mode leaked a payment path in ${String(nodeEnv)}`,
        ).toBe("disabled");
      }
    }
  });

  it("never resolves to mock in production, whatever the campaign says", () => {
    for (const campaignMode of ["interest", "auction"] as CampaignMode[]) {
      for (const creds of [NONE, FULL, { ...NONE, publicKey: "pk_test" }]) {
        const mode = resolvePaymentMode({
          campaignMode,
          nodeEnv: "production",
          ...creds,
        });
        expect(mode, `production reached mock via ${campaignMode}`).not.toBe("mock");
      }
    }
  });

  it("disables production with an auction and no credentials at all", () => {
    expect(
      resolvePaymentMode({ campaignMode: "auction", nodeEnv: "production", ...NONE }),
    ).toBe("disabled");
  });

  it("fails closed on a half-configured account rather than looking healthy", () => {
    const partials = [
      { ...NONE, publicKey: "pk" },
      { ...NONE, secretKey: "sk" },
      { ...NONE, webhookSecret: "wh" },
      { publicKey: "pk", secretKey: "sk", webhookSecret: undefined },
      { publicKey: "pk", secretKey: undefined, webhookSecret: "wh" },
      { publicKey: undefined, secretKey: "sk", webhookSecret: "wh" },
    ];
    for (const nodeEnv of ["development", "production"]) {
      for (const creds of partials) {
        expect(
          resolvePaymentMode({ campaignMode: "auction", nodeEnv, ...creds }),
          `partial config was accepted in ${nodeEnv}`,
        ).toBe("misconfigured");
      }
    }
  });

  it("treats blank strings as absent, not as configuration", () => {
    expect(
      resolvePaymentMode({
        campaignMode: "auction",
        nodeEnv: "development",
        publicKey: "  ",
        secretKey: "",
        webhookSecret: "   ",
      }),
    ).toBe("mock");
    expect(
      resolvePaymentMode({
        campaignMode: "auction",
        nodeEnv: "production",
        publicKey: "  ",
        secretKey: "",
        webhookSecret: "   ",
      }),
    ).toBe("disabled");
  });

  it("allows mock only for a local auction with no credentials", () => {
    expect(
      resolvePaymentMode({ campaignMode: "auction", nodeEnv: "development", ...NONE }),
    ).toBe("mock");
    expect(
      resolvePaymentMode({ campaignMode: "auction", nodeEnv: "test", ...NONE }),
    ).toBe("mock");
  });

  it("goes live only with an explicit auction and a complete account", () => {
    for (const nodeEnv of ["development", "production"]) {
      expect(resolvePaymentMode({ campaignMode: "auction", nodeEnv, ...FULL })).toBe(
        "live",
      );
    }
  });

  it("has no input at all that makes the shipped configuration take money", () => {
    // The full cross-product of everything an environment could hold, with the
    // campaign left at its default. Nothing in it may produce live or mock.
    const modes: PaymentMode[] = [];
    for (const nodeEnv of ["development", "test", "production", undefined]) {
      for (const publicKey of [undefined, "", "pk"]) {
        for (const secretKey of [undefined, "", "sk"]) {
          for (const webhookSecret of [undefined, "", "wh"]) {
            modes.push(
              resolvePaymentMode({
                campaignMode: resolveCampaignMode(process.env.CAMPAIGN_MODE),
                nodeEnv,
                publicKey,
                secretKey,
                webhookSecret,
              }),
            );
          }
        }
      }
    }
    expect(new Set(modes)).toEqual(new Set<PaymentMode>(["disabled"]));
  });
});
