import Link from "next/link";
import { getSupabaseAdmin, type BidRow } from "@/lib/supabase";
import { getPlacement } from "@/data/placements";
import { formatUsd } from "@/lib/money";
import { Nav } from "@/components/Nav";

/**
 * Where Stripe Checkout returns to.
 *
 * The bid may still be PENDING when the browser lands here — the webhook and
 * the redirect race, and the webhook is the one that counts. So this page never
 * claims the panel is won; it confirms what was received and says what happens
 * next, which is true in both orderings.
 */
export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ bid?: string }>;
}) {
  const { bid: bidId } = await searchParams;
  const bidResult = bidId
    ? await getSupabaseAdmin()
        .from("bids")
        .select("company, placement_id, amount_usd, deposit_usd, contact_email")
        .eq("id", bidId)
        .maybeSingle()
    : { data: null, error: null };
  if (bidResult.error) {
    console.error("[success] Supabase bid read failed", bidResult.error);
  }
  const bid = bidResult.data as Pick<
    BidRow,
    "company" | "placement_id" | "amount_usd" | "deposit_usd" | "contact_email"
  > | null;
  const panel = bid ? getPlacement(bid.placement_id) : null;

  return (
    <>
      <Nav />
      <main className="success-page">
        <div>
          <span className="tick" aria-hidden="true" style={{ margin: "0 auto 22px" }}>
            ✓
          </span>

          <p className="section-kicker">Deposit received</p>
          <h1 style={{ marginTop: 12 }}>You&rsquo;re on the case.</h1>

          {bid && panel ? (
            <p className="lede" style={{ marginTop: 18 }}>
              {bid.company} — {formatUsd(bid.amount_usd)} on panel {panel.id},{" "}
              {panel.name} ({panel.sizeLabel}). We&rsquo;ve taken a{" "}
              {formatUsd(bid.deposit_usd)} deposit and sent a confirmation to{" "}
              {bid.contact_email}. You&rsquo;ll hear from us within one working day
              about artwork and proofs.
            </p>
          ) : (
            <p className="lede" style={{ marginTop: 18 }}>
              Your deposit was received. A confirmation is on its way to the address
              you gave, with the artwork spec for your panel.
            </p>
          )}

          <p
            style={{
              maxWidth: "56ch",
              margin: "18px auto 0",
              fontSize: 13,
              lineHeight: 1.65,
              color: "var(--ink-3)",
            }}
          >
            If you are outbid before the auction closes, the deposit is refunded in
            full and automatically. The balance is only charged once the auction
            closes in your favour and you have approved the proof.
          </p>

          <Link className="pill-blue" href="/#inventory" style={{ marginTop: 30 }}>
            Back to the auction
          </Link>
        </div>
      </main>
    </>
  );
}
