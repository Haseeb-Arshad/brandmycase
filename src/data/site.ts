/**
 * Brand the Case — campaign copy and configuration.
 *
 * All of the campaign's words live here rather than inline in components, so
 * the story, the FAQ and the deliverables can be reviewed in one sitting
 * before anything goes public.
 *
 * TWO RULES GOVERN THIS FILE
 * --------------------------
 * 1. This is an independent project. Haseeb Arshad has been accepted to attend
 *    OpenAI DevDay. That is the entire relationship. Nothing here says or
 *    implies that OpenAI or any event organiser sponsors, endorses, approves,
 *    partners with or participates in this campaign, because none of them do.
 *
 * 2. Nothing is invented. No testimonials, no sponsor logos, no attendance
 *    figures, no impressions, no press coverage, no guarantees. Where a fact
 *    is not yet known — a portrait, a real inbox, the acceptance screenshot,
 *    the budget breakdown — the interface is built to accept it later and
 *    renders honestly without it. `npm run preflight` lists what is missing.
 */

/** Read an environment string, treating blank as absent. */
function env(name: string): string | null {
  const raw = process.env[name];
  const value = raw?.trim();
  return value ? value : null;
}

/**
 * Where sponsorship conversations go.
 *
 * Set NEXT_PUBLIC_CONTACT_EMAIL to a real inbox before sending this page to a
 * company. Unset, the site shows no address at all and points people at the
 * sponsorship form, which is a working contact route — it does not invent a
 * mailbox that would bounce.
 */
export const CONTACT_EMAIL: string | null = env("NEXT_PUBLIC_CONTACT_EMAIL");

