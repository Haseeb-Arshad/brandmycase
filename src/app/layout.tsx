import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { analyticsScript } from "@/lib/analytics";
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
  // Privacy-conscious analytics, loaded only when both variables are set. No
  // script configured means no third-party request and no cookie at all.
  const analytics = analyticsScript();

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
      </body>
    </html>
  );
}
