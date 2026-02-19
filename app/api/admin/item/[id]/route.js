import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { ItemSchema } from '@/lib/validation';

import { vendorAdminOwnsItem } from '@/lib/vendorAuth';

export async function PATCH(req, { params }) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  const isSuperAdmin = checkBasicAuth(headersList);

  // Either super admin or vendor admin must be authenticated
  if (!isSuperAdmin && !vendorAdminId) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Partial validation - only validate fields that are present
    const updateData = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) {
      // Normalize slug
      updateData.slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url || null;
    if (body.start_price !== undefined) updateData.start_price = Number(body.start_price);
    // min_increment is fixed at $5, not editable
    if (body.is_closed !== undefined) updateData.is_closed = Boolean(body.is_closed);
    // Only include category if it's a non-empty string (skip if empty to avoid errors if column doesn't exist yet)
    if (body.category !== undefined && body.category && body.category.trim()) {
      updateData.category = body.category.trim();
    }

    // Validate with partial schema
    const partialSchema = ItemSchema.partial();
    const parsed = partialSchema.safeParse(updateData);

    if (!parsed.success) {
      return new Response('Invalid update data', { status: 400 });
    }

    const s = supabaseServer();

    // If vendor admin, check ownership
    if (vendorAdminId && !isSuperAdmin) {
      const ownsItem = await vendorAdminOwnsItem(vendorAdminId, id, s);
      if (!ownsItem) {
        return new Response('Unauthorized: You can only edit your own items', { status: 403 });
      }
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

    let { data: item, error } = await s
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    // If error is about missing column (category), retry without it
    if (error && error.message && error.message.includes('column') && error.message.includes('category')) {
      // Remove category from update and retry
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
      // Log error server-side only, don't expose details to client
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
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('Update item error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}
