/**
 * Backfill script to generate thumbnails for existing items that have photo_url but no thumbnail_url
 * 
 * Usage:
 *   node scripts/backfill-thumbnails.js
 * 
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Note: Requires Node.js 18+ for native fetch support, or install node-fetch for older versions
 */

const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadImage(url) {
  try {
    // Use native fetch (Node.js 18+) or require node-fetch for older versions
    const fetch = globalThis.fetch || require('node-fetch');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error.message);
    throw error;
  }
}

async function generateThumbnail(imageBuffer) {
  try {
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(480, 480, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();
    return thumbnailBuffer;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error.message);
    throw error;
  }
}

async function uploadThumbnail(itemId, thumbnailBuffer, baseFileName) {
  const thumbnailFileName = `${baseFileName}-thumb.webp`;
  const thumbnailFilePath = `item-photos/${thumbnailFileName}`;

  const { data, error } = await supabase.storage
    .from('item-photos')
    .upload(thumbnailFilePath, thumbnailBuffer, {
      contentType: 'image/webp',
      upsert: true, // Allow overwriting if thumbnail already exists
    });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from('item-photos')
    .getPublicUrl(thumbnailFilePath);

  return urlData.publicUrl;
}

async function extractFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    // Remove extension and return base name
    return fileName.replace(/\.[^/.]+$/, '');
  } catch (error) {
    // If URL parsing fails, generate a unique name
    return `backfill-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

async function backfillThumbnails() {
  console.log('Starting thumbnail backfill...\n');

  // Fetch all items that have photo_url but no thumbnail_url
  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id, photo_url, thumbnail_url')
    .not('photo_url', 'is', null)
    .or('thumbnail_url.is.null,thumbnail_url.eq.');

  if (fetchError) {
    console.error('Error fetching items:', fetchError);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('No items need thumbnail backfill.');
    return;
  }

  console.log(`Found ${items.length} items that need thumbnails.\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process items with rate limiting (delay between items)
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Skip if already has thumbnail_url
    if (item.thumbnail_url) {
      console.log(`[${i + 1}/${items.length}] Skipping item ${item.id} - already has thumbnail`);
      continue;
    }

    console.log(`[${i + 1}/${items.length}] Processing item ${item.id}...`);

    try {
      // Download original image
      console.log(`  Downloading image from ${item.photo_url}...`);
      const imageBuffer = await downloadImage(item.photo_url);

      // Generate thumbnail
      console.log(`  Generating thumbnail...`);
      const thumbnailBuffer = await generateThumbnail(imageBuffer);

      // Extract base filename from URL or generate one
      const baseFileName = await extractFileNameFromUrl(item.photo_url);

      // Upload thumbnail
      console.log(`  Uploading thumbnail...`);
      const thumbnailUrl = await uploadThumbnail(item.id, thumbnailBuffer, baseFileName);

      // Update item with thumbnail_url
      const { error: updateError } = await supabase
        .from('items')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', item.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`  ✓ Success! Thumbnail URL: ${thumbnailUrl}\n`);
      successCount++;

      // Rate limiting: wait 500ms between items to avoid overwhelming the server
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ✗ Error processing item ${item.id}:`, error.message);
      errors.push({ itemId: item.id, error: error.message });
      errorCount++;
      console.log('');
    }
  }

  console.log('\n=== Backfill Summary ===');
  console.log(`Total items processed: ${items.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(({ itemId, error }) => {
      console.log(`  Item ${itemId}: ${error}`);
    });
  }

  console.log('\nBackfill complete!');
}

// Run the backfill
backfillThumbnails().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
