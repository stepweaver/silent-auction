import { supabaseServer } from '@/lib/serverSupabase';
import { logError, logInfo, logWarn } from '@/lib/logger';

function isAuthorized(req) {
  const secret =
    process.env.DEMO_RESET_SECRET || process.env.AUCTION_CRON_SECRET;
  if (!secret) {
    logWarn('demo/reset: DEMO_RESET_SECRET or AUCTION_CRON_SECRET not configured.');
    return false;
  }

  const headerValue = req.headers.get('x-auction-cron-secret');
  if (headerValue && headerValue === secret) {
    return true;
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('secret') || url.searchParams.get('token');
    if (token && token === secret) {
      return true;
    }
  } catch (error) {
    logError('demo/reset: failed to parse request url', error);
  }

  return false;
}

export async function GET(req) {
  if (process.env.DEMO_MODE !== 'true') {
    return Response.json(
      { ok: true, skipped: true, reason: 'Demo mode is disabled' },
      { status: 200 }
    );
  }

  if (!isAuthorized(req)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const s = supabaseServer();

    await s.from('bids').delete().or('id.eq.00000000-0000-0000-0000-000000000000,id.neq.00000000-0000-0000-0000-000000000000');
    await s.from('donations').delete().or('id.eq.00000000-0000-0000-0000-000000000000,id.neq.00000000-0000-0000-0000-000000000000');
    await s.from('outbid_email_log').delete().gte('sent_at', '1970-01-01T00:00:00Z');

    const { error: itemsError } = await s
      .from('items')
      .update({ is_closed: false })
      .or('id.eq.00000000-0000-0000-0000-000000000000,id.neq.00000000-0000-0000-0000-000000000000');

    if (itemsError) {
      logError('demo/reset: failed to reopen items', itemsError);
      return Response.json(
        { ok: false, error: itemsError.message },
        { status: 500 }
      );
    }

    const { error: settingsError } = await s
      .from('settings')
      .update({
        auction_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        auction_closed: false,
        auction_start: new Date().toISOString(),
      })
      .eq('id', 1);

    if (settingsError) {
      logError('demo/reset: failed to update settings', settingsError);
      return Response.json(
        { ok: false, error: settingsError.message },
        { status: 500 }
      );
    }

    const resetAt = new Date().toISOString();
    logInfo('demo/reset: auction reset successfully', { resetAt });

    return Response.json({
      ok: true,
      resetAt,
      message: 'Demo auction reset. Bids and donations cleared, items reopened, deadline set to 24h from now.',
    });
  } catch (error) {
    logError('demo/reset: unexpected error', error);
    return Response.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  return GET(req);
}
