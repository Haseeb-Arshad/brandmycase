import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin, type BidRow } from "@/lib/supabase";
import { getPlacement } from "@/data/placements";
import { formatUsd } from "@/lib/money";
import { auctionEndpointsEnabled } from "@/lib/campaign";
import { Nav } from "@/components/Nav";

/**
 * FUTURE / DISABLED IN THE FOUNDING EDITION.
 *
 * Where Safepay Hosted Checkout returned to during the retired auction. The
 * Founding Edition takes no payment, so there is no checkout to come back
 * from: the route 404s unless CAMPAIGN_MODE is explicitly `auction`. Leaving
 * a page that says "deposit received" reachable on an inquiry-only site is
 * exactly the kind of thing this rebuild exists to prevent.
 */
export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ bid?: string }>;
}) {
  if (!auctionEndpointsEnabled()) notFound();

  const { bid: bidId } = await searchParams;
  const bidResult = bidId
    ? await getSupabaseAdmin()
        .from("bids")
        .select("company, placement_id, amount_usd, deposit_usd, contact_email, status")
        .eq("id", bidId)
        .maybeSingle()
    : { data: null, error: null };
  if (bidResult.error) {
    console.error("[success] Supabase bid read failed", bidResult.error);
  }
  const bid = bidResult.data as Pick<
    BidRow,
    | "company"
    | "placement_id"
    | "amount_usd"
    | "deposit_usd"
    | "contact_email"
    | "status"
  > | null;
  const panel = bid ? getPlacement(bid.placement_id) : null;
  const depositConfirmed = bid?.status === "DEPOSIT_PAID" || bid?.status === "WON";

  return (
    <>
      <Nav />
      <main className="success-page">
        <div>
          <span className="tick" aria-hidden="true" style={{ margin: "0 auto 22px" }}>
            ✓
          </span>

          <p className="section-kicker">
            {depositConfirmed ? "Deposit received" : "Payment being confirmed"}
          </p>
          <h1 style={{ marginTop: 12 }}>Payment received.</h1>

          {bid && panel ? (
            <p className="lede" style={{ marginTop: 18 }}>
              {bid.company} — {formatUsd(bid.amount_usd)} on panel {panel.id},{" "}
              {panel.name} ({panel.sizeLabel}).{" "}
              {depositConfirmed ? (
                <>
                  We&rsquo;ve confirmed your {formatUsd(bid.deposit_usd)} deposit and
                  will use {bid.contact_email} to follow up within one working day
                  about artwork and proofs.
                </>
              ) : (
                <>
                  We&rsquo;ve received your checkout return and are waiting for the
                  provider to confirm the {formatUsd(bid.deposit_usd)} deposit.
                  We&rsquo;ll use {bid.contact_email} to follow up as soon as it is
                  confirmed.
                </>
              )}
            </p>
          ) : (
            <p className="lede" style={{ marginTop: 18 }}>
              Your checkout return was received. The provider is confirming the
              payment, and we will follow up using the contact address you gave.
            </p>
          )}

          <Link className="pill-blue" href="/#inventory" style={{ marginTop: 30 }}>
            Back to the case
          </Link>
        </div>
      </main>
    </>
  );
}
