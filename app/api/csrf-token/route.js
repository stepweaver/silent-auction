import { generateSignedCSRFToken } from '@/lib/csrf';
import { headers } from 'next/headers';
import { jsonError } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

/**
 * GET - Generate a CSRF token for the client
 * CSRF tokens are tied to the session/request for security
 */
export async function GET() {
  try {
    // Generate a session identifier (can be based on IP or other factors)
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
    
    // Generate CSRF token tied to this session
    const token = generateSignedCSRFToken(ip);
    
    return Response.json({ 
      token,
      // Token expires in 1 hour (matching verifySignedCSRFToken default)
    });
  } catch (error) {
    logError('CSRF token generation error', error);
    return jsonError('Internal server error', 500);
  }
}

