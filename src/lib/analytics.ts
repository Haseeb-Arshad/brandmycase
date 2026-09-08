/**
 * Conversion analytics.
 *
 * This campaign lives or dies on a handful of cold emails, so it is worth
 * knowing which part of the page does the work. It is not worth a tracking
 * dependency, a cookie banner or a bill.
 *
 * HOW IT WORKS
 * ------------
 * `track()` hands the event to a privacy-conscious script if one is loaded
 * (Plausible, Fathom and Umami all expose the same shape of global) and does
 * nothing at all otherwise. No script configured means no network request, no
 * cookie, no identifier, and — importantly — no broken page: every call site
 * can fire events unconditionally without checking whether analytics exists.
 *
 * Nothing personal is ever passed. Events carry a tier, a panel id or a link
 * label; never a company name, an email address or anything typed into the
 * form.
 */

export const ANALYTICS_EVENTS = [
  "view_campaign",
  "click_sponsor",
  "view_package",
  "select_panel",
  "open_sponsor_form",
  "submit_sponsor_interest",
  "click_email",
  "click_github",
  "click_linkedin",
  "click_x",
  "click_website",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Only simple, non-identifying values may travel with an event. */
export type AnalyticsProps = Record<string, string | number | boolean>;

interface AnalyticsGlobals {
  posthog?: { capture: (event: string, props?: AnalyticsProps) => void };
  plausible?: (event: string, options?: { props?: AnalyticsProps }) => void;
  fathom?: { trackEvent: (event: string) => void };
  umami?: { track: (event: string, props?: AnalyticsProps) => void };
}

/**
 * Send an event to every provider that is actually loaded.
 *
 * Every send is individually wrapped: one provider throwing must not stop the
 * next one, and none of them may take a sponsorship form down with them.
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as AnalyticsGlobals;
  let delivered = false;

  const send = (fn: () => void) => {
    try {
      fn();
      delivered = true;
    } catch {
      // Analytics must never be able to break a sponsorship form.
    }
  };

  if (w.posthog?.capture) send(() => w.posthog!.capture(event, props));
  if (typeof w.plausible === "function") {
    send(() => w.plausible!(event, props ? { props } : undefined));
  }
  if (w.umami?.track) send(() => w.umami!.track(event, props));
  if (w.fathom?.trackEvent) send(() => w.fathom!.trackEvent(event));

  if (!delivered && process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, props ?? {});
  }
}

/**
 * The analytics script tag, if one is configured.
 *
 * Both variables must be set, so a half-configured deployment loads nothing
 * rather than a script pointed at the wrong site.
 */
export function analyticsScript(): { src: string; domain: string } | null {
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC?.trim();
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN?.trim();
  return src && domain ? { src, domain } : null;
}

/**
 * PostHog, if a project key is configured.
 *
 * Loaded from PostHog's CDN rather than the `posthog-js` npm package: the
 * snippet is a couple of hundred bytes inline and pulls the library
 * asynchronously, so a visitor who never gets that far never pays for it and
 * the first paint of the story and the CTA is untouched.
 */
export function posthogConfig(): { key: string; host: string } | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  return {
    key,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
  };
}

/**
 * How PostHog is initialised, and why.
 *
 * This page has a form carrying company names, personal names and work email
 * addresses. PostHog's autocapture records DOM interactions, and session
 * recording records the screen — either can pick up what somebody typed into
 * a sponsorship enquiry. Both are off:
 *
 *   autocapture: false          only the named events in ANALYTICS_EVENTS
 *   disable_session_recording   nobody's typing is filmed
 *   person_profiles: identified_only
 *                               nobody is identified, so no person profile is
 *                               created for an anonymous visitor
 *
 * The result is pageviews plus the conversion events this file declares, and
 * nothing a sponsor typed. Turning any of these on means revisiting the
 * analytics paragraph on /privacy, which describes exactly this.
 */
export const POSTHOG_INIT_OPTIONS = {
  autocapture: false,
  disable_session_recording: true,
  capture_pageview: true,
  person_profiles: "identified_only",
} as const;
