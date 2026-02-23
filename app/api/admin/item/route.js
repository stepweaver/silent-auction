import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { ItemSchema } from '@/lib/validation';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function POST(req) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  const isSuperAdmin = checkBasicAuth(headersList);

  if (!isSuperAdmin && !vendorAdminId) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  try {
    const body = await req.json();
    const parsed = ItemSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Invalid item data', 400);
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

    // Normalize slug: lowercase, replace spaces with hyphens, remove special chars
    const normalizedSlug = baseSlug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!normalizedSlug) {
      return jsonError('Title is required to generate slug', 400);
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
        return jsonError('Unable to generate unique slug', 500);
      }
    }

    // Only super admin can create items without created_by (for backward compatibility)
    // Vendor admins must provide their ID via header
    const insertData = {
      title: data.title,
      slug,
      description: data.description || null,
      photo_url: data.photo_url || null,
      thumbnail_url: data.thumbnail_url || null,
      start_price: Number(data.start_price),
      min_increment: 5, // Fixed at $5 for all items
      is_closed: data.is_closed || false,
    };
    
    // Only include category if it's provided and not empty
    if (data.category && data.category.trim()) {
      insertData.category = data.category.trim();
    }

    // If vendor admin, set created_by
    if (vendorAdminId && !isSuperAdmin) {
      insertData.created_by = vendorAdminId;
    }

    const { data: item, error } = await s
      .from('items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logError('Admin create item error', error);
      return jsonError('Failed to create item', 500);
    }

    return Response.json({ ok: true, item });
  } catch (error) {
    logError('Create item error', error);
    return jsonError('Internal server error', 500);
  }
}
