import { headers } from 'next/headers';
import { checkBasicAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/serverSupabase';
import sharp from 'sharp';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { logError, logWarn } from '@/lib/logger';

const MIME_TO_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req) {
  const headersList = await headers();
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  const isSuperAdmin = checkBasicAuth(headersList);

  if (!isSuperAdmin && !vendorAdminId) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return jsonError('No file provided', 400);
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return jsonError('Invalid file type. Only JPEG, PNG, and WebP are allowed.', 400);
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return jsonError('File too large. Maximum size is 10MB.', 400);
    }

    const s = supabaseServer();

    // Extension from MIME (not file.name) to avoid e.g. photo.jpg.exe
    const fileExt = MIME_TO_EXT[file.type] || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const baseFileName = `${timestamp}-${randomStr}`;

    const originalFileName = `${baseFileName}-original.${fileExt}`;
    const originalFilePath = `item-photos/${originalFileName}`;
    
    // Thumbnail file path (always webp for consistency and smaller size)
    const thumbnailFileName = `${baseFileName}-thumb.webp`;
    const thumbnailFilePath = `item-photos/${thumbnailFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload original image to Supabase Storage
    const { data: originalData, error: originalError } = await s.storage
      .from('item-photos')
      .upload(originalFilePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (originalError) {
      logError('Storage upload error', originalError);
      return jsonError('Failed to upload file', 500);
    }

    // Generate thumbnail using sharp
    let thumbnailUrl = null;
    let thumbnailPath = null;
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(480, 480, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toBuffer();

      // Upload thumbnail to Supabase Storage
      const { data: thumbnailData, error: thumbnailError } = await s.storage
        .from('item-photos')
        .upload(thumbnailFilePath, thumbnailBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (!thumbnailError) {
        const { data: thumbnailUrlData } = s.storage
          .from('item-photos')
          .getPublicUrl(thumbnailFilePath);
        thumbnailUrl = thumbnailUrlData.publicUrl;
        thumbnailPath = thumbnailFilePath;
      } else {
        logWarn('Thumbnail generation failed', thumbnailError);
      }
    } catch (thumbnailGenError) {
      logWarn('Thumbnail generation error', thumbnailGenError);
    }

    // Get public URL for original
    const { data: urlData } = s.storage.from('item-photos').getPublicUrl(originalFilePath);

    return Response.json({ 
      url: urlData.publicUrl, 
      path: originalFilePath,
      thumbnailUrl: thumbnailUrl,
      thumbnailPath: thumbnailPath,
    });
  } catch (error) {
    logError('Upload error', error);
    return jsonError('Internal server error', 500);
  }
}
