-- Add auction_start column to settings table
-- Run this in Supabase Dashboard → SQL Editor
-- When set, bidding is not allowed before this date/time

alter table public.settings
add column if not exists auction_start timestamptz;
