import { sendAliasAccessNotification } from '@/lib/notifications';
import { supabaseServer } from '@/lib/serverSupabase';
import { extractIPFromRequest, isSignificantlyDifferentIP } from '@/lib/ipUtils';

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

    // Extract current IP from request
    const currentIP = extractIPFromRequest(req);

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

    // Check if IP is significantly different
    const lastKnownIP = alias.last_known_ip;
    if (!isSignificantlyDifferentIP(lastKnownIP, currentIP)) {
      // Same location, no need to alert
      return Response.json({ sent: false, reason: 'same_location' });
    }

    // Check cooldown: max 1 security notification per week per user
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    if (alias.last_security_notification_sent) {
      const lastSent = new Date(alias.last_security_notification_sent);
      if (lastSent > oneWeekAgo) {
        // Within cooldown period, skip sending
        return Response.json({ sent: false, reason: 'cooldown' });
      }
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
        contactEmail: settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || null,
        siteUrl,
      });

      // Update last_security_notification_sent timestamp and store current IP
      await s
        .from('user_aliases')
        .update({ 
          last_security_notification_sent: new Date().toISOString(),
          last_known_ip: currentIP 
        })
        .eq('email', email);

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

