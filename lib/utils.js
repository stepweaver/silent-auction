/**
 * Generic utilities used across the app.
 */

export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/** Run an async function with a timeout. Rejects with a timeout error if it exceeds ms. */
export function withTimeout(fn, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timed out. Please check your connection and try again.'));
    }, ms);
    Promise.resolve(fn())
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Retry an async function on 503/network/timeout errors with backoff. */
export async function withRetry(fn, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err?.message ?? '';
      const isRetryable =
        msg.includes('503') ||
        msg.includes('timeout') ||
        msg.includes('fetch') ||
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('Load failed') ||
        msg.includes('Network request failed') ||
        msg.includes('ERR_NETWORK') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('connection');
      if (attempt < maxAttempts && isRetryable) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

/** Run fn with a timeout and optional retries. Good for slow/unreliable networks. */
export async function withTimeoutAndRetry(fn, { timeoutMs = 20000, maxAttempts = 2 } = {}) {
  return withRetry(() => withTimeout(fn, timeoutMs), maxAttempts);
}

/** fetch() with a timeout. Aborts the request if it takes longer than ms. */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  }
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
