/**
 * Money helpers.
 *
 * Every amount in this codebase is an integer number of whole US dollars.
 * There are no floats and no cents anywhere except at the Stripe boundary,
 * where `toStripeAmount` converts once. Bids on physical panels are never
 * fractional, so this keeps every comparison exact.
 */

/** Percentage of a winning bid taken up front, from env. */
export const DEPOSIT_PERCENT = Number(process.env.DEPOSIT_PERCENT ?? 20);

/** Floor on the deposit, so tiny bids still cover payment processing. */
export const DEPOSIT_MINIMUM_USD = Number(process.env.DEPOSIT_MINIMUM_USD ?? 50);

/**
 * The deposit due when a bid is placed.
 * Rounded up so we never under-collect by a dollar.
 */
export function depositFor(amountUsd: number): number {
  const pct = Math.ceil((amountUsd * DEPOSIT_PERCENT) / 100);
  return Math.max(pct, DEPOSIT_MINIMUM_USD);
}

/**
 * Minimum acceptable next bid on a panel.
 *
 * With no live bid, the opening bid stands as-is - the first bidder pays the
 * asking price. Once a panel is live, each bid must clear the current one by
 * a 5% increment (rounded up to the next $100) so the auction cannot be
 * ratcheted a dollar at a time.
 */
export function minimumNextBid(openingBidUsd: number, currentBidUsd: number | null): number {
  if (currentBidUsd === null) return openingBidUsd;
  const step = Math.ceil((currentBidUsd * 0.05) / 100) * 100;
  return currentBidUsd + Math.max(step, 100);
}

/** "$48,000" */
export function formatUsd(amountUsd: number): string {
  return "$" + amountUsd.toLocaleString("en-US");
}

/** "$48K" / "$1.2M" - the compact form used on the 3D panel chips. */
export function formatUsdCompact(amountUsd: number): string {
  if (amountUsd >= 1_000_000) {
    const m = amountUsd / 1_000_000;
    return "$" + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + "M";
  }
  if (amountUsd >= 1000) {
    const k = amountUsd / 1000;
    return "$" + (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + "K";
  }
  return "$" + amountUsd;
}

/** Stripe wants the smallest currency unit. This is the only cents conversion. */
export function toStripeAmount(amountUsd: number): number {
  return Math.round(amountUsd * 100);
}
