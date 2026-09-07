import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifySafepayWebhook,
  webhookIsConfigured,
  webhookMetadataValue,
  webhookNumber,
  paymentsEnabled,
  paymentModeError,
  PAYMENT_MODE,
} from "@/lib/payments";

/**
 * FUTURE / DISABLED IN THE FOUNDING EDITION.
 *
 * The signature verification below still guards the dormant Safepay
 * integration and is kept under test so re-enabling payments later starts from
 * a known-good boundary rather than from an unverified one. The first block
 * checks that the boundary is currently shut.
 */

describe("the shipped payment surface", () => {
  it("is disabled, and admits no payment path", () => {
    expect(PAYMENT_MODE).toBe("disabled");
    expect(paymentsEnabled()).toBe(false);
  });

  it("refuses webhooks whatever the environment holds", () => {
    // A webhook secret left over in a .env must not reopen the settlement
    // path while the public site is an inquiry campaign.
    expect(webhookIsConfigured()).toBe(false);
  });

  it("explains the refusal in operator terms rather than failing silently", () => {
    expect(paymentModeError()).toMatch(/no payment is taken/i);
    expect(paymentModeError("misconfigured")).toMatch(/SAFEPAY_WEBHOOK_SECRET/);
  });
});

describe("Safepay webhook boundary", () => {
  const secret = "test-webhook-secret";
  const rawBody = JSON.stringify({
    token: "evt_test_1",
    type: "payment.succeeded",
    data: {
      tracker: "trk_test_1",
      amount: "10000",
      currency: "USD",
      metadata: { bid_id: "bid_test_1" },
    },
  });

  it("accepts a valid raw-body HMAC-SHA512 signature", () => {
    const signature = createHmac("sha512", secret).update(rawBody).digest("hex");

    expect(verifySafepayWebhook(rawBody, signature, secret)).toMatchObject({
      token: "evt_test_1",
      type: "payment.succeeded",
    });
  });

  it("rejects a signature for a different body", () => {
    const signature = createHmac("sha512", secret)
      .update(rawBody + " ")
      .digest("hex");

    expect(() => verifySafepayWebhook(rawBody, signature, secret)).toThrow(
      "Invalid Safepay webhook signature.",
    );
  });

  it("normalizes provider metadata values and smallest-unit amounts", () => {
    expect(webhookMetadataValue({ bid_id: "bid_test_1" }, "bid_id")).toBe("bid_test_1");
    expect(webhookMetadataValue({ bid_id: { value: "bid_test_2" } }, "bid_id")).toBe(
      "bid_test_2",
    );
    expect(webhookNumber("10000")).toBe(10_000);
  });
});
