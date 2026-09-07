import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

/**
 * End-to-end guards on the retired auction routes.
 *
 * `campaign.test.ts` proves the decision function is right; this proves the
 * route handlers actually consult it. They are imported and invoked directly,
 * with the repository's shipped environment, so a regression that removed a
 * guard would fail here even though every unit test still passed.
 *
 * Supabase is never reached: each handler must refuse before it queries. If
 * one of these ever hangs or throws a connection error, the guard is gone.
 */

/**
 * The first test to touch a route pulls in that route's whole module graph —
 * Next's server runtime, the Supabase client, the Safepay SDK — and on a busy
 * machine that transpile alone can outrun vitest's 5s default and fail a test
 * that never got as far as an assertion. The guards themselves answer in
 * microseconds; this budget is for the import, not for the code under test.
 */
const IMPORT_BUDGET_MS = 30_000;

const post = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/bids", () => {
  it("does not exist while the campaign is interest-driven", async () => {
    const { POST } = await import("@/app/api/bids/route");
    const response = await POST(
      post("http://localhost:3000/api/bids", {
        placementId: "01",
        company: "Northbeam Labs",
        contactEmail: "partnerships@northbeam.example",
        amountUsd: 48_000,
      }),
    );

    expect(response.status).toBe(404);
    const body = (await response.json()) as Record<string, unknown>;
    // Nothing that could be mistaken for a receipt: no bid id, no redirect,
    // no deposit, no mode.
    expect(body).toEqual({ error: "Not found." });
  }, IMPORT_BUDGET_MS);

  it("refuses a well-formed body just the same", async () => {
    const { POST } = await import("@/app/api/bids/route");
    const response = await POST(post("http://localhost:3000/api/bids", {}));
    expect(response.status).toBe(404);
  }, IMPORT_BUDGET_MS);
});

describe("GET /api/board", () => {
  it("publishes no bids, sponsors or funding figures", async () => {
    const { GET } = await import("@/app/api/board/route");
    const response = await GET();

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).not.toMatch(/raisedUsd|goalUsd|reserveFloor|sponsor|currentBid/i);
  }, IMPORT_BUDGET_MS);
});

describe("POST /api/webhooks/safepay", () => {
  it("settles nothing while payments are disabled", async () => {
    const { POST } = await import("@/app/api/webhooks/safepay/route");
    const response = await POST(
      post("http://localhost:3000/api/webhooks/safepay", {
        token: "evt_test_1",
        type: "payment.succeeded",
        data: { tracker: "trk_1", metadata: { bid_id: "bid_1" } },
      }),
    );

    expect(response.status).toBe(503);
  }, IMPORT_BUDGET_MS);
});
