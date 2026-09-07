import { NextRequest, NextResponse } from "next/server";
import { sponsorshipInquirySchema, fieldErrors } from "@/lib/validation";
import { createSponsorshipInquiry } from "@/lib/sponsorship";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/sponsorship-requests
 *
 * The only state-changing endpoint on the public site. It records a sponsorship
 * inquiry and does nothing else: no payment, no reservation, no change to what
 * the board says is available, no effect on the funding bar.
 *
 * The flow is:
 *
 *   1. soft per-client throttle (a speed bump, not a security control)
 *   2. Zod parse — including the honeypot and the independence acknowledgement
 *   3. re-check tier and panel availability against the database
 *   4. durable per-email window check, then insert as INTERESTED
 *
 * There is deliberately no GET. Inquiries carry other companies' contact
 * details, and the only way to read them is an authorised Supabase session.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Per client, per window. Generous for a human, tedious for a script. */
const CLIENT_LIMIT = 8;
const CLIENT_WINDOW_MS = 10 * 60 * 1000;

/** The same shape whatever happened, so a double submit reads as success. */
const RECEIVED = {
  received: true,
  paymentTaken: false,
  reserved: false,
} as const;

export async function POST(request: NextRequest) {
  const throttle = rateLimit(
    `sponsorship:${clientKey(request.headers)}`,
    CLIENT_LIMIT,
    CLIENT_WINDOW_MS,
  );
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "That is a lot of requests in a short time. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = sponsorshipInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  const result = await createSponsorshipInquiry(parsed.data);

  if (!result.ok) {
    switch (result.reason) {
      case "unknown_placement":
        return NextResponse.json({ error: "Unknown placement." }, { status: 404 });
      case "tier_mismatch":
        return NextResponse.json(
          { error: "That placement is not part of the tier you selected." },
          { status: 409 },
        );
      case "unavailable":
        return NextResponse.json(
          {
            error:
              "That placement has just been taken. Pick another one — there are others open at the same tier.",
          },
          { status: 409 },
        );
      case "rate_limited":
        return NextResponse.json(
          {
            error:
              "I already have several inquiries from this address. Reply to my email and I will pick it up there.",
          },
          { status: 429 },
        );
      case "unavailable_storage":
      case "storage":
        return NextResponse.json(
          {
            error:
              "I could not record that just now. Please try again in a moment, or email me directly.",
          },
          { status: 503 },
        );
    }
  }

  return NextResponse.json({ ...RECEIVED, id: result.id }, { status: 201 });
}
