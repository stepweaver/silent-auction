/**
 * Vendor session cookie helpers.
 * Session is stored as HttpOnly cookie containing signed JWT.
 * No client-side access to session; all vendor API calls use credentials: 'include'.
 */

import { verifyVendorSessionToken } from '@/lib/jwt';

const COOKIE_NAME = 'vendor_session';
const MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days

/**
 * Returns the Set-Cookie header value for vendor session.
 * @param {string} token - JWT session token from generateVendorSessionToken
 * @returns {string} Set-Cookie header value
 */
export function getVendorSessionSetCookieHeader(token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
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
 * Returns the Set-Cookie header value to clear vendor session.
 * @returns {string} Set-Cookie header value
 */
export function getVendorSessionClearCookieHeader() {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Parse vendor session token from Cookie header.
 * @param {string} cookieHeader - Value of Cookie header
 * @returns {string | null} Token or null
 */
export function getVendorSessionFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? match[1].trim() || null : null;
}

/**
 * Verify vendor session from cookie and return vendor admin ID.
 * @param {string} cookieHeader - Value of Cookie header
 * @returns {string | null} vendorAdminId or null
 */
export function getVendorAdminIdFromSession(cookieHeader) {
  const token = getVendorSessionFromCookieHeader(cookieHeader);
  if (!token) return null;
  const data = verifyVendorSessionToken(token);
  return data ? data.vendorAdminId : null;
}
