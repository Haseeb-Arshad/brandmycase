import { getAuctionBoard } from "@/lib/auction";
import { AuctionProvider } from "@/components/AuctionProvider";
import { Nav } from "@/components/Nav";
import { CaseHero } from "@/components/CaseHero";
import { InventorySection } from "@/components/InventorySection";
import { TickerSection } from "@/components/TickerSection";
import {
  StatsStrip,
  Story,
  TourSection,
  HowItWorks,
  FaqSection,
  SiteFooter,
} from "@/components/Sections";

/**
 * The board is read on the server so the first paint carries real bids — no
 * spinner, no layout shift, and the page is meaningful with JavaScript still
 * in flight. AuctionProvider then takes that same object over on the client.
 *
 * The static sections are passed through as children, so they stay server
 * components and never enter the client bundle.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const board = await getAuctionBoard();

  return (
    <AuctionProvider initialBoard={board}>
      <Nav />
      <main>
        <CaseHero />
        <StatsStrip />
        <Story />
        <TourSection />
        <HowItWorks />
        <InventorySection />
        <TickerSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </AuctionProvider>
  );
}
