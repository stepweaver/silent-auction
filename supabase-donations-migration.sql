-- Migration: Create donations table for donation pledges
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  email TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups by email (used during auction close)
CREATE INDEX IF NOT EXISTS idx_donations_email ON donations (email);

-- Enable Row Level Security
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (public donation pledges)
CREATE POLICY "Allow public inserts" ON donations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow service role full access (for admin/close operations)
CREATE POLICY "Allow service role select" ON donations
  FOR SELECT
  USING (true);

-- Enable Realtime for donations table (optional, for live admin updates)
ALTER PUBLICATION supabase_realtime ADD TABLE donations;
