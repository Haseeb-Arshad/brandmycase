import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ContactLink, SiteFooter } from "@/components/Sections";
import { FOUNDER, SITE, TRIP } from "@/data/site";

/**
 * Terms.
 *
 * Practical launch copy describing how this site actually behaves. It is not a
 * claim that professional legal review has taken place, and it deliberately
 * names no registered company, address, jurisdiction or registration number,
 * because none has been supplied to this repository.
 *
 * Note what is NOT written here: a refund policy, a cancellation window, or a
 * delivery guarantee. Those are contractual commitments, they belong on an
 * invoice agreed with a named counterparty, and inventing them on a webpage
 * would be worse than saying plainly that they are agreed per sponsorship.
 * See docs/13-brand-the-case.md for the owner's outstanding legal to-do list.
 */

export const metadata: Metadata = {
  title: "Terms",
  description:
    "How sponsorship works on Brand the Case: inquiries are non-binding, no payment is taken on the site, and sponsorship is agreed and invoiced directly.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="legal-page" id="top">
        <div className="wrap-mid">
          <p className="section-kicker">Terms</p>
          <h1>How this works.</h1>
          <p className="lede">
            {SITE.name} is an independent sponsorship project run personally by{" "}
            {FOUNDER.name}. These terms describe what this website does and, more
            importantly, what it does not do.
          </p>

          <section>
            <h2 className="h3">An inquiry is not an agreement</h2>
            <p>
              Sending the sponsorship form is an expression of interest. It is
              non-binding on both sides. It does not create a contract, an option, a
              licence or any obligation to proceed, and it does not oblige you to pay
              anything.
            </p>
          </section>

          <section>
            <h2 className="h3">An inquiry does not reserve a placement</h2>
            <p>
              Placements are not held or allocated by sending the form. A placement is
              yours only once the sponsorship is confirmed, and placements are
              confirmed in the order sponsorships are agreed. Two companies may
              inquire about the same placement.
            </p>
          </section>

          <section>
            <h2 className="h3">No payment is taken on this site</h2>
            <p>
              There is no checkout, no card form and no payment of any kind on this
              website. No payment credentials are requested, transmitted or stored. If
              a sponsorship is agreed, an invoice is issued directly with payment
              instructions, and payment happens outside this website under the terms
              set out on that invoice.
            </p>
          </section>

          <section>
            <h2 className="h3">Sponsorship exists only when both parties agree</h2>
            <p>
              A sponsorship comes into existence when {FOUNDER.name} and the sponsor
              agree terms in writing covering the placement, the price, artwork,
              timing and deliverables, and the invoice is settled. Nothing on this
              website, and nothing in a reply acknowledging an inquiry, forms that
              agreement.
            </p>
          </section>

          <section>
            <h2 className="h3">What a sponsorship includes</h2>
            <p>
              A physical placement on the case, photographs of the finished placement,
              a listing on this site where you permit one, acknowledgement in trip
              updates, and a post-trip photo pack on the terms agreed in writing. The
              exact scope is written into the agreement before anything is produced.
            </p>
          </section>

          <section>
            <h2 className="h3">Naming you publicly</h2>
            <p>
              Your company is named or shown on this website only if you have agreed
              to it. Sponsorship without a public listing is fine and changes nothing
              else about what you receive.
            </p>
          </section>

          <section>
            <h2 className="h3">Inquiries can be declined</h2>
            <p>
              Any inquiry may be declined, for any reason, without giving one. The
              case travels personally and appears in published material. No payment
              will have been taken at that point, because no payment is taken on this
              site.
            </p>
          </section>

          <section>
            <h2 className="h3">Cancellation, refunds and things going wrong</h2>
            <p>
              There is no blanket refund policy published here, because refund terms
              belong in the agreement for a specific sponsorship rather than in
              website copy. If the trip cannot go ahead, every confirmed sponsor will
              be contacted directly and a resolution agreed — a refund of what has not
              been committed, or delivery of the placement, photography and
              documentation without the trip. The terms that bind are the ones written
              on your invoice and agreed before you pay.
            </p>
          </section>

          <section>
            <h2 className="h3">Events, travel and venues</h2>
            <p>
              Any appearance of the case at any event depends on registration, travel
              arrangements, the event organiser&rsquo;s rules and the venue&rsquo;s
              policies. None of that is within this project&rsquo;s control and none of
              it is guaranteed or sold.
            </p>
          </section>

          <section>
            <h2 className="h3">Independence</h2>
            <p>
              {SITE.name} is an independent project. {FOUNDER.name} has been accepted
              to attend {TRIP.event} in {TRIP.to} as an attendee. This project is not
              sponsored by, endorsed by, affiliated with, approved by or operated by
              OpenAI or any event organiser. A sponsorship here is not an official
              event sponsorship and confers no event rights, credentials, access,
              exhibitor status or endorsement.
            </p>
          </section>

          <section>
            <h2 className="h3">No guaranteed results</h2>
            <p>
              This project does not guarantee impressions, reach, audience numbers,
              photographs at any particular event, media coverage, introductions,
              leads, sales or any other commercial outcome. What a sponsorship
              includes is the placement and the deliverables written into the
              agreement, and nothing beyond them.
            </p>
          </section>

          <section>
            <h2 className="h3">Trademarks and artwork</h2>
            <p>
              All company names, logos and trademarks remain the property of their
              respective owners. By supplying artwork under an agreed sponsorship, you
              confirm you have the right to do so and grant permission to reproduce it
              on the case and in photographs and documentation of the case, as set out
              in that agreement.
            </p>
          </section>

          <section>
            <h2 className="h3">This site</h2>
            <p>
              The site is provided as-is. Information on it, including availability,
              may change without notice. Questions go to <ContactLink className="link-blue" />.
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
