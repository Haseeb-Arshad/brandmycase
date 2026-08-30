import { z } from "zod";
import { PLACEMENTS } from "@/data/placements";

/**
 * Request schemas.
 *
 * Every API route parses its body through one of these before touching the
 * database, so a route handler never sees an unvalidated field.
 */

const placementIds = PLACEMENTS.map((p) => p.id) as [string, ...string[]];

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
