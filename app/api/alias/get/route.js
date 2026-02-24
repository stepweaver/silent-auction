import { supabaseServer } from '@/lib/serverSupabase';
import { extractIPFromRequest } from '@/lib/ipUtils';
import { getEnrollmentSetCookieHeader } from '@/lib/enrollmentCookie';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email consistently
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : email;

    const s = supabaseServer();

    // Extract current IP from request
    const currentIP = extractIPFromRequest(req);

    // Get user's alias
    const { data: alias, error } = await s
      .from('user_aliases')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Error fetching alias:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return Response.json(
          { error: 'Alias system not initialized. Please run database migration.', alias: null },
          { status: 500 }
        );
      }
      return Response.json(
        { error: 'Error fetching alias', alias: null },
        { status: 500 }
      );
    }

    if (!alias) {
      return Response.json({ alias: null });
    }

    // Update last_known_ip if IP is available and different
    if (currentIP && currentIP !== alias.last_known_ip) {
      // Update IP asynchronously (don't wait for it)
      s.from('user_aliases')
        .update({ last_known_ip: currentIP })
        .eq('email', normalizedEmail)
        .then(() => {
          // Silently succeed
        })
        .catch((err) => {
          // Log but don't fail the request
          if (process.env.NODE_ENV === 'development') {
            console.error('Error updating last_known_ip:', err);
          }
        });
    }

    return Response.json(
      { alias },
      { headers: { 'Set-Cookie': getEnrollmentSetCookieHeader() } }
    );
  } catch (error) {
    console.error('Get alias error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

