import jwt from 'jsonwebtoken';

// JWT secret for vendor admin sessions
// SECURITY: Must be set in production - fail if not provided
const JWT_SECRET = process.env.JWT_SECRET || process.env.VENDOR_JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or VENDOR_JWT_SECRET environment variable must be set');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // Default 7 days

/**
 * Generate a JWT token for vendor admin session
 * @param {string} vendorAdminId - Vendor admin ID
 * @param {string} email - Vendor admin email
 * @returns {string} JWT token
 */
export function generateVendorSessionToken(vendorAdminId, email) {
  const payload = {
    vendorAdminId,
    email,
    type: 'vendor_admin',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'silent-auction',
    audience: 'vendor-admin',
  });
}

/**
 * Verify and decode a JWT token for vendor admin session
 * @param {string} token - JWT token
 * @returns {{ vendorAdminId: string, email: string } | null} Decoded token data or null if invalid
 */
export function verifyVendorSessionToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'silent-auction',
      audience: 'vendor-admin',
    });

    if (decoded.type !== 'vendor_admin') {
      return null;
    }

    return {
      vendorAdminId: decoded.vendorAdminId,
      email: decoded.email,
    };
  } catch (error) {
    // Token is invalid, expired, or malformed
    return null;
  }
}

