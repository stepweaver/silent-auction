import crypto from 'crypto';

// Secret key for signing tokens (in production, use an environment variable)
const ENROLLMENT_SECRET = process.env.ENROLLMENT_SECRET || 'silent-auction-enrollment-secret-change-in-production';

/**
 * Generate an enrollment token for a vendor admin
 * Token format: base64(id:email:signature)
 */
export function generateEnrollmentToken(vendorAdminId, email) {
  const payload = `${vendorAdminId}:${email}`;
  const signature = crypto
    .createHmac('sha256', ENROLLMENT_SECRET)
    .update(payload)
    .digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verify and decode an enrollment token
 * Returns { id, email } if valid, null otherwise
 */
export function verifyEnrollmentToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [id, email, signature] = decoded.split(':');
    
    if (!id || !email || !signature) {
      return null;
    }
    
    // Verify signature
    const payload = `${id}:${email}`;
    const expectedSignature = crypto
      .createHmac('sha256', ENROLLMENT_SECRET)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    return { id, email };
  } catch (error) {
    return null;
  }
}

