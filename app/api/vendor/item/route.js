import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { ItemSchema } from '@/lib/validation';

// POST - Create item (vendor admin only)
export async function POST(req) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');

  if (!vendorAdminId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ItemSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid item data', { status: 400 });
    }

    const data = parsed.data;

    // Generate slug from title if not provided or empty
    let baseSlug = data.slug?.trim() || '';
    if (!baseSlug && data.title) {
      baseSlug = data.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Normalize slug
    const normalizedSlug = baseSlug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!normalizedSlug) {
      return new Response('Title is required to generate slug', { status: 400 });
    }

    const s = supabaseServer();

    // Check if slug already exists and append number if needed
    let slug = normalizedSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await s.from('items').select('id').eq('slug', slug).maybeSingle();
      if (!existing) {
        break; // Slug is available
      }
      slug = `${normalizedSlug}-${counter}`;
      counter++;
      if (counter > 100) {
        // Safety limit
        return new Response('Unable to generate unique slug', { status: 500 });
      }
    }

    const insertData = {
      title: data.title,
      slug,
      description: data.description || null,
      photo_url: data.photo_url || null,
      start_price: Number(data.start_price),
      min_increment: 5, // Fixed at $5 for all items
      is_closed: data.is_closed || false,
      created_by: vendorAdminId,
    };
    
    // Only include category if it's provided and not empty
    if (data.category && data.category.trim()) {
      insertData.category = data.category.trim();
    }

    const { data: item, error } = await s
      .from('items')
      .insert(insertData)
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

