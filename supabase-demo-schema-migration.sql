-- Migration: Create demo schema for portfolio showcase mode
-- Run this in Supabase SQL Editor when DEMO_MODE is needed
-- Demo schema mirrors production tables; data is isolated from real users
--
-- REQUIRED: Before running, expose the demo schema in Supabase:
--   Project Settings → API → Exposed schemas → add "demo"
-- (PostgREST only exposes "public" by default; PGRST106 occurs otherwise.)

CREATE SCHEMA IF NOT EXISTS demo;

-- demo.settings (mirrors public.settings)
CREATE TABLE demo.settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  auction_title TEXT,
  auction_deadline TIMESTAMPTZ,
  auction_start TIMESTAMPTZ,
  auction_closed BOOLEAN DEFAULT false,
  contact_email TEXT,
  payment_instructions TEXT,
  pickup_instructions TEXT,
  soft_close_seconds INTEGER
);

-- demo.items (mirrors public.items)
CREATE TABLE demo.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  photo_url TEXT,
  thumbnail_url TEXT,
  start_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  min_increment NUMERIC(10, 2) NOT NULL DEFAULT 5,
  is_closed BOOLEAN DEFAULT false,
  category TEXT,
  created_by UUID
);

CREATE INDEX idx_demo_items_slug ON demo.items (slug);
CREATE INDEX idx_demo_items_created_by ON demo.items (created_by);
CREATE INDEX idx_demo_items_is_closed ON demo.items (is_closed);

-- demo.bids (mirrors public.bids)
CREATE TABLE demo.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES demo.items(id) ON DELETE CASCADE,
  bidder_name TEXT NOT NULL,
  email TEXT NOT NULL,
  alias_id UUID,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_bids_item_id ON demo.bids (item_id);
CREATE INDEX idx_demo_bids_email ON demo.bids (email);

-- demo.user_aliases
CREATE TABLE demo.user_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  alias TEXT NOT NULL UNIQUE,
  color TEXT,
  animal TEXT,
  icon TEXT,
  name TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_bid_confirmations BOOLEAN DEFAULT false,
  last_known_ip TEXT,
  avatar_style TEXT,
  avatar_seed TEXT
);

CREATE INDEX idx_demo_user_aliases_email ON demo.user_aliases (email);

-- demo.verified_emails
CREATE TABLE demo.verified_emails (
  email TEXT PRIMARY KEY,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- demo.vendor_admin_users
CREATE TABLE demo.vendor_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- demo.donations
CREATE TABLE demo.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  email TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_donations_email ON demo.donations (email);

-- demo.outbid_email_log
CREATE TABLE demo.outbid_email_log (
  email TEXT NOT NULL,
  item_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, item_id)
);

-- demo.item_leaders view (items + current high bid)
CREATE OR REPLACE VIEW demo.item_leaders AS
SELECT
  i.id,
  i.title,
  i.slug,
  i.description,
  i.photo_url,
  i.thumbnail_url,
  i.start_price,
  i.min_increment,
  i.is_closed,
  i.category,
  i.created_by,
  COALESCE(
    (SELECT b.amount FROM demo.bids b WHERE b.item_id = i.id ORDER BY b.amount DESC LIMIT 1),
    i.start_price
  ) AS current_high_bid
FROM demo.items i;

-- RLS: Grant service role full access (API uses service role)
ALTER TABLE demo.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.user_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.verified_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.vendor_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.outbid_email_log ENABLE ROW LEVEL SECURITY;

-- Policies for anon read on public data (catalog, item pages, leaderboard)
CREATE POLICY "demo_settings_select" ON demo.settings FOR SELECT USING (true);
CREATE POLICY "demo_items_select" ON demo.items FOR SELECT USING (true);
CREATE POLICY "demo_bids_select" ON demo.bids FOR SELECT USING (true);
CREATE POLICY "demo_user_aliases_select" ON demo.user_aliases FOR SELECT USING (true);
CREATE POLICY "demo_donations_select" ON demo.donations FOR SELECT USING (true);

-- Policies for anon insert (donations, bids, aliases, verified_emails - via API with service role)
CREATE POLICY "demo_donations_insert" ON demo.donations FOR INSERT WITH CHECK (true);

-- Service role bypasses RLS; anon needs explicit policies for client reads
-- Grant usage on schema
GRANT USAGE ON SCHEMA demo TO anon;
GRANT USAGE ON SCHEMA demo TO service_role;
GRANT SELECT ON demo.settings TO anon;
GRANT SELECT ON demo.items TO anon;
GRANT SELECT ON demo.bids TO anon;
GRANT SELECT ON demo.user_aliases TO anon;
GRANT SELECT ON demo.donations TO anon;
GRANT SELECT ON demo.item_leaders TO anon;
GRANT ALL ON demo.settings TO service_role;
GRANT ALL ON demo.items TO service_role;
GRANT ALL ON demo.bids TO service_role;
GRANT ALL ON demo.user_aliases TO service_role;
GRANT ALL ON demo.verified_emails TO service_role;
GRANT ALL ON demo.vendor_admin_users TO service_role;
GRANT ALL ON demo.donations TO service_role;
GRANT ALL ON demo.outbid_email_log TO service_role;

-- Seed data
INSERT INTO demo.settings (id, auction_deadline, auction_closed, auction_start)
VALUES (1, now() + interval '24 hours', false, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO demo.items (id, title, slug, description, start_price, is_closed) VALUES
  (gen_random_uuid(), 'Demo Item 1', 'demo-item-1', 'A sample auction item for the portfolio demo.', 10, false),
  (gen_random_uuid(), 'Demo Item 2', 'demo-item-2', 'Another demo item to showcase bidding.', 25, false),
  (gen_random_uuid(), 'Demo Item 3', 'demo-item-3', 'Try placing a bid on this one!', 50, false)
ON CONFLICT (slug) DO NOTHING;

-- Seed vendor admin for demo (password: demo@example.com - use vendor enrollment flow)
INSERT INTO demo.vendor_admin_users (id, email, name) VALUES
  (gen_random_uuid(), 'demo@example.com', 'Demo Vendor')
ON CONFLICT (email) DO NOTHING;

