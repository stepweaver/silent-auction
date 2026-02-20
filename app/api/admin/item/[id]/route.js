import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { ItemSchema } from '@/lib/validation';

import { vendorAdminOwnsItem } from '@/lib/vendorAuth';

export async function PATCH(req, { params }) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  const isSuperAdmin = checkBasicAuth(headersList);

  if (!isSuperAdmin && !vendorAdminId) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const { id } = await params;
    const body = await req.json();

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
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url || null;
    if (body.start_price !== undefined) updateData.start_price = Number(body.start_price);
    if (body.is_closed !== undefined) updateData.is_closed = Boolean(body.is_closed);
    if (body.category !== undefined && body.category && body.category.trim()) {
      updateData.category = body.category.trim();
    }

    const partialSchema = ItemSchema.partial();
    const parsed = partialSchema.safeParse(updateData);

    if (!parsed.success) {
      return new Response('Invalid update data', { status: 400 });
    }

    const s = supabaseServer();

    if (vendorAdminId && !isSuperAdmin) {
      const ownsItem = await vendorAdminOwnsItem(vendorAdminId, id, s);
      if (!ownsItem) {
        return new Response('Unauthorized: You can only edit your own items', { status: 403 });
      }
    }

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

    let { data: item, error } = await s
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message && error.message.includes('column') && error.message.includes('category')) {
      const { category, ...updateDataWithoutCategory } = updateData;
      const retryResult = await s
        .from('items')
        .update(updateDataWithoutCategory)
        .eq('id', id)
        .select()
        .single();
      
      if (retryResult.error) {
        error = retryResult.error;
      } else {
        item = retryResult.data;
        error = null;
      }
    }

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Update error:', error);
      }
      return new Response('Failed to update item', { status: 500 });
    }

    if (!item) {
      return new Response('Item not found', { status: 404 });
    }

    return Response.json({ ok: true, item });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Update item error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  const isSuperAdmin = checkBasicAuth(headersList);

  if (!isSuperAdmin && !vendorAdminId) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const { id } = await params;
    const s = supabaseServer();

    if (vendorAdminId && !isSuperAdmin) {
      const ownsItem = await vendorAdminOwnsItem(vendorAdminId, id, s);
      if (!ownsItem) {
        return new Response('Unauthorized: You can only delete your own items', { status: 403 });
      }
    }

    const { data: existingItem, error: fetchError } = await s
      .from('items')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fetch item before delete error:', fetchError);
      }
      return new Response('Failed to delete item', { status: 500 });
    }

    if (!existingItem) {
      return new Response('Item not found', { status: 404 });
    }

    const { data: existingBid } = await s
      .from('bids')
      .select('id')
      .eq('item_id', id)
      .limit(1)
      .maybeSingle();

    if (existingBid) {
      return new Response('This item already has bids and cannot be deleted.', { status: 400 });
    }

    const { error: deleteError } = await s
      .from('items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Delete item error:', deleteError);
      }
      return new Response('Failed to delete item', { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Delete item error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}

