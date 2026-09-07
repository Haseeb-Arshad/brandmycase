/**
 * A very small in-process rate limiter.
 *
 * This is a speed bump, not a security boundary. It exists so a single client
 * cannot hammer the inquiry form into a hundred rows in a minute, and it is
 * deliberately the cheapest thing that does that job: a Map in the Node
 * process, no Redis, no third-party service, no new bill.
 *
 * The durable check is in `src/lib/sponsorship.ts`, which counts recent rows
 * for the same email in Supabase. That one survives restarts and multiple
 * instances; this one just absorbs the first burst.
 */

interface Bucket {
  /** Timestamps (ms) of hits still inside the window. */
  hits: number[];
}

const globalForRateLimit = globalThis as unknown as {
  campaignRateBuckets?: Map<string, Bucket>;
};

const buckets =
  globalForRateLimit.campaignRateBuckets ??
  (globalForRateLimit.campaignRateBuckets = new Map<string, Bucket>());

/** Bound the map so a stream of unique keys cannot grow it without limit. */
const MAX_KEYS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest hit leaves the window. */
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (buckets.size > MAX_KEYS) buckets.clear();

  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  const hits = bucket.hits.filter((t) => t > cutoff);

  if (hits.length >= limit) {
    buckets.set(key, { hits });
    const oldest = hits[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, { hits });
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test hook. Never called from application code. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Best-effort client identity from proxy headers.
 *
 * Headers are spoofable, which is exactly why this only ever feeds the soft
 * limiter above and never a decision that matters.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
