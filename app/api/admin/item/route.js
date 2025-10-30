import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { ItemSchema } from '@/lib/validation';

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
    const parsed = ItemSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid item data', { status: 400 });
    }

    const data = parsed.data;

    // Normalize slug: lowercase, replace spaces with hyphens, remove special chars
    const slug = data.slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const s = supabaseServer();

    // Check if slug already exists
    const { data: existing } = await s.from('items').select('id').eq('slug', slug).maybeSingle();

    if (existing) {
      return new Response('Slug already exists', { status: 400 });
    }

    const { data: item, error } = await s
      .from('items')
      .insert({
        title: data.title,
        slug,
        description: data.description || null,
        photo_url: data.photo_url || null,
        start_price: Number(data.start_price),
        min_increment: Number(data.min_increment),
        is_closed: data.is_closed || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response('Failed to create item', { status: 500 });
    }

    return Response.json({ ok: true, item });
  } catch (error) {
    console.error('Create item error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
