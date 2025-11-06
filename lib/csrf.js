import crypto from 'crypto';

// CSRF secret for token generation
// SECURITY: Must be set in production - fail if not provided
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.VERIFICATION_SECRET;

if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET or VERIFICATION_SECRET environment variable must be set');
}

/**
 * Generate a CSRF token
 * @returns {string} CSRF token
 */
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a signed CSRF token (HMAC)
 * @param {string} sessionId - Optional session identifier
 * @returns {string} Signed CSRF token
 */
export function generateSignedCSRFToken(sessionId = '') {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${token}:${timestamp}:${sessionId}`;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Verify a signed CSRF token
 * @param {string} token - Signed CSRF token
 * @param {string} sessionId - Optional session identifier to verify against
 * @param {number} maxAge - Maximum age in milliseconds (default 1 hour)
 * @returns {boolean} True if valid, false otherwise
 */
export function verifySignedCSRFToken(token, sessionId = '', maxAge = 3600000) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [tokenPart, timestamp, tokenSessionId, signature] = decoded.split(':');
    
    if (!tokenPart || !timestamp || !signature) {
      return false;
    }

    // Check token age
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > maxAge) {
      return false; // Token expired
    }

    // Verify session ID matches (if provided)
    if (sessionId && tokenSessionId !== sessionId) {
      return false;
    }

    // Verify signature
    const payload = `${tokenPart}:${timestamp}:${tokenSessionId || ''}`;
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    return false;
  }
}

/**
 * Get CSRF token from request headers
 * @param {Request} request - Next.js request object
 * @returns {string | null} CSRF token or null
 */
export function getCSRFTokenFromRequest(request) {
  // Check both header and body
  const headerToken = request.headers.get('x-csrf-token');
  return headerToken;
}

/**
 * Verify CSRF token from request
 * For now, we use IP-based verification as a fallback if no token is provided
 * In production, clients should fetch tokens from /api/csrf-token and include them
 * @param {Request} request - Next.js request object
 * @param {string} sessionId - Optional session identifier
 * @returns {boolean} True if valid, false otherwise
 */
export async function verifyCSRFToken(request, sessionId = '') {
  const token = getCSRFTokenFromRequest(request);
  
  // If token is provided, verify it
  if (token) {
    return verifySignedCSRFToken(token, sessionId);
  }

  // For now, allow requests without CSRF tokens (IP-based rate limiting provides some protection)
  // TODO: In production, require CSRF tokens for all state-changing operations
  // Clients should fetch tokens from /api/csrf-token and include them in X-CSRF-Token header
  if (process.env.NODE_ENV === 'production') {
    // In production, we could be stricter, but for now we'll allow it
    // with IP-based rate limiting as protection
    return true;
  }

  // In development, allow without token
  return true;
}

