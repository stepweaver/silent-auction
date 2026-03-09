import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { verifyEnrollmentToken } from '@/lib/enrollmentToken';
import { generateVendorSessionToken } from '@/lib/jwt';
import { getVendorSessionSetCookieHeader, getVendorSessionClearCookieHeader, getVendorAdminIdFromSession } from '@/lib/auth/session';
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

// POST - Authenticate vendor (sets HttpOnly session cookie)
export async function POST(req) {
  try {
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

    if (body.company_website && body.company_website.trim().length > 0) {
      return Response.json({
        ok: true,
        vendor_admin_id: null,
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

    if (token) {
      const tokenData = verifyEnrollmentToken(token);
      if (!tokenData) {
        return jsonError('Invalid or expired enrollment token', 401);
      }

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
    } else if (email) {
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

    const sessionToken = generateVendorSessionToken(vendorAdmin.id, vendorAdmin.email);
    const setCookieHeader = getVendorSessionSetCookieHeader(sessionToken);

    return Response.json(
      {
        ok: true,
        vendor_admin_id: vendorAdmin.id,
        email: vendorAdmin.email,
        name: vendorAdmin.name,
      },
      { headers: { 'Set-Cookie': setCookieHeader } }
    );
  } catch (error) {
    logError('Vendor auth error', error);
    return jsonError('Internal server error', 500);
  }
}

// GET - Verify session (cookie only) or logout
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('logout') === '1') {
    const clearCookieHeader = getVendorSessionClearCookieHeader();
    return Response.json(
      { ok: true, logged_out: true },
      { headers: { 'Set-Cookie': clearCookieHeader } }
    );
  }

  const headersList = await headers();
  const cookieHeader = headersList.get('cookie');
  const vendorAdminId = getVendorAdminIdFromSession(cookieHeader);

  if (!vendorAdminId) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const s = supabaseServer();
    const { data, error } = await s
      .from('vendor_admin_users')
      .select('*')
      .eq('id', vendorAdminId)
      .maybeSingle();

    if (error || !data) {
      return jsonError('Unauthorized', 401);
    }

    return Response.json({
      ok: true,
      vendor_admin: data,
    });
  } catch (error) {
    logError('Verify vendor auth error', error);
    return jsonError('Internal server error', 500);
  }
}
