import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: "CODEC — Brand the case",
  description:
    "Twenty brandable panels across five faces of a moulded travel case, auctioned to companies. San Francisco for DevDay, then eleven cities after it.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "CODEC — Brand the case",
    description:
      "Twenty measured panels on a case that spends a year in the rooms you are trying to reach.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
