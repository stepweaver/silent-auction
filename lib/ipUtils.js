/**
 * IP address utilities for security notifications
 */

/**
 * Extract IP address from request headers
 * @param {Request} request - Next.js request object
 * @returns {string|null} IP address or null if not found
 */
export function extractIPFromRequest(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || null;
  return ip;
}

/**
 * Check if two IP addresses are significantly different
 * Significant difference means:
 * - Different first octet (completely different network)
 * - Different subnet (first 3 octets different)
 * - First time (no previous IP stored)
 * @param {string|null} ip1 - Previous IP address
 * @param {string|null} ip2 - Current IP address
 * @returns {boolean} True if significantly different, false otherwise
 */
export function isSignificantlyDifferentIP(ip1, ip2) {
  // First time access - always alert
  if (!ip1 || !ip2) return true;
  
  // Parse IPv4 addresses
  const parts1 = ip1.split('.').map(Number);
  const parts2 = ip2.split('.').map(Number);
  
  // Invalid format - treat as different
  if (parts1.length !== 4 || parts2.length !== 4) return true;
  
  // Check for invalid numbers (NaN)
  if (parts1.some(isNaN) || parts2.some(isNaN)) return true;
  
  // Different first octet = completely different network
  if (parts1[0] !== parts2[0]) return true;
  
  // Different subnet (first 3 octets) = significantly different location
  if (parts1[1] !== parts2[1] || parts1[2] !== parts2[2]) return true;
  
  // Same subnet, not significantly different
  return false;
}

