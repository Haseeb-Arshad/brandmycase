import { z } from "zod";
import { PLACEMENTS } from "@/data/placements";
import { TIERS, TIER_IDS } from "@/data/sponsorship";

/**
 * Request schemas.
 *
 * Every API route parses its body through one of these before touching the
 * database, so a route handler never sees an unvalidated field. The schemas
 * are the authority: the browser can suggest a tier, a panel or a company
 * name, but only what survives a parse here is written down.
 *
 * Note what a sponsor CANNOT send: an amount, a status, a display name, a
 * display permission. Those are the fields that decide what the public site
 * says about money and about who sponsored what, and they are set by the
 * owner in the database, never by a stranger with a fetch call.
 */

const placementIds = PLACEMENTS.map((p) => p.id) as [string, ...string[]];
const tierIds = TIER_IDS as [string, ...string[]];

/** tier id -> price, so the schema can reject an offer below what a tier costs. */
const TIER_PRICES: Record<string, number> = Object.fromEntries(
  TIERS.map((tier) => [tier.id, tier.priceUsd]),
);

/** Optional free text: blank strings become `undefined` rather than "". */
const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Please keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : undefined));

/**
 * People type "acme.com". Accept it and normalise rather than bouncing the
 * form back over a missing scheme — but store only a real absolute http(s)
 * URL, so nothing that could become a `javascript:` href is ever persisted.
 */
const urlLike = (max = 200, requiredError = "Enter your company website.") =>
  z
    .string({ required_error: requiredError, invalid_type_error: requiredError })
    .trim()
    .min(1, requiredError)
    .max(max, "That URL is too long.")
    .transform((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === "https:" || url.protocol === "http:") &&
          url.hostname.includes(".")
        );
      } catch {
        return false;
      }
    }, "Enter a valid website address.");

const optionalUrl = (max = 200) =>
  z
    .union([z.literal(""), urlLike(max)])
    .optional()
    .transform((value) => (value ? value : undefined));

/**
 * An amount a company offers, in whole dollars.
 *
 * Accepts what a person actually types — "1,500", " 750 ", 500 — and refuses
 * anything that is not a plain positive whole number of dollars. Cents are
 * rejected rather than rounded: an invoice for $250.50 helps nobody.
 */
const offeredAmount = z
  .union([z.number(), z.string()])
  .transform((value) =>
    typeof value === "number" ? value : Number(value.replace(/[$,\s]/g, "")),
  )
  .refine((value) => Number.isFinite(value), "Enter an amount in whole dollars.")
  .refine((value) => Number.isInteger(value), "Whole dollars only, no cents.")
  .refine((value) => value > 0, "Enter an amount greater than zero.")
  .refine((value) => value <= 1_000_000, "Get in touch directly for an amount that size.")
  .optional();

export const sponsorshipInquirySchema = z
  .object({
  tier: z.enum(tierIds, {
    errorMap: () => ({ message: "Choose a sponsorship tier." }),
  }),
  /**
   * What the company offers, if they want to give more than the tier price.
   * Blank means "the tier price". It is never treated as money received — see
   * the migration comment on `proposed_amount_usd`.
   */
  proposedAmountUsd: offeredAmount,
  /** A tier can be sponsored without naming a panel. */
  placementId: z
    .union([z.literal(""), z.enum(placementIds)])
    .optional()
    .transform((value) => (value ? value : undefined)),
  company: z
    .string({
      required_error: "Company name is required.",
      invalid_type_error: "Company name is required.",
    })
    .trim()
    .min(2, "Company name is required.")
    .max(120, "Company name is too long."),
  contactName: z
    .string({
      required_error: "Please tell me who I'm replying to.",
      invalid_type_error: "Please tell me who I'm replying to.",
    })
    .trim()
    .min(2, "Please tell me who I'm replying to.")
    .max(120, "That name is too long."),
  contactEmail: z
    .string({
      required_error: "Enter a valid work email address.",
      invalid_type_error: "Enter a valid work email address.",
    })
    .trim()
    .toLowerCase()
    .max(200, "That email address is too long.")
    .email("Enter a valid work email address."),
  companyUrl: urlLike(200),
  socialUrl: optionalUrl(200),
  message: optionalText(2000, "Please keep the message under 2000 characters."),
  /**
   * The independence acknowledgement. A sponsor confirms in the form that they
   * understand this is not an OpenAI or DevDay sponsorship, so nobody can end
   * up on an invoice believing they bought event rights.
   */
  acknowledged: z.literal(true, {
    errorMap: () => ({
      message:
        "Please confirm you understand this is an independent project, not an official OpenAI or DevDay sponsorship.",
    }),
  }),
  /**
   * Honeypot. A real person never sees this field, so anything in it is a bot.
   * It is validated rather than ignored so a stuffed value is a hard reject.
   */
  companyFax: z
    .string()
    .max(0, "Rejected.")
    .optional()
    .transform(() => undefined),
  })
  /**
   * You may offer more than a tier costs. You may not offer less.
   *
   * The tier decides which panel you get, so an amount below its price is
   * either a misunderstanding or an attempt to buy the medallion for $50.
   * Checked here rather than in the database because this is the one place
   * that knows what a tier costs.
   */
  .superRefine((value, ctx) => {
    const price = TIER_PRICES[value.tier];
    if (price === undefined || value.proposedAmountUsd === undefined) return;
    if (value.proposedAmountUsd < price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proposedAmountUsd"],
        message: `That tier is $${price.toLocaleString("en-US")}. Enter that or more.`,
      });
    }
  });

export type SponsorshipInquiryInput = z.infer<typeof sponsorshipInquirySchema>;

/**
 * FUTURE / DISABLED — the retired auction's bid body.
 * Reachable only when CAMPAIGN_MODE=auction. See docs/13-brand-the-case.md.
 */
export const bidSchema = z.object({
  placementId: z.enum(placementIds, {
    errorMap: () => ({ message: "Unknown panel." }),
  }),
  company: z
    .string()
    .trim()
    .min(2, "Company name is required.")
    .max(80, "Company name is too long."),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  websiteUrl: z
    .string()
    .trim()
    .url("Enter a full URL, including https://")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().trim().max(500).optional(),
  amountUsd: z
    .number({ invalid_type_error: "Enter a bid amount." })
    .int("Bids are in whole dollars.")
    .positive("Enter a bid amount.")
    .max(5_000_000, "Please contact us directly for a bid this size."),
});

export type BidInput = z.infer<typeof bidSchema>;

/** Flatten a ZodError into { field: message } for the form to render inline. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
