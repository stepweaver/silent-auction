/**
 * Client-side helper to get CSRF token for state-changing requests.
 * Call before POST/PATCH/DELETE to /api/bid, /api/alias/create, /api/donate, etc.
 * @returns {Promise<string>} CSRF token or empty string if fetch failed
 */
export async function getCsrfToken() {
  try {
    const res = await fetch('/api/csrf-token');
    if (!res.ok) return '';
    const data = await res.json();
    return data.token || '';
  } catch {
    return '';
  }
}

/**
 * Returns headers object with Content-Type and x-csrf-token for JSON POST requests.
 * @param {string} [csrfToken] - Token from getCsrfToken(); if not provided, will fetch
 * @returns {Promise<{ 'Content-Type': string, 'x-csrf-token'?: string }>}
 */
export async function getJsonHeadersWithCsrf(csrfToken) {
  const token = csrfToken !== undefined ? csrfToken : await getCsrfToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['x-csrf-token'] = token;
  return headers;
}
