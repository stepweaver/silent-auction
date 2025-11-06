import { sendAliasAccessNotification } from '@/lib/notifications';
import { supabaseServer } from '@/lib/serverSupabase';

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

    const s = supabaseServer();

    // Get user's alias
    const { data: alias, error } = await s
      .from('user_aliases')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching alias for security notification:', error);
      return Response.json(
        { error: 'Error fetching alias', sent: false },
        { status: 500 }
      );
    }

    if (!alias) {
      // No alias exists, no need to send notification
      return Response.json({ sent: false });
    }

    // Get settings for contact email and site URL
    const { data: settings } = await s
      .from('settings')
      .select('contact_email')
      .eq('id', 1)
      .maybeSingle();

    // Send security notification email
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      await sendAliasAccessNotification({
        email,
        alias: alias.alias,
        contactEmail: settings?.contact_email || process.env.AUCTION_CONTACT_EMAIL || null,
        siteUrl,
      });

      return Response.json({ sent: true });
    } catch (emailError) {
      console.error('Error sending security notification email:', emailError);
      return Response.json(
        { error: 'Error sending email', sent: false },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Security notification error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

