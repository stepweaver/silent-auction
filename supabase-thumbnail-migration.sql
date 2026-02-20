-- Migration: Add thumbnail_url column to items table
-- This migration adds support for pre-generated thumbnails to avoid Vercel image optimization transformations

-- Add thumbnail_url column (nullable for backward compatibility)
ALTER TABLE items ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add comment for documentation
COMMENT ON COLUMN items.thumbnail_url IS 'Pre-generated thumbnail URL for grid/list views. Falls back to photo_url if null.';
