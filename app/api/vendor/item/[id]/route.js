import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { ItemSchema } from '@/lib/validation';
import { vendorAdminOwnsItem } from '@/lib/vendorAuth';

export async function PATCH(req, { params }) {
  const headersList = headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');

  if (!vendorAdminId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Partial validation
    const updateData = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) {
      updateData.slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url || null;
    if (body.start_price !== undefined) updateData.start_price = Number(body.start_price);
    if (body.min_increment !== undefined) updateData.min_increment = Number(body.min_increment);
    if (body.is_closed !== undefined) updateData.is_closed = Boolean(body.is_closed);

    // Validate with partial schema
    const partialSchema = ItemSchema.partial();
    const parsed = partialSchema.safeParse(updateData);

    if (!parsed.success) {
      return new Response('Invalid update data', { status: 400 });
    }

    const s = supabaseServer();

    // Check ownership
    const ownsItem = await vendorAdminOwnsItem(vendorAdminId, id, s);
    if (!ownsItem) {
      return new Response('Unauthorized: You can only edit your own items', { status: 403 });
    }

    // Check if slug change conflicts with existing
    if (updateData.slug) {
      const { data: existing } = await s
        .from('items')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return new Response('Slug already exists', { status: 400 });
      }
    }

    const { data: item, error } = await s
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return new Response('Failed to update item', { status: 500 });
    }

    if (!item) {
      return new Response('Item not found', { status: 404 });
    }

    return Response.json({ ok: true, item });
  } catch (error) {
    console.error('Update item error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

