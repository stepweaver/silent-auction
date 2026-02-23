import { supabaseServer } from '@/lib/serverSupabase';
import { DonationSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyCSRFToken } from '@/lib/csrf';
import { jsonError } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function POST(req) {
  try {
    const rateLimitResult = await checkRateLimit(req, 10, 60 * 1000);
    if (rateLimitResult) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Too many requests. Please slow down.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    const csrfValid = await verifyCSRFToken(req);
    if (!csrfValid) {
      return jsonError('Invalid or missing CSRF token', 403);
    }

    const body = await req.json();
    const parsed = DonationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Invalid request data', 400);
    }

    const { donor_name, email, amount, message } = parsed.data;
    const s = supabaseServer();

    const { data: settings, error: settingsError } = await s
      .from('settings')
      .select('auction_closed, auction_deadline, auction_start')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      return jsonError('Settings not found', 500);
    }

    if (settings?.auction_closed) {
      return jsonError('The auction is closed. Donations are no longer being accepted.', 400);
    }

    const now = new Date();
    const auctionStart = settings?.auction_start ? new Date(settings.auction_start) : null;
    if (auctionStart && now < auctionStart) {
      const formatted = auctionStart.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return jsonError(`The auction has not opened yet. Donations open ${formatted}.`, 400);
    }

    const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
    if (deadline && now >= deadline) {
      return jsonError('The auction deadline has passed. Donations are no longer being accepted.', 400);
    }

    const { data: verifiedEmail } = await s
      .from('verified_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (!verifiedEmail) {
      return jsonError('Please verify your email address first. Check your email for the verification link.', 400);
    }

    const { error: insertError } = await s.from('donations').insert({
      donor_name,
      email,
      amount: Number(amount),
      message: message || null,
    });

    if (insertError) {
      logError('Donation insert error', insertError);
      return jsonError('Failed to submit donation pledge', 500);
    }

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
      logError('Donation confirmation email error', e);
    }

    return Response.json({ ok: true });
  } catch (error) {
    logError('Donate route error', error);
    return jsonError('Internal server error', 500);
  }
}
