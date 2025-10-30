import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';

export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const s = supabaseServer();

    const { error } = await s.from('items').update({ is_closed: true }).neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Close all error:', error);
      return new Response('Failed to close all items', { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Close all error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
