import { ACCEPTANCE_PROOF, FOUNDER, TRIP } from "@/data/site";
import { TrackedLink } from "@/components/TrackedLink";
import type { AnalyticsEvent } from "@/lib/analytics";

/**
 * Who's carrying the case.
 *
 * A server component: no state, no client bundle. The portrait, the profile
 * links and the acceptance proof are all owner-supplied configuration, and
 * each one renders honestly when it is absent rather than showing a
 * placeholder that pretends to be the real thing.
 */
export function Founder() {
  return (
    <section className="section founder" id="founder" style={{ background: "var(--surface)" }}>
      <div className="wrap-mid">
        <div className="section-head">
          <p className="section-kicker">The person</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Who&rsquo;s carrying the case?
          </h2>
        </div>

        <div className="founder-card">
          <div className="founder-portrait">
            {FOUNDER.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- owner-supplied
              // URL of unknown origin and dimensions; next/image would need it
              // declared in next.config before it is known.
              <img src={FOUNDER.photo} alt={`${FOUNDER.name}, ${FOUNDER.role}`} />
            ) : (
              <span className="founder-monogram" aria-hidden="true">
                HA
              </span>
            )}
          </div>

          <div className="founder-body">
            <h3>{FOUNDER.name}</h3>
            <p className="founder-role">
              {FOUNDER.role} · {FOUNDER.location}
            </p>

            {FOUNDER.bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            {FOUNDER.links.length > 0 && (
              <div className="founder-links">
                {FOUNDER.links.map((link) => (
                  <TrackedLink
                    key={link.label}
                    className="founder-link"
                    href={link.href}
                    event={link.event as AnalyticsEvent}
                    external
                  >
                    {link.label}
                  </TrackedLink>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The acceptance proof.
 *
 * There is deliberately no code path here that draws a badge, a logo or a
 * mocked-up confirmation. Either a real, owner-supplied image is configured
 * and shown, or the card says the proof is available on request — which is
 * true, and which a sponsor can act on.
 */
export function AcceptanceProof() {
  return (
    <section className="section proof" id="proof">
      <div className="wrap-mid">
        <div className="proof-card">
          <div className="proof-body">
            <p className="section-kicker">The reason for the trip</p>
            <h2 className="h3">
              Accepted to attend {TRIP.event} in {TRIP.to}
              {TRIP.date ? `, ${TRIP.date}` : ""}.
            </h2>
            {ACCEPTANCE_PROOF.image ? (
              <p>{ACCEPTANCE_PROOF.withImage}</p>
            ) : (
              <>
                <p>{ACCEPTANCE_PROOF.fallback}</p>
                <p>{ACCEPTANCE_PROOF.note}</p>
              </>
            )}
            {/* The disclosure sits directly under the screenshot on purpose.
                The email carries OpenAI's own branding, so the one place a
                reader could mistake proof-of-attendance for endorsement is
                exactly here. */}
            <p className="proof-disclosure">{TRIP.disclosure}.</p>
          </div>

          {ACCEPTANCE_PROOF.image && (
            <figure className="proof-figure">
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied URL */}
              <img src={ACCEPTANCE_PROOF.image} alt={ACCEPTANCE_PROOF.imageAlt} />
              {/* Says only what is true of whatever image is configured. An
                  earlier version called it "redacted", which would have been a
                  claim about the file rather than a description of it. */}
              <figcaption>Supplied by {FOUNDER.name}.</figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
