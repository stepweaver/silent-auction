import { supabaseServer } from '@/lib/serverSupabase';
import { DonationSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyCSRFToken } from '@/lib/csrf';

export async function POST(req) {
  try {
    const rateLimitResult = await checkRateLimit(req, 10, 60 * 1000);
    if (rateLimitResult) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please slow down.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const csrfValid = await verifyCSRFToken(req);
    if (!csrfValid) {
      return new Response('Invalid or missing CSRF token', { status: 403 });
    }

    const body = await req.json();
    const parsed = DonationSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid request data', { status: 400 });
    }

    const { donor_name, email, amount, message } = parsed.data;
    const s = supabaseServer();

    // Check auction is not closed
    const { data: settings, error: settingsError } = await s
      .from('settings')
      .select('auction_closed, auction_deadline')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      return new Response('Settings not found', { status: 500 });
    }

    if (settings?.auction_closed) {
      return new Response('The auction is closed. Donations are no longer being accepted.', { status: 400 });
    }

    const now = new Date();
    const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
    if (deadline && now >= deadline) {
      return new Response('The auction deadline has passed. Donations are no longer being accepted.', { status: 400 });
    }

    // Require verified email
    const { data: verifiedEmail } = await s
      .from('verified_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (!verifiedEmail) {
      return new Response('Please verify your email address first. Check your email for the verification link.', { status: 400 });
    }

    // Insert donation pledge
    const { error: insertError } = await s.from('donations').insert({
      donor_name,
      email,
      amount: Number(amount),
      message: message || null,
    });

    if (insertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Donation insert error:', insertError);
      }
      return new Response('Failed to submit donation pledge', { status: 500 });
    }

    // Send confirmation email (fire and forget)
    try {
      const { sendDonationConfirmation } = await import('@/lib/notifications');
      await sendDonationConfirmation({
        email,
        donorName: donor_name,
        amount: Number(amount),
        message: message || null,
        contactEmail: settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
      });
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Donation confirmation email error:', e);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Donate route error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}
