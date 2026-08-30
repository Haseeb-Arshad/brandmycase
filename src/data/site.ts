/**
 * Campaign copy and schedule.
 *
 * Content lives here rather than inline in components so the tour, the FAQ and
 * the specs can be edited without touching layout code — and so there is one
 * obvious file to review before anything goes public.
 *
 * A NOTE ON CLAIMS
 * ----------------
 * Everything on this site is written as attendance, not endorsement. The case
 * is *going to* these events the way any attendee goes to them. Nothing here
 * says or implies that OpenAI, Anthropic, or any conference organiser sponsors,
 * endorses, or is affiliated with this campaign, because none of them do or
 * are. Keep it that way: claiming an affiliation you do not have is both a
 * trademark problem and the fastest way to lose a sponsor's trust.
 */

export const SITE = {
  name: "CODEC",
  wordmark: "CODEC ONE",
  tagline: "Brand the case.",
  /** The auction's closing date. */
  auctionEndsAt: "2026-10-01T23:59:00-07:00",
  operator: {
    name: "the CODEC project",
    email: "partners@codec.example",
  },
} as const;

export interface TourStop {
  city: string;
  event: string;
  when: string;
  /** The anchor date the tour is built around. */
  flagship?: boolean;
}

/**
 * Twelve months, twelve stops. The San Francisco date is the anchor — it is
 * where the case is first seen with sponsor panels fitted.
 */
export const TOUR: TourStop[] = [
  { city: "San Francisco", event: "OpenAI DevDay", when: "Oct 2026", flagship: true },
  { city: "Seattle", event: "Cloud & infra week", when: "Nov 2026" },
  { city: "New York", event: "Founder summits", when: "Dec 2026" },
  { city: "London", event: "AI engineering meetups", when: "Jan 2027" },
  { city: "Paris", event: "VivaTech circuit", when: "Feb 2027" },
  { city: "Berlin", event: "Open source days", when: "Mar 2027" },
  { city: "Lisbon", event: "Web Summit season", when: "Apr 2027" },
  { city: "Dubai", event: "Gulf tech week", when: "May 2027" },
  { city: "Bengaluru", event: "Developer conferences", when: "Jun 2027" },
  { city: "Singapore", event: "APAC founder circuit", when: "Jul 2027" },
  { city: "Tokyo", event: "Robotics & AI expos", when: "Aug 2027" },
  { city: "Sydney", event: "Closing showcase", when: "Sep 2027" },
];

export interface SpecLine {
  label: string;
  value: string;
}

/** The marquee under the hero. */
export const MARQUEE: string[] = [
  "20 BRANDABLE PANELS",
  "5 FACES",
  "12 CITIES",
  "40,000 KM",
  "365 DAYS",
];

export const SPECS: SpecLine[] = [
  { label: "Shell", value: "76 x 110 x 40 cm moulded polycarbonate" },
  { label: "Frame", value: "Anodised aluminium split frame" },
  { label: "Panels", value: "20 across five faces, 8 to 48 K opening" },
  { label: "Print", value: "Die-cut 3M cast vinyl, UV laminated" },
  { label: "Term", value: "12 months from the San Francisco date" },
];

export interface Step {
  kicker: string;
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  {
    kicker: "01 / CHOOSE",
    title: "Pick your panel.",
    body: "Spin the case, look at all five faces, and pick the surface you want. Every panel on screen is a real, measured area on the real shell.",
  },
  {
    kicker: "02 / BID",
    title: "Name your number.",
    body: "A 20% deposit holds your bid. If somebody outbids you, or if we decline the brand, the deposit comes back in full and automatically.",
  },
  {
    kicker: "03 / TRAVEL",
    title: "Go everywhere.",
    body: "We cut your artwork in cast vinyl, fit it, photograph it, and then it goes to San Francisco — and to the eleven cities after it.",
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: "Is this affiliated with OpenAI or any conference?",
    a: "No. The case is going to DevDay the way any attendee goes: with a ticket. There is no sponsorship, endorsement, partnership, or affiliation with OpenAI, Anthropic, or any event organiser, and nothing on this site should be read as one. You are buying space on a case that will be in those rooms, not a position on anybody's official sponsor list.",
  },
  {
    q: "How does payment work?",
    a: "Placing a bid takes a 20% deposit by card, with a $50 minimum. If you are outbid at any point before the auction closes, the deposit is refunded in full, automatically. The remaining 80% is only charged once the auction closes in your favour and you have approved the printed proof.",
  },
  {
    q: "What do I actually get?",
    a: "A die-cut cast vinyl panel of your logo, in the exact size listed, fitted to the case for twelve months. Plus the photography: a studio set of the fitted case, and whatever the case appears in over the year — event photos, posts, and the build log.",
  },
  {
    q: "Can you refuse my brand?",
    a: "Yes, and we will. The case goes into rooms full of people whose opinion we care about. If a brand is a bad fit, we decline it and refund the deposit in full, no argument and no fee. Panels are not resold or sublicensed without our approval either.",
  },
  {
    q: "What happens if the case is lost or damaged?",
    a: "It is insured for the full term, and there is a second shell held in reserve with the same panel map. If the primary case is destroyed, panels are reprinted onto the reserve at our cost and the term continues. If the tour is cancelled outright, unused months are refunded pro rata.",
  },
  {
    q: "Why a case?",
    a: "Because it is the one object that is with you in every room that matters and gets photographed in all of them: the security queue, the overhead bin, the hotel lobby, the side of the stage. A billboard is seen by strangers. A case is seen by the people you are trying to reach, at the moment they are most receptive.",
  },
  {
    q: "Can I see the artwork spec before I bid?",
    a: "Yes. Every panel's exact print dimensions are listed in the inventory below, and the full template pack — bleed, safe area, colour profile, and the fabrication drawing for all five faces — is in the repository's docs under the sponsor kit.",
  },
];
