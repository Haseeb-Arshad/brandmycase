#!/usr/bin/env node
/**
 * Production preflight.
 *
 *   npm run preflight
 *
 * Reads the environment the way the application does and reports what would
 * actually happen if this configuration were deployed. It is deliberately a
 * separate command rather than a build step: a developer running `npm run
 * build` on a laptop with no production secrets should not be blocked, and a
 * deployment pipeline should be told loudly, once, before it ships.
 *
 * It also lists what Haseeb has not supplied yet — the portrait, the real
 * inbox, the acceptance proof, the budget. Those are not errors: the site is
 * built to render honestly without them. They are the difference between a
 * page that works and a page that converts.
 *
 * Exits non-zero on anything that would be unsafe or broken in production.
 * Plain Node with no dependencies, so it runs anywhere `node` does.
 */

// Next loads .env itself; this script runs standalone, so read it the same way
// for local use. Real deployments set variables in the environment and this
// loop finds nothing, which is correct.
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const value = (name) => {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.trim() : undefined;
};

const isProduction =
  value("NODE_ENV") === "production" || process.argv.includes("--production");
const campaignMode =
  value("CAMPAIGN_MODE")?.toLowerCase() === "auction" ? "auction" : "interest";

const errors = [];
const warnings = [];
const notes = [];
const missing = [];

// --- Campaign and payments -------------------------------------------------

const safepay = ["SAFEPAY_PUBLIC_KEY", "SAFEPAY_SECRET_KEY", "SAFEPAY_WEBHOOK_SECRET"];
const safepaySet = safepay.filter((name) => value(name));

let paymentMode;
if (campaignMode !== "auction") {
  paymentMode = "disabled";
} else if (safepaySet.length === 3) {
  paymentMode = "live";
} else if (safepaySet.length > 0) {
  paymentMode = "misconfigured";
} else {
  paymentMode = isProduction ? "disabled" : "mock";
}

notes.push(`campaign mode: ${campaignMode}`);
notes.push(`payment mode:  ${paymentMode}`);

if (campaignMode === "auction") {
  errors.push(
    "CAMPAIGN_MODE is 'auction'. The sponsorship campaign runs in 'interest' mode and takes no payment. " +
      "Unset it, or read docs/13-brand-the-case.md before shipping an auction.",
  );
}
if (paymentMode === "misconfigured") {
  errors.push(
    `Safepay is half configured (${safepaySet.join(", ")} set). Set all three or none.`,
  );
}
if (paymentMode === "mock" && isProduction) {
  errors.push("Mock payments resolved in a production environment. This must never happen.");
}
if (campaignMode !== "auction" && safepaySet.length > 0) {
  warnings.push(
    `Safepay credentials are present but unused (${safepaySet.join(", ")}). ` +
      "They are inert in interest mode; remove them from production to keep the surface small.",
  );
}

// --- Supabase --------------------------------------------------------------

if (!value("SUPABASE_URL")) {
  errors.push("SUPABASE_URL is not set. Sponsorship inquiries cannot be stored.");
}
if (!value("SUPABASE_SECRET_KEY")) {
  errors.push("SUPABASE_SECRET_KEY is not set. Sponsorship inquiries cannot be stored.");
}
for (const name of Object.keys(process.env)) {
  if (
    name.startsWith("NEXT_PUBLIC_") &&
    /secret|service_role|sb_secret/i.test(String(process.env[name] ?? ""))
  ) {
    errors.push(
      `${name} looks like it contains a server secret. NEXT_PUBLIC_* values ship to the browser.`,
    );
  }
}

// --- Public site -----------------------------------------------------------

const siteUrl = value("NEXT_PUBLIC_SITE_URL");
if (!siteUrl) {
  errors.push(
    "NEXT_PUBLIC_SITE_URL is not set. Metadata, canonical URLs and the share image will point at localhost.",
  );
} else if (isProduction && siteUrl.startsWith("http://")) {
  errors.push(`NEXT_PUBLIC_SITE_URL is not HTTPS (${siteUrl}).`);
}

const contact = value("NEXT_PUBLIC_CONTACT_EMAIL");
if (!contact) {
  const message =
    "NEXT_PUBLIC_CONTACT_EMAIL is not set. The site will show no email address and will " +
    "direct people to the sponsorship form instead. That works, but a cold-email campaign " +
    "should give the recipient a person to reply to.";
  if (isProduction) errors.push(message);
  else warnings.push(message);
} else if (/example\.(com|org|net)$/i.test(contact) || contact.endsWith(".example")) {
  errors.push(`NEXT_PUBLIC_CONTACT_EMAIL is a placeholder address (${contact}). Use a real inbox.`);
}

// --- Analytics -------------------------------------------------------------

const analyticsSrc = value("NEXT_PUBLIC_ANALYTICS_SRC");
const analyticsDomain = value("NEXT_PUBLIC_ANALYTICS_DOMAIN");
if (Boolean(analyticsSrc) !== Boolean(analyticsDomain)) {
  warnings.push(
    "Analytics is half configured. Both NEXT_PUBLIC_ANALYTICS_SRC and NEXT_PUBLIC_ANALYTICS_DOMAIN " +
      "are needed; with one missing, no script is loaded at all.",
  );
}

// --- What the owner still has to supply ------------------------------------
//
// None of these are errors. Each one is something the interface renders
// honestly without — and something a sponsor would rather see.

if (!value("NEXT_PUBLIC_FOUNDER_PHOTO")) {
  missing.push("NEXT_PUBLIC_FOUNDER_PHOTO — a portrait. The founder card shows a monogram until then.");
}
if (!value("NEXT_PUBLIC_ACCEPTANCE_PROOF_IMAGE")) {
  missing.push(
    'NEXT_PUBLIC_ACCEPTANCE_PROOF_IMAGE — a redacted acceptance screenshot. The proof card says "available to prospective sponsors" until then.',
  );
}
if (
  !["GITHUB", "LINKEDIN", "X", "WEBSITE"].some((key) => value(`NEXT_PUBLIC_${key}_URL`))
) {
  missing.push(
    "NEXT_PUBLIC_GITHUB_URL / LINKEDIN / X / WEBSITE — no profile links are set, so the founder section has nothing to verify him against.",
  );
}
if (
  !["TRAVEL", "ACCOMMODATION", "TRANSPORT", "CASE", "OTHER"].some((key) =>
    value(`NEXT_PUBLIC_BUDGET_${key}_USD`),
  )
) {
  missing.push(
    "NEXT_PUBLIC_BUDGET_*_USD — no budget figures. The section lists categories and says the split is not published yet.",
  );
}
if (!value("NEXT_PUBLIC_EVENT_DATE")) {
  missing.push("NEXT_PUBLIC_EVENT_DATE — no date is stated anywhere on the page.");
}

// --- Report ----------------------------------------------------------------

console.log("\nBrand the Case — preflight\n");
for (const note of notes) console.log(`  · ${note}`);
console.log("");

for (const warning of warnings) console.log(`  WARN   ${warning}\n`);
for (const error of errors) console.log(`  ERROR  ${error}\n`);

if (missing.length) {
  console.log("  Not supplied yet (the site renders honestly without these):\n");
  for (const item of missing) console.log(`    - ${item}`);
  console.log("");
}

if (errors.length) {
  console.log(`Preflight failed: ${errors.length} problem(s) to fix before deploying.\n`);
  process.exit(1);
}

console.log(
  warnings.length
    ? `Preflight passed with ${warnings.length} warning(s).\n`
    : "Preflight passed.\n",
);
