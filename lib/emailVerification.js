import crypto from 'crypto';

// Secret key for signing verification tokens
// SECURITY: Must be set in production - fail if not provided
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET || process.env.ENROLLMENT_SECRET;

if (!VERIFICATION_SECRET) {
  throw new Error('VERIFICATION_SECRET or ENROLLMENT_SECRET environment variable must be set');
}

/**
 * Generate a verification token for email verification
 * Token format: base64(email:timestamp:signature)
 */
export function generateVerificationToken(email) {
  const timestamp = Date.now();
  const payload = `${email}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', VERIFICATION_SECRET)
    .update(payload)
    .digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verify and decode a verification token
 * Returns { email, timestamp } if valid, null otherwise
 * Tokens expire after 24 hours
 */
export function verifyVerificationToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [email, timestamp, signature] = decoded.split(':');

    if (!email || !timestamp || !signature) {
      return null;
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (tokenAge > maxAge) {
      return null; // Token expired
    }

    // Verify signature
    const payload = `${email}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', VERIFICATION_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return null;
    }

    return { email, timestamp: parseInt(timestamp, 10) };
  } catch (error) {
    return null;
  }
}

