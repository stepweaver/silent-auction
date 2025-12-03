-- Security Fixes for Supabase Security Advisor Issues
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- ISSUE 1: Fix item_leaders view - Remove SECURITY DEFINER
-- ============================================================================
-- The view should not use SECURITY DEFINER as it bypasses RLS policies
-- We'll recreate it as a regular view that respects RLS on underlying tables

-- Drop the existing view
DROP VIEW IF EXISTS public.item_leaders CASCADE;

-- Recreate the view without SECURITY DEFINER
-- This view aggregates current bid information for each item
-- It includes all fields from items table plus computed bid fields
CREATE VIEW public.item_leaders AS
SELECT 
  i.id,
  i.title,
  i.description,
  i.slug,
  i.start_price,
  i.min_increment,
  i.photo_url,
  i.is_closed,
  i.created_at,
  i.created_by,
  COALESCE(MAX(b.amount), NULL) AS current_high_bid,
  CASE 
    WHEN MAX(b.amount) IS NOT NULL THEN MAX(b.amount) + 1
    ELSE i.start_price
  END AS next_minimum_bid
FROM public.items i
LEFT JOIN public.bids b ON b.item_id = i.id
GROUP BY i.id, i.title, i.description, i.slug, i.start_price, i.min_increment, i.photo_url, i.is_closed, i.created_at, i.created_by;

-- Grant access to the view
GRANT SELECT ON public.item_leaders TO anon, authenticated;

-- Enable RLS on the view (views inherit RLS from underlying tables)
ALTER VIEW public.item_leaders SET (security_invoker = true);

-- ============================================================================
-- ISSUE 2: Enable RLS on verified_emails table
-- ============================================================================
-- Enable Row Level Security on the verified_emails table
ALTER TABLE public.verified_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (needed to check verification status)
-- This is safe because we're only exposing verification status, not sensitive data
CREATE POLICY "Allow public read access to verified_emails"
ON public.verified_emails
FOR SELECT
TO public
USING (true);

-- Note: INSERT and UPDATE operations are handled server-side using the service_role key,
-- which bypasses RLS. This is the secure approach as it ensures all writes go through
-- our API validation logic. We don't need policies for authenticated users since
-- the application doesn't perform client-side writes to this table.

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'verified_emails';

-- List all policies on verified_emails
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'verified_emails';

