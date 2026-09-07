import { SITE } from "@/data/site";
import { SponsorButton } from "@/components/SponsorButton";

/**
 * Sticky nav — wordmark and attribution left, links centre, the one primary
 * action right. The attribution is part of the mark rather than a tagline
 * underneath it: the name of the person carrying the case is the credibility.
 */
export function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-inner">
        <a className="wordmark" href="/#top">
          <span className="wordmark-mark" aria-hidden="true">
            [ ]
          </span>
          <span className="wordmark-text">
            {SITE.name}
            <small>{SITE.attribution}</small>
          </span>
        </a>

        <div className="nav-links">
          <a href="/#sponsorship">Sponsorship</a>
          <a href="/#case">The case</a>
          <a href="/#founder">Who&rsquo;s carrying it</a>
          <a href="/#faq">FAQ</a>
        </div>

        <div className="nav-right">
          <SponsorButton source="nav" className="nav-cta">
            Sponsor the trip
          </SponsorButton>
        </div>
      </div>
    </nav>
  );
}
