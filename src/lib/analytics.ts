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
  plausible?: (event: string, options?: { props?: AnalyticsProps }) => void;
  fathom?: { trackEvent: (event: string) => void };
  umami?: { track: (event: string, props?: AnalyticsProps) => void };
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as AnalyticsGlobals;

  try {
    if (typeof w.plausible === "function") {
      w.plausible(event, props ? { props } : undefined);
      return;
    }
    if (w.umami?.track) {
      w.umami.track(event, props);
      return;
    }
    if (w.fathom?.trackEvent) {
      w.fathom.trackEvent(event);
      return;
    }
  } catch {
    // Analytics must never be able to break a sponsorship form.
  }

  if (process.env.NODE_ENV === "development") {
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
