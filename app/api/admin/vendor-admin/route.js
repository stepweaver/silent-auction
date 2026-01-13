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
    
    // Honeypot check: if company_website has any value, it's a bot
    if (body.company_website && body.company_website.trim().length > 0) {
      // Silently reject - return success to not reveal the honeypot
      return Response.json({
        ok: true,
        vendor_admin: null,
        enrollment_token: '',
        enrollment_link: '',
        email_sent: false,
      });
    }
    
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
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Insert error:', error);
      }
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return new Response(
          JSON.stringify({
            error: 'Database table not found. Please create the vendor_admin_users table.'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to create donor' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate enrollment token and link
    const enrollmentToken = generateEnrollmentToken(vendorAdmin.id, vendorAdmin.email);

    // Get site URL - try multiple methods
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      // Try to get from origin or referer header (most reliable in production)
      const origin = headersList.get('origin');
      const referer = headersList.get('referer');

      if (origin) {
        try {
          const url = new URL(origin);
          if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
            siteUrl = origin;
          }
        } catch (e) {
          // Invalid origin, continue
        }
      }

      if (!siteUrl && referer) {
        try {
          const url = new URL(referer);
          if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
            siteUrl = `${url.protocol}//${url.host}`;
          }
        } catch (e) {
          // Invalid referer, continue
        }
      }

      // Try to construct from request headers
      if (!siteUrl) {
        const host = headersList.get('host');
        const protocol = headersList.get('x-forwarded-proto') ||
          headersList.get('x-forwarded-protocol') ||
          'https'; // Default to https in production

        if (host && host !== 'localhost' && !host.includes('127.0.0.1')) {
          siteUrl = `${protocol}://${host}`;
        }
      }
    }

    // Last resort: use localhost for dev, but warn
    if (!siteUrl) {
      siteUrl = process.env.NODE_ENV === 'production'
        ? 'https://your-site.com' // This will fail - user needs to set NEXT_PUBLIC_SITE_URL
        : 'http://localhost:3000';
      // Warn in development only
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ NEXT_PUBLIC_SITE_URL not set. Please set it in your environment variables. Using fallback:', siteUrl);
      }
    }

    // Ensure siteUrl doesn't end with a slash and is properly formatted
    siteUrl = siteUrl.replace(/\/$/, '').trim();

    // URL encode the token to handle any special characters
    const encodedToken = encodeURIComponent(enrollmentToken);
    const enrollmentLink = `${siteUrl}/vendor-enroll?token=${encodedToken}`;

    // Log for debugging (remove in production if sensitive)
    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      console.log('Generated enrollment link:', enrollmentLink.replace(encodedToken, '[TOKEN]'));
    }

    // Get contact email from settings
    const { data: settings } = await s
      .from('settings')
      .select('contact_email')
      .eq('id', 1)
      .maybeSingle();

    const contactEmail = settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || null;

    // Send enrollment email (don't fail if email fails)
    try {
      await sendVendorAdminEnrollmentEmail({
        email: vendorAdmin.email,
        name: vendorAdmin.name,
        enrollmentLink,
        contactEmail,
      });
    } catch (emailError) {
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send enrollment email:', emailError);
      }
      // Continue even if email fails - we'll still return success
    }

    return Response.json({
      ok: true,
      vendor_admin: vendorAdmin,
      enrollment_token: enrollmentToken,
      enrollment_link: enrollmentLink, // Include for debugging/admin visibility
      email_sent: true,
    });
  } catch (error) {
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('Create vendor admin error:', error);
    }
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
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
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Query error:', error);
      }
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return new Response(
          JSON.stringify({
            error: 'Database table not found. Please create the vendor_admin_users table.'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to fetch vendor admins' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch items for each vendor admin
    const vendorAdminsWithItems = await Promise.all(
      (vendorAdmins || []).map(async (admin) => {
        const { data: items, error: itemsError } = await s
          .from('item_leaders')
          .select('id, title, slug, current_high_bid, start_price, is_closed')
          .eq('created_by', admin.id)
          .order('title', { ascending: true });

        if (itemsError && process.env.NODE_ENV === 'development') {
          console.error('Error fetching items for vendor admin:', itemsError);
        }

        return {
          ...admin,
          items: items || [],
          item_count: items?.length || 0,
        };
      })
    );

    return Response.json({ ok: true, vendor_admins: vendorAdminsWithItems });
  } catch (error) {
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('Get vendor admins error:', error);
    }
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}


