import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { ItemSchema } from '@/lib/validation';
import { vendorAdminOwnsItem } from '@/lib/vendorAuth';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function PATCH(req, { params }) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  const isSuperAdmin = checkBasicAuth(headersList);

  if (!isSuperAdmin && !vendorAdminId) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
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
      return jsonError('Invalid update data', 400);
    }

    const s = supabaseServer();

    if (vendorAdminId && !isSuperAdmin) {
      const ownsItem = await vendorAdminOwnsItem(vendorAdminId, id, s);
      if (!ownsItem) {
        return jsonError('Unauthorized: You can only edit your own items', 403);
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
        return jsonError('Slug already exists', 400);
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
      logError('Admin update item error', error);
      return jsonError('Failed to update item', 500);
    }

    if (!item) {
      return jsonError('Item not found', 404);
    }

    return Response.json({ ok: true, item });
  } catch (error) {
    logError('Update item error', error);
    return jsonError('Internal server error', 500);
  }
}

export async function DELETE(_req, { params }) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  const isSuperAdmin = checkBasicAuth(headersList);

  if (!isSuperAdmin && !vendorAdminId) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  try {
    const { id } = await params;
    const s = supabaseServer();

    if (vendorAdminId && !isSuperAdmin) {
      const ownsItem = await vendorAdminOwnsItem(vendorAdminId, id, s);
      if (!ownsItem) {
        return jsonError('Unauthorized: You can only delete your own items', 403);
      }
    }

    const { data: existingItem, error: fetchError } = await s
      .from('items')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      logError('Fetch item before delete error', fetchError);
      return jsonError('Failed to delete item', 500);
    }

    if (!existingItem) {
      return jsonError('Item not found', 404);
    }

    const { data: existingBid } = await s
      .from('bids')
      .select('id')
      .eq('item_id', id)
      .limit(1)
      .maybeSingle();

    if (existingBid) {
      return jsonError('This item already has bids and cannot be deleted.', 400);
    }

    const { error: deleteError } = await s
      .from('items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logError('Delete item error', deleteError);
      return jsonError('Failed to delete item', 500);
    }

    return Response.json({ ok: true });
  } catch (error) {
    logError('Delete item error', error);
    return jsonError('Internal server error', 500);
  }
}

