/**
 * Rate limit interface.
 * Current implementation: in-memory (per-instance). Suitable for single-instance or low traffic.
 *
 * Upgrade path for production/multi-instance:
 * - Replace with Redis (e.g. @upstash/ratelimit) or Vercel KV
 * - Implement same interface: checkRateLimit(request, maxRequests, windowMs, identifier?)
 * - Returns null if allowed, or { allowed: false, remaining: 0, resetAt } if rate limited
 */
export { checkRateLimit, getClientIdentifier, rateLimit } from '@/lib/rateLimit';
