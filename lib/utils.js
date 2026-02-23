/**
 * Generic utilities used across the app.
 */

export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/** Retry an async function on 503/network errors with backoff. */
export async function withRetry(fn, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable =
        err?.message?.includes('503') ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('fetch');
      if (attempt < maxAttempts && isRetryable) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

/** Seconds since the given ISO date string. */
export function secondsAgo(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return (Date.now() - t) / 1000;
}

/** Short human-readable "X ago" for seconds. */
export function formatAgoShort(sec) {
  if (sec == null || sec < 0) return '';
  if (sec < 5) return 'just now';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3600)}h`;
}
