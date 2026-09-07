import Link from "next/link";
import {
  BENEFITS,
  BENEFIT_FINE_PRINT,
  BUDGET,
  BUDGET_COPY,
  BUDGET_HAS_AMOUNTS,
  CONTACT_EMAIL,
  DISCLOSURE,
  FAQ,
  FOUNDER,
  SITE,
  STEPS,
  TRIP,
} from "@/data/site";
import { CAMPAIGN_GOAL_USD, formatUsd } from "@/data/sponsorship";
import type { PublicSponsor } from "@/lib/funding";
import { SponsorButton } from "@/components/SponsorButton";
import { TrackedLink } from "@/components/TrackedLink";

/**
 * The editorial sections.
 *
 * These are server components: no state, no effects, no client bundle. Only
 * the hero, the case, the package cards and the form ship JavaScript, and only
 * because they need interaction.
 *
 * The copy discipline here is the product. Nothing describes an outcome this
 * project does not control — no impressions, no venue access, no audience
 * figures, no endorsement — and where a thing depends on somebody else it is
 * said in the same sentence rather than in a footnote.
 */

/** Contact goes to a real address if one is configured, else to the form. */
export function ContactLink({ className }: { className?: string }) {
  if (!CONTACT_EMAIL) {
    return (
      <a className={className} href="/#sponsorship">
        use the sponsorship form
      </a>
    );
  }
  return (
    <TrackedLink className={className} href={`mailto:${CONTACT_EMAIL}`} event="click_email">
      {CONTACT_EMAIL}
    </TrackedLink>
  );
}

export function SponsorValue() {
  return (
    <section className="section" id="what-you-get">
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">What sponsors receive</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            The logo isn&rsquo;t an ad unit. It&rsquo;s physically coming with me.
          </h2>
          <p className="lede">
            I built the case because a sponsorship should be something you can
            actually point at. Here is everything you get, and nothing you don&rsquo;t.
          </p>
        </div>

        <div className="benefits">
          {BENEFITS.map((benefit) => (
            <article className="benefit" key={benefit.no}>
              <span className="benefit-no tnum">{benefit.no}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>

        <p className="fine-print">{BENEFIT_FINE_PRINT}</p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="section" id="how" style={{ background: "var(--surface)" }}>
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">How it works</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Four steps. No checkout.
          </h2>
        </div>

        <div className="steps">
          {STEPS.map((step) => (
            <article className="step" key={step.title}>
              <span className="step-no">{step.no}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <p className="fine-print">
          No card details are collected anywhere on this website. Payment happens
          against an invoice, after I have confirmed the placement with you.
        </p>
      </div>
    </section>
  );
}

/**
 * Confirmed sponsors.
 *
 * Rendered from the database and from nothing else. Zero sponsors is a real
 * state with its own copy, not something to be papered over with sample logos:
 * a founder who spots an invented brand here stops believing the funding bar
 * too, and rightly.
 */
export function ConfirmedSponsors({ sponsors }: { sponsors: PublicSponsor[] }) {
  return (
    <section className="section" id="sponsors">
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">Sponsors</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            {sponsors.length === 0 ? "Founding sponsor positions are open." : "On the case."}
          </h2>
          <p className="lede">
            {sponsors.length === 0
              ? "Nobody has confirmed yet — this section fills in as sponsorships are agreed, and it will only ever show real companies who have said we can name them."
              : "Companies who have confirmed a sponsorship and agreed to be named here."}
          </p>
        </div>

        {sponsors.length > 0 && (
          <ul className="sponsor-grid">
            {sponsors.map((sponsor) => (
              <li className="sponsor" key={sponsor.name} data-tier={sponsor.tier}>
                {sponsor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- sponsor-supplied URL
                  <img src={sponsor.logoUrl} alt={sponsor.name} />
                ) : (
                  <strong>{sponsor.name}</strong>
                )}
                <span className="sponsor-tier">{sponsor.tierLabel}</span>
                {sponsor.url && (
                  <a href={sponsor.url} target="_blank" rel="noopener noreferrer nofollow">
                    Visit ›
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        {sponsors.length === 0 && (
          <div className="sponsor-empty">
            <p>
              The first company on the case gets the first line of the story I tell
              about this trip.
            </p>
            <SponsorButton source="sponsors_empty">Take a founding spot</SponsorButton>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * What the money funds.
 *
 * Amounts are configuration and default to absent. With nothing costed the
 * section shows the categories and says why there are no numbers, which is
 * more convincing than five figures somebody made up in a text editor.
 */
export function Budget() {
  return (
    <section className="section" id="budget" style={{ background: "var(--surface)" }}>
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">Where it goes</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            {BUDGET_COPY.title}
          </h2>
          <p className="lede">{BUDGET_COPY.body}</p>
        </div>

        <div className="budget-table">
          {BUDGET.map((line) => (
            <div key={line.label}>
              <span>
                <b>{line.label}</b>
                <small>{line.note}</small>
              </span>
              {line.amountUsd !== null && (
                <span className="budget-amount tnum">{formatUsd(line.amountUsd)}</span>
              )}
            </div>
          ))}
          {BUDGET_HAS_AMOUNTS && (
            <div className="budget-total">
              <span>
                <b>Campaign goal</b>
              </span>
              <span className="budget-amount tnum">{formatUsd(CAMPAIGN_GOAL_USD)}</span>
            </div>
          )}
        </div>

        {!BUDGET_HAS_AMOUNTS && <p className="fine-print">{BUDGET_COPY.unpriced}</p>}
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="section" id="faq">
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">Questions</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            The honest answers.
          </h2>
          <p className="lede">
            Anything not covered here — <ContactLink className="link-blue" />.
          </p>
        </div>

        <div className="faq-list">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <span className="chev" aria-hidden="true">
                  +
                </span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Transparency() {
  return (
    <section className="section" id="independent" style={{ background: "var(--surface)" }}>
      <div className="wrap-mid">
        <div className="disclosure-card">
          <p className="section-kicker">Transparency</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            {DISCLOSURE.title}
          </h2>
          {DISCLOSURE.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="disclosure-links">
            <Link href="/terms">Terms</Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy">Privacy</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="section final-cta" id="sponsor">
      <div className="wrap-mid">
        <h2 className="h2">
          A few companies help make the trip possible. I make sure their support is
          visible and documented.
        </h2>
        <p className="lede">
          {formatUsd(CAMPAIGN_GOAL_USD)} gets one developer from {TRIP.from} to{" "}
          {TRIP.to} with a case that has your logo on it. Send your details and
          I&rsquo;ll come back to you personally.
        </p>
        <div className="hero-actions">
          <SponsorButton source="final_cta">Sponsor the trip</SponsorButton>
          <a className="link-blue" href="#case">
            See the placements ›
          </a>
        </div>
        {CONTACT_EMAIL && (
          <p className="final-cta-email">
            Or just email me: <ContactLink className="link-blue" />
          </p>
        )}
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-mark">
          {SITE.name} <span aria-hidden="true">·</span> {SITE.longAttribution}
        </p>

        <div className="footer-links">
          <Link href="/#sponsorship">Sponsorship</Link>
          <Link href="/#case">The case</Link>
          <Link href="/#founder">{FOUNDER.name}</Link>
          <Link href="/#independent">Independence</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>

        <p className="footer-fine">
          {DISCLOSURE.footer}
          <br />
          {CONTACT_EMAIL ? (
            <ContactLink />
          ) : (
            <Link href="/#sponsorship">Contact through the sponsorship form</Link>
          )}
        </p>
      </div>
    </footer>
  );
}
