/**
 * In-memory sliding-window rate limiter. Best-effort per serverless instance
 * (each lambda keeps its own counters; not shared across regions) — good
 * enough to stop casual abuse and quota burn; not a cryptographic control.
 *
 * Prune happens lazily on write and with a hard cap on tracked keys to bound
 * memory.
 */

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 10_000;

function prune(now: number): void {
  if (buckets.size <= MAX_KEYS) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
  if (buckets.size > MAX_KEYS) {
    // Still too large — drop the entries closest to expiring.
    const byExpiry = [...buckets.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    for (const [key] of byExpiry.slice(0, buckets.size - MAX_KEYS)) {
      buckets.delete(key);
    }
  }
}

/**
 * Attempt `limit` actions per `windowMs` for `key`. Returns whether the call
 * may proceed and, if not, seconds until the window resets.
 */
export function rateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const id = `${bucket}:${key}`;
  const existing = buckets.get(id);
  if (!existing || existing.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (existing.count < limit) {
    existing.count += 1;
    return { ok: true, remaining: limit - existing.count };
  }
  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
