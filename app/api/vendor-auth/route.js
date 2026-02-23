import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { verifyEnrollmentToken } from '@/lib/enrollmentToken';
import { generateVendorSessionToken, verifyVendorSessionToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rateLimit';
import { jsonError } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';
import { z } from 'zod';

const AuthSchema = z.object({
  email: z.string().email().optional(),
  token: z.string().optional(),
}).refine(data => data.email || data.token, {
  message: 'Either email or token must be provided',
});

// POST - Authenticate donor (returns JWT session token)
// Supports both email-based and token-based authentication
export async function POST(req) {
  try {
    // Rate limiting: 5 requests per 15 minutes per IP
    const rateLimitResult = await checkRateLimit(req, 5, 15 * 60 * 1000);
    if (rateLimitResult) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
          }
        }
      );
    }

    const body = await req.json();
    
    // Honeypot check: if company_website has any value, it's a bot
    if (body.company_website && body.company_website.trim().length > 0) {
      // Silently reject - return success to not reveal the honeypot
      return Response.json({
        ok: true,
        token: 'invalid',
        vendor_admin_id: 0,
        email: body.email || '',
        name: '',
      });
    }
    
    const parsed = AuthSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Invalid request: provide either email or token', 400);
    }

    const { email, token } = parsed.data;
    const s = supabaseServer();
    let vendorAdmin;

    // Token-based authentication (for enrollment links)
    if (token) {
      const tokenData = verifyEnrollmentToken(token);
      if (!tokenData) {
        return jsonError('Invalid or expired enrollment token', 401);
      }

      // Verify donor exists and matches token
      const { data, error } = await s
        .from('vendor_admin_users')
        .select('*')
        .eq('id', tokenData.id)
        .eq('email', tokenData.email)
        .maybeSingle();

      if (error) {
        logError('Vendor auth query error', error);
        return jsonError('Authentication error', 500);
      }

      if (!data) {
        return jsonError('Donor not found', 401);
      }

      vendorAdmin = data;
    }
    else if (email) {
      const { data, error } = await s
        .from('vendor_admin_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        logError('Vendor auth query error', error);
        return jsonError('Authentication error', 500);
      }

      if (!data) {
        return jsonError('Donor not found', 401);
      }

      vendorAdmin = data;
    } else {
      return jsonError('Invalid request: provide either email or token', 400);
    }

    // Generate JWT session token
    const sessionToken = generateVendorSessionToken(vendorAdmin.id, vendorAdmin.email);

    return Response.json({
      ok: true,
      token: sessionToken,
      vendor_admin_id: vendorAdmin.id, // Keep for backward compatibility
      email: vendorAdmin.email,
      name: vendorAdmin.name,
    });
  } catch (error) {
    logError('Vendor auth error', error);
    return jsonError('Internal server error', 500);
  }
}

// GET - Verify donor session (supports both JWT and legacy header-based auth)
export async function GET(req) {
  const headersList = await headers();
  
  // Try JWT token first (new method)
  const authHeader = headersList.get('authorization');
  let tokenData = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    tokenData = verifyVendorSessionToken(token);
  }

  // Fallback to legacy header-based auth for backward compatibility
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  
  if (!tokenData && !vendorAdminId) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const s = supabaseServer();
    let vendorAdmin;

    if (tokenData) {
      // Use JWT token data
      const { data, error } = await s
        .from('vendor_admin_users')
        .select('*')
        .eq('id', tokenData.vendorAdminId)
        .eq('email', tokenData.email)
        .maybeSingle();

      if (error || !data) {
        return jsonError('Unauthorized', 401);
      }

      vendorAdmin = data;
    } else {
      const { data, error } = await s
        .from('vendor_admin_users')
        .select('*')
        .eq('id', vendorAdminId)
        .maybeSingle();

      if (error || !data) {
        return jsonError('Unauthorized', 401);
      }

      vendorAdmin = data;
    }

    return Response.json({
      ok: true,
      vendor_admin: vendorAdmin,
    });
  } catch (error) {
    logError('Verify vendor auth error', error);
    return jsonError('Internal server error', 500);
  }
}

