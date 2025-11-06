import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { verifyEnrollmentToken } from '@/lib/enrollmentToken';
import { z } from 'zod';

const AuthSchema = z.object({
  email: z.string().email().optional(),
  token: z.string().optional(),
}).refine(data => data.email || data.token, {
  message: 'Either email or token must be provided',
});

// POST - Authenticate donor (returns session token)
// Supports both email-based and token-based authentication
export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = AuthSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid request: provide either email or token', { status: 400 });
    }

    const { email, token } = parsed.data;
    const s = supabaseServer();
    let vendorAdmin;

    // Token-based authentication (for enrollment links)
    if (token) {
      const tokenData = verifyEnrollmentToken(token);
      if (!tokenData) {
        return new Response('Invalid or expired enrollment token', { status: 401 });
      }

      // Verify donor exists and matches token
      const { data, error } = await s
        .from('vendor_admin_users')
        .select('*')
        .eq('id', tokenData.id)
        .eq('email', tokenData.email)
        .maybeSingle();

      if (error) {
        // Log error server-side only, don't expose details to client
        if (process.env.NODE_ENV === 'development') {
          console.error('Query error:', error);
        }
        return new Response('Authentication error', { status: 500 });
      }

      if (!data) {
        return new Response('Donor not found', { status: 401 });
      }

      vendorAdmin = data;
    }
    // Email-based authentication (legacy)
    else if (email) {
      const { data, error } = await s
        .from('vendor_admin_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        // Log error server-side only, don't expose details to client
        if (process.env.NODE_ENV === 'development') {
          console.error('Query error:', error);
        }
        return new Response('Authentication error', { status: 500 });
      }

      if (!data) {
        return new Response('Donor not found', { status: 401 });
      }

      vendorAdmin = data;
    } else {
      return new Response('Invalid request: provide either email or token', { status: 400 });
    }

    // Generate a simple session token (in production, use JWT or similar)
    // For now, we'll just return the vendor admin ID
    // In a real app, you'd want proper session management
    return Response.json({
      ok: true,
      vendor_admin_id: vendorAdmin.id,
      email: vendorAdmin.email,
      name: vendorAdmin.name,
    });
  } catch (error) {
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('Vendor auth error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}

// GET - Verify donor session
export async function GET() {
  const headersList = headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');

  if (!vendorAdminId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const s = supabaseServer();
    const { data: vendorAdmin, error } = await s
      .from('vendor_admin_users')
      .select('*')
      .eq('id', vendorAdminId)
      .maybeSingle();

    if (error || !vendorAdmin) {
      return new Response('Unauthorized', { status: 401 });
    }

    return Response.json({
      ok: true,
      vendor_admin: vendorAdmin,
    });
  } catch (error) {
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('Verify vendor auth error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}

