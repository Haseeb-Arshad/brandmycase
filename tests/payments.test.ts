import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifySafepayWebhook,
  webhookMetadataValue,
  webhookNumber,
} from "@/lib/payments";

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
