import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { generateEnrollmentToken } from '@/lib/enrollmentToken';
import { sendVendorAdminEnrollmentEmail } from '@/lib/notifications';
import { z } from 'zod';

const VendorAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// POST - Create new vendor admin (super admin only)
export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const body = await req.json();
    const parsed = VendorAdminSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid vendor admin data', { status: 400 });
    }

    const { email, name } = parsed.data;
    const s = supabaseServer();

    // Check if vendor admin already exists
    const { data: existing } = await s
      .from('vendor_admin_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return new Response('Donor with this email already exists', { status: 400 });
    }

    // Generate a simple password (in production, you'd want to email this or use a secure method)
    // For now, we'll create an entry with email and name
    // The password/auth will be handled separately
    const { data: vendorAdmin, error } = await s
      .from('vendor_admin_users')
      .insert({
        email,
        name,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return new Response(
          JSON.stringify({ 
            error: 'Database table not found. Please create the vendor_admin_users table.',
            details: error.message 
          }), 
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to create donor', details: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate enrollment token and link
    const enrollmentToken = generateEnrollmentToken(vendorAdmin.id, vendorAdmin.email);
    
    // Get site URL - use env var, or construct from request headers, or fallback
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      // Try to construct from request headers
      const host = headersList.get('host');
      const protocol = headersList.get('x-forwarded-proto') || 'https';
      if (host) {
        siteUrl = `${protocol}://${host}`;
      } else {
        // Last resort fallback
        siteUrl = 'http://localhost:3000';
        console.warn('NEXT_PUBLIC_SITE_URL not set and could not determine from headers, using localhost fallback');
      }
    }
    
    // Ensure siteUrl doesn't end with a slash
    siteUrl = siteUrl.replace(/\/$/, '');
    
    // URL encode the token to handle any special characters
    const encodedToken = encodeURIComponent(enrollmentToken);
    const enrollmentLink = `${siteUrl}/vendor-enroll?token=${encodedToken}`;

    // Get contact email from settings
    const { data: settings } = await s
      .from('settings')
      .select('contact_email')
      .eq('id', 1)
      .maybeSingle();

    const contactEmail = settings?.contact_email || process.env.AUCTION_CONTACT_EMAIL || null;

    // Send enrollment email (don't fail if email fails)
    try {
      await sendVendorAdminEnrollmentEmail({
        email: vendorAdmin.email,
        name: vendorAdmin.name,
        enrollmentLink,
        contactEmail,
      });
    } catch (emailError) {
      console.error('Failed to send enrollment email:', emailError);
      // Continue even if email fails - we'll still return success
    }

    return Response.json({ 
      ok: true, 
      vendor_admin: vendorAdmin,
      enrollment_token: enrollmentToken,
      email_sent: true,
    });
  } catch (error) {
    console.error('Create vendor admin error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// GET - List all vendor admins (super admin only)
export async function GET() {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const s = supabaseServer();
    const { data: vendorAdmins, error } = await s
      .from('vendor_admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return new Response(
          JSON.stringify({ 
            error: 'Database table not found. Please create the vendor_admin_users table.',
            details: error.message 
          }), 
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to fetch vendor admins', details: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return Response.json({ ok: true, vendor_admins: vendorAdmins || [] });
  } catch (error) {
    console.error('Get vendor admins error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

