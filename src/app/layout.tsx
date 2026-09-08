import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { POSTHOG_INIT_OPTIONS, analyticsScript, posthogConfig } from "@/lib/analytics";
import "./globals.css";

/**
 * Inter, self-hosted by next/font at build time — no runtime request to Google
 * and no layout shift. Exposed as a CSS variable so globals.css owns the stack.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const title = "Brand the Case — Sponsor Haseeb's DevDay Journey";
const description =
  "A developer from Pakistan is heading to OpenAI DevDay in San Francisco. Sponsor the journey and put your company on the case travelling with him. Independent project, not affiliated with OpenAI.";

/**
 * `metadataBase` is configuration, never a hard-coded domain: the campaign
 * runs at case.haseeburshad.me in production and on localhost everywhere else,
 * and every canonical and Open Graph URL is derived from this one value.
 */
export const metadata: Metadata = {
  title: { default: title, template: "%s · Brand the Case" },
  description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Brand the Case",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Analytics, loaded only where configured. Nothing configured means no
  // third-party request and no cookie at all — the page is identical either
  // way, which is what lets the campaign run before any of this is set up.
  const analytics = analyticsScript();
  const posthog = posthogConfig();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a className="skip-link" href="#top">
          Skip to content
        </a>
        {children}
        {analytics && (
          <Script
            defer
            src={analytics.src}
            data-domain={analytics.domain}
            strategy="afterInteractive"
          />
        )}

        {/* PostHog's official loader. It stubs `window.posthog` immediately and
            fetches the library in the background, so `track()` calls made
            before the download finishes are queued rather than lost.

            The options come from one exported constant, so what is switched
            off here — autocapture, session recording — is stated in one place
            next to the reason, and /privacy describes the same thing. */}
        {posthog && (
          <Script id="posthog" strategy="afterInteractive">
            {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init(${JSON.stringify(posthog.key)},Object.assign(${JSON.stringify(
              POSTHOG_INIT_OPTIONS,
            )},{api_host:${JSON.stringify(posthog.host)}}));`}
          </Script>
        )}
      </body>
    </html>
  );
}
