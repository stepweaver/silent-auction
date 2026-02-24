/**
 * Server-side enrollment cookie for auction access control.
 * Set when user verifies email or creates alias; checked by middleware.
 */

const COOKIE_NAME = 'auction_enrolled';
const MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

/**
 * Returns the value for the Set-Cookie header to mark the user as enrolled.
 * Use in API route responses (verify-email, alias/create).
 * @returns {string} Set-Cookie header value
 */
export function getEnrollmentSetCookieHeader() {
  const value = '1';
  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Check if the request has the enrollment cookie (used by middleware).
 * @param {Request} request - Next.js request
 * @returns {boolean}
 */
export function hasEnrollmentCookie(request) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match != null && match[1] === '1';
}
