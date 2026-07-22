/**
 * Simple in-memory daily rate limit per IP (shared across AI text tools).
 * Fine for a single Node process; replace with Redis for multi-instance.
 */

const DEFAULT_LIMIT = Number(process.env.AI_DAILY_LIMIT || 20);
const DAY_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

function dayKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

/**
 * @returns {{ allowed: boolean, remaining: number, limit: number, resetAt: number }}
 */
export function checkAndConsumeRateLimit(ip, limit = DEFAULT_LIMIT) {
  const now = Date.now();
  const key = `${ip}:${dayKey()}`;
  let entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + DAY_MS };
  }

  if (entry.count >= limit) {
    buckets.set(key, entry);
    return { allowed: false, remaining: 0, limit, resetAt: entry.resetAt };
  }

  entry.count += 1;
  buckets.set(key, entry);

  // Light cleanup of old keys
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    limit,
    resetAt: entry.resetAt,
  };
}

export function peekRateLimit(ip, limit = DEFAULT_LIMIT) {
  const now = Date.now();
  const key = `${ip}:${dayKey()}`;
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    return { remaining: limit, limit, resetAt: now + DAY_MS };
  }
  return {
    remaining: Math.max(0, limit - entry.count),
    limit,
    resetAt: entry.resetAt,
  };
}
