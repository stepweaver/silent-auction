/**
 * Standardized API response helpers. All API routes should return JSON with
 * { ok, error? } so clients can consistently parse and display errors.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * JSON error response. Use for all error statuses.
 * @param {string} error - User-facing error message
 * @param {number} status - HTTP status (default 400)
 */
export function jsonError(error, status = 400) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * JSON success response.
 * @param {object} data - Payload (e.g. { ok: true, item } or { ok: true })
 * @param {number} status - HTTP status (default 200)
 */
export function jsonSuccess(data = { ok: true }, status = 200) {
  const body = { ok: true, ...data };
  if (body.ok === undefined) body.ok = true;
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * 401 Unauthorized with JSON body. Optionally include WWW-Authenticate for Basic auth.
 * @param {string} error - Message (default 'Unauthorized')
 * @param {object} opts - { basicRealm: string } to add WWW-Authenticate header
 */
export function jsonUnauthorized(error = 'Unauthorized', opts = {}) {
  const headers = { ...JSON_HEADERS };
  if (opts.basicRealm) {
    headers['WWW-Authenticate'] = `Basic realm="${opts.basicRealm}"`;
  }
  return new Response(JSON.stringify({ ok: false, error }), {
    status: 401,
    headers,
  });
}
