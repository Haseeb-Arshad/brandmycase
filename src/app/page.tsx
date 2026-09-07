import { getCampaignSnapshot } from "@/lib/funding";
import { CampaignProvider } from "@/components/CampaignProvider";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Founder, AcceptanceProof } from "@/components/Founder";
import { Packages } from "@/components/Packages";
import { CaseSection } from "@/components/CaseSection";
import {
  Budget,
  ConfirmedSponsors,
  FaqSection,
  FinalCta,
  HowItWorks,
  SiteFooter,
  SponsorValue,
  Transparency,
} from "@/components/Sections";

/**
 * The campaign homepage.
 *
 * Ordered as a conversion sequence rather than as a site map: who I am, why
 * the trip, what it costs, what you get, and then the questions a finance team
 * will ask. Somebody arriving from a cold email should be able to stop reading
 * at any point and still know what they were asked.
 *
 * The page is rendered per request because the funding bar and panel
 * availability come from confirmed sponsorships in Supabase. With no database
 * configured the read returns nothing and the page renders honestly as an
 * unfunded campaign with every placement open — which is exactly what it is.
 *
 * Everything except the hero, the packages and the case is a server component,
 * passed through the provider as children so the editorial copy never enters
 * the client bundle.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { board, funding, sponsors } = await getCampaignSnapshot();

  return (
    <CampaignProvider board={board} funding={funding} sponsors={sponsors}>
      <Nav />
      <main>
        <Hero />
        <Founder />
        <AcceptanceProof />
        <Packages />
        <CaseSection />
        <SponsorValue />
        <HowItWorks />
        <ConfirmedSponsors sponsors={sponsors} />
        <Budget />
        <FaqSection />
        <Transparency />
        <FinalCta />
      </main>
      <SiteFooter />
    </CampaignProvider>
  );
}
