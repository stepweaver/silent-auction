import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { z } from 'zod';

const AuthSchema = z.object({
  email: z.string().email(),
});

// POST - Authenticate vendor admin (returns session token)
export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = AuthSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid email', { status: 400 });
    }

    const { email } = parsed.data;
    const s = supabaseServer();

    // Check if vendor admin exists
    const { data: vendorAdmin, error } = await s
      .from('vendor_admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Query error:', error);
      return new Response('Authentication error', { status: 500 });
    }

    if (!vendorAdmin) {
      return new Response('Vendor admin not found', { status: 401 });
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
    console.error('Vendor auth error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// GET - Verify vendor admin session
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
    console.error('Verify vendor auth error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

