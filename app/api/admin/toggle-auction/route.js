import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { closeAuction } from '@/lib/closeAuction';

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
    const { auction_closed } = body;

    if (typeof auction_closed !== 'boolean') {
      return new Response('Invalid request: auction_closed must be a boolean', { status: 400 });
    }

    const s = supabaseServer();

    // Update the auction_closed setting
    const { data: settings, error: updateError } = await s
      .from('settings')
      .update({ auction_closed })
      .eq('id', 1)
      .select()
      .single();

    if (updateError) {
      // If settings don't exist, create them
      if (updateError.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await s
          .from('settings')
          .insert({ id: 1, auction_closed })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response('Failed to create settings', { status: 500 });
        }
        
        // If closing, trigger closeAuction to send emails
        if (auction_closed) {
          const result = await closeAuction({ force: true, triggeredBy: 'manual-toggle' });
          return Response.json({ ok: true, settings: newSettings, closeResult: result });
        }
        
        return Response.json({ ok: true, settings: newSettings });
      }

      console.error('Update error:', updateError);
      return new Response('Failed to update settings', { status: 500 });
    }

    // If closing the auction, trigger closeAuction to close items and send emails
    if (auction_closed) {
      const result = await closeAuction({ force: true, triggeredBy: 'manual-toggle' });
      return Response.json({ ok: true, settings, closeResult: result });
    }

    // If opening the auction, reopen all items
    if (!auction_closed) {
      const SENTINEL_ITEM_ID = '00000000-0000-0000-0000-000000000000';
      const { error: reopenError } = await s
        .from('items')
        .update({ is_closed: false })
        .neq('id', SENTINEL_ITEM_ID);
      
      if (reopenError) {
        console.error('Error reopening items:', reopenError);
        // Continue anyway - auction is still opened
      }
    }

    return Response.json({ ok: true, settings });
  } catch (error) {
    console.error('Toggle auction error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

