import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

const DEFAULTS: RateLimitConfig = {
  limit: 60,
  windowSeconds: 60,
};

/** Stricter limit for expensive operations (e.g. AI generation) */
export const STRICT_LIMIT: RateLimitConfig = {
  limit: 10,
  windowSeconds: 60,
};

/**
 * Check rate limit for a given identifier (typically userId or IP).
 * Returns null if allowed, or a NextResponse with 429 if exceeded.
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULTS
): NextResponse | null {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return null;
  }

  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  entry.count++;
  return null;
}
