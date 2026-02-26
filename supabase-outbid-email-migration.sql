-- Migration: Create outbid_email_log table for throttling outbid notifications
-- Run this in your Supabase SQL Editor
-- Prevents users from receiving more than one outbid email per item per 30 minutes

CREATE TABLE IF NOT EXISTS outbid_email_log (
  email TEXT NOT NULL,
  item_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, item_id)
);

-- Index for efficient throttle lookups
CREATE INDEX IF NOT EXISTS idx_outbid_email_log_sent_at ON outbid_email_log (email, item_id, sent_at);

-- Enable Row Level Security (service role bypasses RLS)
ALTER TABLE outbid_email_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (used by API)
CREATE POLICY "Service role full access" ON outbid_email_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
