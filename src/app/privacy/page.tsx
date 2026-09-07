import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ContactLink, SiteFooter } from "@/components/Sections";
import { FOUNDER, SITE } from "@/data/site";
import { analyticsScript } from "@/lib/analytics";

/**
 * Privacy.
 *
 * Written to describe what this application actually does, verifiable against
 * `src/lib/sponsorship.ts`, `src/lib/funding.ts` and the Supabase migrations.
 * It claims no compliance certification, because none has been obtained, and
 * it names no legal entity, because none has been supplied to this repository.
 *
 * The analytics paragraph is rendered from configuration rather than written
 * as a fixed claim, so this page cannot say "no analytics" on a deployment
 * that has analytics switched on.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Brand the Case collects when you send a sponsorship inquiry, why, where it is stored, and how to have it removed.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const analytics = analyticsScript();

  return (
    <>
      <Nav />
      <main className="legal-page" id="top">
        <div className="wrap-mid">
          <p className="section-kicker">Privacy</p>
          <h1>What I collect, and why.</h1>
          <p className="lede">
            {SITE.name} is a one-person project. The only personal information it
            handles is what you choose to send in a sponsorship inquiry.
          </p>

          <section>
            <h2 className="h3">What is collected</h2>
            <p>When you send the sponsorship form, it stores:</p>
            <ul className="legal-list">
              <li>the sponsorship tier you chose</li>
              <li>the placement you selected, if you picked one</li>
              <li>your company name</li>
              <li>your name</li>
              <li>your work email address</li>
              <li>your company website</li>
              <li>your X or LinkedIn profile, if you give one</li>
              <li>the message you write, if you write one</li>
              <li>the time the inquiry was received, and its status</li>
            </ul>
            <p>
              Nothing else is collected through the form. There is no checkout
              anywhere on this site, so no card number, bank detail or payment
              credential is ever requested, transmitted or stored here.
            </p>
          </section>

          <section>
            <h2 className="h3">Why it is collected</h2>
            <p>
              To read your inquiry, confirm whether the placement is available, and
              reply to you. If we go on to agree a sponsorship, the same details are
              used to invoice you and to arrange artwork and production.
            </p>
          </section>

          <section>
            <h2 className="h3">Where it is stored</h2>
            <p>
              Inquiries are stored in a Supabase Postgres database used by this
              application. The table is server-only: the browser has no access to it,
              row-level security is enabled with no public policy, and this site
              publishes no endpoint that can read an inquiry back. Only {FOUNDER.name},
              using an authorised database session, can read what you sent.
            </p>
            <p>
              Supabase and the site&rsquo;s hosting provider process this data as
              infrastructure. Your email address, your message and your profile links
              are never rendered on the public site — the page reads only the display
              fields of confirmed sponsorships.
            </p>
          </section>

          <section>
            <h2 className="h3">Being named publicly</h2>
            <p>
              Your company appears on this website only after a sponsorship is
              confirmed and only if you have agreed to be named. There is an explicit
              permission flag on the record and nothing is published without it.
            </p>
          </section>

          <section>
            <h2 className="h3">Cookies and analytics</h2>
            {analytics ? (
              <p>
                This site loads a privacy-conscious, cookieless analytics script from{" "}
                <code>{new URL(analytics.src).hostname}</code>. It counts page views
                and a small set of interaction events — which section a click came
                from, which tier was chosen. It sets no cookie, stores no identifier,
                and is never sent anything you type into the form.
              </p>
            ) : (
              <p>
                This site sets no advertising or analytics cookies and loads no
                third-party tracking script. Analytics can be switched on later
                through configuration; if it is, it will be a cookieless one and this
                page will say so.
              </p>
            )}
          </section>

          <section>
            <h2 className="h3">What is never done with it</h2>
            <p>
              Your information is not sold, rented, brokered or used as advertising
              data. It is not added to a marketing list, and it is not shared with any
              event organiser. It is used to have a conversation about the inquiry you
              sent.
            </p>
          </section>

          <section>
            <h2 className="h3">How long it is kept</h2>
            <p>
              Inquiries are kept while the conversation is live and for a reasonable
              period afterwards as a record of what was discussed. If a sponsorship is
              agreed, the associated records are kept as long as needed for that
              agreement and for the accounting that follows it. Otherwise, ask and it
              is deleted.
            </p>
          </section>

          <section>
            <h2 className="h3">Access, correction and removal</h2>
            <p>
              Contact <ContactLink className="link-blue" /> from the address you used,
              or with enough detail to identify the inquiry, and ask for a copy, a
              correction, or deletion. It will be actioned and confirmed.
            </p>
          </section>

          <section>
            <h2 className="h3">What this page does not claim</h2>
            <p>
              This is a plain description of what the application does. It is not a
              claim to hold any privacy certification, and no formal compliance audit
              has been carried out on this project.
            </p>
          </section>

          <p className="legal-back">
            <Link className="link-blue" href="/">
              ‹ Back to {SITE.name}
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
