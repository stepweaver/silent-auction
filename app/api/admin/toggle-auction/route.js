import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { closeAuction } from '@/lib/closeAuction';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  try {
    const body = await req.json();
    const { auction_closed } = body;

    if (typeof auction_closed !== 'boolean') {
      return jsonError('Invalid request: auction_closed must be a boolean', 400);
    }

    const s = supabaseServer();

    const { data: settings, error: updateError } = await s
      .from('settings')
      .update({ auction_closed })
      .eq('id', 1)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await s
          .from('settings')
          .insert({ id: 1, auction_closed })
          .select()
          .single();

        if (insertError) {
          logError('Toggle auction insert error', insertError);
          return jsonError('Failed to create settings', 500);
        }

        if (auction_closed) {
          const result = await closeAuction({ force: true, triggeredBy: 'manual-toggle' });
          return Response.json({ ok: true, settings: newSettings, closeResult: result });
        }
        return Response.json({ ok: true, settings: newSettings });
      }

      logError('Toggle auction update error', updateError);
      return jsonError('Failed to update settings', 500);
    }

    if (auction_closed) {
      const result = await closeAuction({ force: true, triggeredBy: 'manual-toggle' });
      return Response.json({ ok: true, settings, closeResult: result });
    }

    if (!auction_closed) {
      const SENTINEL_ITEM_ID = '00000000-0000-0000-0000-000000000000';
      const { error: reopenError } = await s
        .from('items')
        .update({ is_closed: false })
        .neq('id', SENTINEL_ITEM_ID);

      if (reopenError) {
        logError('Error reopening items', reopenError);
      }
    }

    return Response.json({ ok: true, settings });
  } catch (error) {
    logError('Toggle auction error', error);
    return jsonError('Internal server error', 500);
  }
}

