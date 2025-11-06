// Simple in-memory rate limiter
// For production, consider using Redis or a dedicated rate limiting service

const rateLimitStore = new Map();

/**
 * Simple rate limiter
 * @param {string} identifier - Unique identifier (IP, email, etc.)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function rateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  // Clean up old records periodically (every 10 minutes)
  if (Math.random() < 0.01) {
    // 1% chance to clean up on each request
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || record.resetAt < now) {
    // New window or expired window
    const newRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, newRecord);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: newRecord.resetAt,
    };
  }

  // Existing window
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Get client identifier from request
 * @param {Request} request - Next.js request object
 * @returns {string} Client identifier
 */
export function getClientIdentifier(request) {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  return ip;
}

/**
 * Rate limit utility for API routes
 * @param {Request} request - Next.js request object
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} identifier - Optional custom identifier (defaults to IP)
 * @returns {{ allowed: boolean, remaining: number, resetAt: number } | null} Rate limit result or null if allowed
 */
export async function checkRateLimit(request, maxRequests = 10, windowMs = 60000, identifier = null) {
  const clientId = identifier || getClientIdentifier(request);
  const result = rateLimit(clientId, maxRequests, windowMs);

  if (!result.allowed) {
    return result;
  }

  return null;
}

