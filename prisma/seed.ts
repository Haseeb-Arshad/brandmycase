/**
 * Seed the auction with a plausible mid-campaign board.
 *
 * IMPORTANT - every sponsor below is FICTIONAL. None of these are real
 * companies and none of them have agreed to anything. They exist so the site
 * has something to render in development. Before this goes anywhere public,
 * run `npm run db:reset` against an empty seed, or replace these with brands
 * that have actually signed. Never ship an invented logo as a real sponsor.
 *
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { PLACEMENTS } from "../src/data/placements";

const prisma = new PrismaClient();

interface DemoBid {
  placementId: string;
  company: string;
  /** Multiplier over the opening bid, so the ladder stays sane if prices move. */
  over: number;
  bidCount: number;
  hoursAgo: number;
}

const DEMO_BIDS: DemoBid[] = [
  { placementId: "01", company: "Northbeam Labs", over: 1.34, bidCount: 14, hoursAgo: 6 },
  { placementId: "02", company: "Halcyon Compute", over: 1.21, bidCount: 11, hoursAgo: 18 },
  { placementId: "03", company: "Runlevel", over: 1.11, bidCount: 6, hoursAgo: 31 },
  { placementId: "05", company: "Tessellate", over: 1.07, bidCount: 4, hoursAgo: 44 },
  { placementId: "06", company: "Kestrel Systems", over: 1.0, bidCount: 1, hoursAgo: 52 },
  { placementId: "08", company: "Vantage Grid", over: 1.19, bidCount: 8, hoursAgo: 9 },
  { placementId: "09", company: "Orbital Foundry", over: 1.05, bidCount: 3, hoursAgo: 27 },
  { placementId: "11", company: "Meridian AI", over: 1.15, bidCount: 7, hoursAgo: 13 },
  { placementId: "12", company: "Cadence Robotics", over: 1.09, bidCount: 5, hoursAgo: 22 },
  { placementId: "16", company: "Lanternhouse", over: 1.12, bidCount: 6, hoursAgo: 3 },
  { placementId: "17", company: "Pinnacle Edge", over: 1.0, bidCount: 1, hoursAgo: 60 },
  { placementId: "19", company: "Sundial Interfaces", over: 1.27, bidCount: 9, hoursAgo: 1 },
  { placementId: "20", company: "Aperture Data", over: 1.04, bidCount: 2, hoursAgo: 36 },
];

/** Round to a tidy auction-looking number. */
const tidy = (n: number) => Math.round(n / 500) * 500;

async function main() {
  console.log("Clearing existing bids...");
  await prisma.bid.deleteMany();

  const placements = new Map(PLACEMENTS.map((p) => [p.id, p]));
  const now = Date.now();
  let created = 0;
  let raised = 0;

  for (const demo of DEMO_BIDS) {
    const placement = placements.get(demo.placementId);
    if (!placement) {
      throw new Error(`Seed references unknown panel ${demo.placementId}`);
    }

    const winning = tidy(placement.openingBidUsd * demo.over);

    // Write the losing history too, so bid counts on the board are real rows
    // rather than a number we made up in a column.
    for (let i = demo.bidCount - 1; i >= 0; i--) {
      const isWinner = i === 0;
      // Losers ladder down from the winning bid toward the opening price.
      const amount = isWinner
        ? winning
        : tidy(
            placement.openingBidUsd +
              ((winning - placement.openingBidUsd) * (demo.bidCount - i)) /
                (demo.bidCount + 1),
          );

      await prisma.bid.create({
        data: {
          placementId: placement.id,
          company: isWinner ? demo.company : `Bidder ${placement.id}-${i}`,
          contactEmail: isWinner
            ? `partnerships@${demo.company.toLowerCase().replace(/[^a-z]/g, "")}.example`
            : `bidder${i}@example.com`,
          websiteUrl: isWinner
            ? `https://${demo.company.toLowerCase().replace(/[^a-z]/g, "")}.example`
            : null,
          amountUsd: amount,
          depositUsd: Math.ceil(amount * 0.2),
          status: isWinner ? "DEPOSIT_PAID" : "OUTBID",
          paymentProvider: "mock",
          paymentRef: "mock_seed",
          createdAt: new Date(now - (demo.hoursAgo + i * 7) * 3600_000),
        },
      });
      created++;
    }
    raised += winning;
  }

  console.log(`Seeded ${created} bids across ${DEMO_BIDS.length} panels.`);
  console.log(`Board now reads $${raised.toLocaleString("en-US")} raised.`);
  console.log(
    `${PLACEMENTS.length - DEMO_BIDS.length} of ${PLACEMENTS.length} panels still open.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
