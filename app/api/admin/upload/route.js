import { headers } from 'next/headers';
import { checkBasicAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/serverSupabase';
import sharp from 'sharp';

export async function POST(req) {
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
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response('No file provided', { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response('Invalid file type. Only JPEG, PNG, and WebP are allowed.', { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response('File too large. Maximum size is 10MB.', { status: 400 });
    }

    const s = supabaseServer();

    // Generate unique filename base
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const baseFileName = `${timestamp}-${randomStr}`;
    
    // Original file path
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
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Storage upload error:', originalError);
      }
      return new Response('Failed to upload file', { status: 500 });
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
        // Log but don't fail - thumbnail generation is optional
        if (process.env.NODE_ENV === 'development') {
          console.warn('Thumbnail generation failed:', thumbnailError);
        }
      }
    } catch (thumbnailGenError) {
      // Log but don't fail - thumbnail generation is optional
      if (process.env.NODE_ENV === 'development') {
        console.warn('Thumbnail generation error:', thumbnailGenError);
      }
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
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('Upload error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}