export const SITE = {
  name: "Brand the Case",
  attribution: "by Haseeb Arshad",
  longAttribution: "A travel sponsorship project by Haseeb Arshad",
  tagline: "Put your brand on the case going to DevDay.",
  /** Canonical origin. Configurable — never hard-code the domain in logic. */
  url: env("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
  email: CONTACT_EMAIL,
} as const;

/**
 * The founder.
 *
 * Links render only when configured, so an unset profile is simply absent
 * rather than a dead link. The portrait is the same: a real photograph when
 * NEXT_PUBLIC_FOUNDER_PHOTO points at one, and a plain monogram until then.
 */
export const FOUNDER = {
  name: "Haseeb Arshad",
  role: "Software developer",
  location: "Pakistan",
  photo: env("NEXT_PUBLIC_FOUNDER_PHOTO"),
  links: [
    { label: "GitHub", href: env("NEXT_PUBLIC_GITHUB_URL"), event: "click_github" },
    { label: "LinkedIn", href: env("NEXT_PUBLIC_LINKEDIN_URL"), event: "click_linkedin" },
    { label: "X", href: env("NEXT_PUBLIC_X_URL"), event: "click_x" },
    { label: "Website", href: env("NEXT_PUBLIC_WEBSITE_URL"), event: "click_website" },
  ].filter((link): link is { label: string; href: string; event: string } =>
    Boolean(link.href),
  ),
  /** Two short paragraphs. Written as a person, not a campaign operator. */
  bio: [
    "I'm Haseeb. I build software from Pakistan — mostly web and AI things, mostly on my own time.",
    "I was accepted to attend OpenAI DevDay in San Francisco. Getting from here to there costs real money, so instead of asking anyone for a donation I'm selling something I can actually deliver: physical brand placements on the travel case that is coming with me.",
  ],
} as const;

/**
 * The trip.
 *
 * `date` is optional on purpose. It renders only when supplied, so the site
 * never states a schedule the owner has not confirmed.
 */
export const TRIP = {
  event: "OpenAI DevDay",
  from: "Pakistan",
  to: "San Francisco",
  date: env("NEXT_PUBLIC_EVENT_DATE") ?? null,
  /** Rendered anywhere the event is named. Never drop it. */
  disclosure: "Independent project · Not affiliated with, sponsored by or endorsed by OpenAI",
} as const;

/**
 * Acceptance proof.
 *
 * When the owner supplies a redacted screenshot and sets this variable, the
 * proof module renders the real image. Until then it renders a neutral card
 * offering the proof privately. There is deliberately no way to make this
 * module produce an OpenAI-branded graphic.
 */
export const ACCEPTANCE_PROOF = {
  image: env("NEXT_PUBLIC_ACCEPTANCE_PROOF_IMAGE"),
  imageAlt: "Redacted acceptance confirmation supplied by Haseeb Arshad",
  fallback: "Acceptance proof available to prospective sponsors.",
  note: "Happy to share the confirmation email directly with any company considering a sponsorship — just ask.",
} as const;

export interface Benefit {
  no: string;
  title: string;
  body: string;
}

/**
 * What a sponsor receives.
 *
 * Every line is something this project controls and can deliver on its own.
 * Anything depending on an event, a venue or a third party is a caveat in
 * BENEFIT_FINE_PRINT, never a promise in this list.
 */
export const BENEFITS: Benefit[] = [
  {
    no: "01",
    title: "A physical placement",
    body: "Your logo is printed in cut vinyl and fitted by hand to the panel you chose on the case I travel with.",
  },
  {
    no: "02",
    title: "The photographs",
    body: "High-resolution photographs of the finished case with your placement on it, sent to you after installation.",
  },
  {
    no: "03",
    title: "A place on this page",
    body: "Your name and logo on the sponsor section of this site, linked to your site — shown only with your permission.",
  },
  {
    no: "04",
    title: "Credit in the updates",
    body: "Sponsors are acknowledged in the build and trip updates I publish about the case.",
  },
  {
    no: "05",
    title: "A post-trip photo pack",
    body: "A set of photographs from the trip that you are free to use, on terms we agree in writing beforehand.",
  },
];

export const BENEFIT_FINE_PRINT =
  "Brand visibility inside any event venue is subject to the organiser's rules. This is independent attendee sponsorship, not event sponsorship. It includes no event rights, no credentials, no introductions, no guaranteed impressions and no audience figures.";

export interface Step {
  no: string;
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  {
    no: "01",
    title: "Pick a tier",
    body: "Anchor, Partner or Supporter. Optionally pick the exact panel you want on the case.",
  },
  {
    no: "02",
    title: "Send your details",
    body: "A short form: company, contact, website. No card details, no payment, nothing charged.",
  },
  {
    no: "03",
    title: "I reply personally",
    body: "I confirm the panel is still free, answer questions and send a proper invoice with payment details.",
  },
  {
    no: "04",
    title: "Your logo goes on",
    body: "Once payment clears, your artwork is produced, fitted to the case, photographed and sent to you.",
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: "Is this affiliated with OpenAI or DevDay?",
    a: "No. This is an independent project run by one developer. I was accepted to attend OpenAI DevDay as an attendee, and that is the whole of the relationship. OpenAI does not sponsor, endorse, organise, approve, partner with or participate in this campaign, and a sponsorship here is not an official event sponsorship of any kind.",
  },
  {
    q: "What exactly am I sponsoring?",
    a: "A named, measured area on a physical travel case that I own and am taking to San Francisco. You are sponsoring the trip, and the placement is the thing you get to point at.",
  },
  {
    q: "What do I receive?",
    a: "Your logo printed and fitted to the panel you chose, high-resolution photographs of the finished case, your name and logo on this site if you want them there, credit in the trip updates I publish, and a post-trip photo pack on agreed terms.",
  },
  {
    q: "How is payment handled?",
    a: "Not on this website. No card details are collected here and nothing is charged. You send your company details, I confirm availability, and I send a business invoice with payment instructions. Payment happens through that invoice, outside this site.",
  },
  {
    q: "Can I get an invoice? Can I pay without a credit card?",
    a: "Yes to both. Every sponsorship is invoiced. I am based in Pakistan and invoice internationally, so payment is by bank or international payment service rather than a card form on a webpage. If your finance team needs a particular format or reference on the invoice, tell me and I will match it.",
  },
  {
    q: "When will my logo be placed?",
    a: "After the invoice is paid and you have supplied artwork. I fit placements in batches ahead of the trip and send you photographs once yours is on. If you need a specific date for your own announcement, ask me before you commit and I will tell you honestly whether I can meet it.",
  },
  {
    q: "Can I choose where my logo appears?",
    a: "Yes, within your tier. Each tier covers a specific set of panels on the case, and you can name the one you want. Panels go on a first-confirmed basis, so a panel is only yours once the sponsorship is confirmed.",
  },
  {
    q: "Do you accept international companies?",
    a: "Yes. Sponsors can be anywhere. Invoicing is in US dollars.",
  },
  {
    q: "Can you reject a company?",
    a: "Yes. The case travels with me and appears in things I publish, so I will decline a sponsorship that I am not comfortable carrying. Nothing has been charged at that point, because payment only happens after I confirm.",
  },
  {
    q: "What happens if the trip cannot happen?",
    a: "If the trip does not go ahead, I will contact every confirmed sponsor directly and agree how to settle it — a refund of what has not been spent, or the placement and photography delivered without the trip, whichever we agree. I am not going to publish a blanket refund guarantee on a webpage before I have agreed the terms in writing with you; the terms that bind are the ones on your invoice.",
  },
  {
    q: "Will the case be visible inside the venue?",
    a: "I cannot promise that and I will not. What any venue allows through its doors is the organiser's decision, not mine. What I can promise is the physical placement, the photographs and the documentation, and none of that depends on anyone else's permission.",
  },
];

/**
 * The independence disclosure. Rendered in full in the transparency section
 * and abbreviated in the footer.
 */
export const DISCLOSURE = {
  title: "Independent by design",
  paragraphs: [
    "Brand the Case is an independent sponsorship project run by Haseeb Arshad.",
    "Haseeb has been accepted to attend OpenAI DevDay in San Francisco as an attendee. OpenAI does not sponsor, endorse, organise, approve, partner with or otherwise participate in this campaign.",
    "A sponsorship here is not an official event sponsorship and confers no event rights, credentials, access or endorsement.",
    "Any appearance of the case at an event remains subject to that event's rules and venue policies.",
  ],
  footer:
    "Independent project. Not sponsored by, endorsed by, or affiliated with OpenAI or any event organiser. Sponsorship is not an official event sponsorship and confers no event rights. No payment is taken on this site.",
} as const;

/**
 * What the money is for.
 *
 * Amounts are configurable and default to absent. With none supplied the
 * section names the categories and says plainly that the split is not yet
 * published — which is true — rather than showing numbers nobody costed.
 */
export interface BudgetLine {
  label: string;
  note: string;
  amountUsd: number | null;
}

function budgetAmount(name: string): number | null {
  const raw = env(name);
  if (!raw) return null;
  const value = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

export const BUDGET: BudgetLine[] = [
  {
    label: "International travel",
    note: "Return flights, Pakistan to San Francisco",
    amountUsd: budgetAmount("NEXT_PUBLIC_BUDGET_TRAVEL_USD"),
  },
  {
    label: "Accommodation",
    note: "Nights in San Francisco around the event",
    amountUsd: budgetAmount("NEXT_PUBLIC_BUDGET_ACCOMMODATION_USD"),
  },
  {
    label: "Local transport",
    note: "Airport transfers and getting around the city",
    amountUsd: budgetAmount("NEXT_PUBLIC_BUDGET_TRANSPORT_USD"),
  },
  {
    label: "Case production and branding",
    note: "The case, printed vinyl, fitting and photography",
    amountUsd: budgetAmount("NEXT_PUBLIC_BUDGET_CASE_USD"),
  },
  {
    label: "Other trip costs",
    note: "Visa, insurance and the things trips produce",
    amountUsd: budgetAmount("NEXT_PUBLIC_BUDGET_OTHER_USD"),
  },
];

/** True once the owner has costed at least one line. */
export const BUDGET_HAS_AMOUNTS = BUDGET.some((line) => line.amountUsd !== null);

export const BUDGET_COPY = {
  title: "What the $3,000 funds",
  body: "Sponsorship covers the cost of getting to San Francisco and of building and documenting the case. It is not a fee for access to anything, and it is not a donation — it buys a placement and a set of deliverables.",
  unpriced:
    "The exact split across these categories is not published yet, because I have not finished booking. I would rather show you the categories than a number I made up. Ask me and I will send what I have quoted so far.",
} as const;
