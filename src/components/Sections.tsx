import { SPECS, STEPS, TOUR, FAQ, SITE } from "@/data/site";
import { RESERVE_FLOOR_USD, PLACEMENTS, CASE } from "@/data/placements";
import { formatUsd } from "@/lib/money";

/**
 * The static editorial sections.
 *
 * These are server components: no state, no effects, no client bundle. Only the
 * three auction-driven pieces (hero, inventory, ticker) ship JavaScript.
 */

export function StatsStrip() {
  return (
    <section className="wrap" aria-label="The case at a glance">
      <div className="stats">
        <div>
          <b className="tnum">{PLACEMENTS.length}</b>
          <span>brandable panels</span>
        </div>
        <div>
          <b className="tnum">5</b>
          <span>faces of the case</span>
        </div>
        <div>
          <b className="tnum">{TOUR.length}</b>
          <span>cities in the tour</span>
        </div>
        <div>
          <b className="tnum">12</b>
          <span>months on the shell</span>
        </div>
      </div>
    </section>
  );
}

export function Story() {
  return (
    <section className="section" id="case-story">
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">The big idea</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Luggage becomes media.
          </h2>
          <p className="lede">
            Most sponsorships vanish in a scroll. This one gets wheeled through
            security at SFO, stood next to a stage, photographed in a hotel lobby,
            and put in an overhead bin above a row of people who build for a living.
          </p>
        </div>

        <div
          style={{
            maxWidth: 620,
            margin: "44px auto 0",
            borderRadius: 18,
            border: "1px solid var(--hairline)",
            overflow: "hidden",
          }}
        >
          {SPECS.map((spec, i) => (
            <div
              key={spec.label}
              style={{
                display: "grid",
                gridTemplateColumns: "88px 1fr",
                gap: 16,
                padding: "15px 20px",
                borderTop: i === 0 ? undefined : "1px solid var(--hairline)",
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 500 }}>{spec.label}</span>
              <span style={{ color: "var(--ink-2)" }}>{spec.value}</span>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 13,
            color: "var(--ink-3)",
          }}
        >
          Shell is {Math.round(CASE.width * 100)} &times;{" "}
          {Math.round(CASE.height * 100)} &times; {Math.round(CASE.depth * 100)} cm.
          Every panel on the case is measured, not decorative.
        </p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="section" id="how" style={{ background: "var(--background)" }}>
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">How it works</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Three steps. One travelling case.
          </h2>
        </div>

        <div className="steps">
          {STEPS.map((step, i) => (
            <article className="step" key={step.title}>
              <span className="step-no">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TourSection() {
  return (
    <section className="section" id="tour">
      <div className="wrap">
        <div className="section-head">
          <p className="section-kicker">The route</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            One case. Twelve cities.
          </h2>
          <p className="lede">
            Twelve months on the road, starting in San Francisco. Your panel is on
            the shell for the whole of it.
          </p>
        </div>

        <div className="tour-grid">
          {TOUR.map((stop, i) => (
            <article className="tour-stop" key={stop.city} data-flagship={!!stop.flagship}>
              <span className="tnum">
                {String(i + 1).padStart(2, "0")} · {stop.when}
              </span>
              <h4>{stop.city}</h4>
              <small>{stop.event}</small>
              {stop.flagship && <span className="tour-flag">First stop</span>}
            </article>
          ))}
        </div>

        <p
          style={{
            maxWidth: "68ch",
            margin: "26px auto 0",
            textAlign: "center",
            fontSize: 13,
            lineHeight: 1.65,
            color: "var(--ink-3)",
          }}
        >
          The case attends these events as an attendee. CODEC is not sponsored by,
          endorsed by, or affiliated with OpenAI, Anthropic, or any of the organisers
          named above — you are buying space on a case that will be in those rooms,
          not a place on anyone&rsquo;s official sponsor list.
        </p>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="section" id="faq" style={{ background: "var(--background)" }}>
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">Questions</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            The honest answers.
          </h2>
          <p className="lede">
            Reserve floor across all {PLACEMENTS.length} panels is{" "}
            {formatUsd(RESERVE_FLOOR_USD)}. Anything else, email{" "}
            <a href={`mailto:${SITE.operator.email}`} className="link-blue">
              {SITE.operator.email}
            </a>
            .
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

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <h2>Twenty panels. Forty thousand kilometres.</h2>
        <p>
          Pick a face, pick a panel, and put your mark on a case that spends the next
          year in the rooms you are trying to reach.
        </p>

        <a className="pill-blue" href="#inventory">
          Get a panel
        </a>

        <p className="footer-fine">
          {SITE.name} — {SITE.tagline} · Independent project, not sponsored by,
          endorsed by, or affiliated with OpenAI, Anthropic, or any conference
          organiser. All company names shown on unclaimed panels are placeholders.
          <br />
          <a href={`mailto:${SITE.operator.email}`}>{SITE.operator.email}</a>
        </p>
      </div>
    </footer>
  );
}
