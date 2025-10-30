-- Silent Auction Schema
-- Run this in your Supabase SQL editor

-- ============================================
-- STEP 1: Create Storage Bucket (do this first!)
-- ============================================
-- Go to Storage in Supabase dashboard and create a bucket named "item-photos"
-- Make it PUBLIC so images can be accessed
-- Or run this SQL to create it programmatically:
-- insert into storage.buckets (id, name, public) values ('item-photos', 'item-photos', true)
-- on conflict (id) do nothing;
--
-- Then set up policies in Storage → Policies:
-- Allow public read: SELECT policy for authenticated and anon users
-- Allow admin upload: INSERT policy checking auth.role() = 'service_role' OR use RPC

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Auction global settings (one row)
create table settings (
  id int primary key default 1,
  auction_title text not null default 'Mary Frank PTO Silent Auction',
  auction_deadline timestamptz not null,
  soft_close_seconds int not null default 0,
  contact_email text,
  payment_instructions text,
  pickup_instructions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Insert initial settings row
insert into settings (auction_deadline, contact_email, payment_instructions, pickup_instructions)
values (
  now() + interval '7 days',
  'auction@stepweaver.dev',
  'Pay at checkout table by 9pm. Cash/Card/Venmo.',
  'Pickup at gym stage tonight.'
) on conflict (id) do nothing;

-- Items table
create table items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  photo_url text,
  start_price numeric not null default 0,
  min_increment numeric not null default 5,
  is_closed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bids table
create table bids (
  id bigint generated always as identity primary key,
  item_id uuid not null references items(id) on delete cascade,
  bidder_name text not null,
  email text not null,
  amount numeric not null,
  created_at timestamptz default now()
);

-- Migration note: If you have an existing bids table with 'contact' column, run:
-- alter table bids add column email text;
-- alter table bids add column phone text;
-- alter table bids add column sms_opt_in boolean not null default false;
-- update bids set email = contact where email is null;  -- migrate existing data if needed
-- alter table bids alter column email set not null;
-- alter table bids drop column contact;

-- Leader view (current high + next min)
create or replace view item_leaders as
select
  i.*,
  coalesce(
    (select max(b.amount) from bids b where b.item_id = i.id),
    i.start_price
  ) as current_high_bid,
  coalesce(
    (select max(b.amount) from bids b where b.item_id = i.id),
    i.start_price
  ) + i.min_increment as next_min_bid
from items i;

-- Enable RLS
alter table items enable row level security;
alter table bids enable row level security;
alter table settings enable row level security;

-- Public read policies
create policy "read_items" on items for select using (true);
create policy "read_bids" on bids for select using (true);
create policy "read_settings" on settings for select using (true);

-- Insert bids publicly but only when open
-- (Min increment & deadline enforced in server route)
create policy "insert_bids_open_items" on bids
for insert
with check (
  exists (
    select 1 from items i where i.id = bids.item_id and i.is_closed = false
  )
);

-- Enable Realtime for bids table (for live updates)
alter publication supabase_realtime add table bids;

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_items_updated_at before update on items
  for each row execute function update_updated_at_column();

create trigger update_settings_updated_at before update on settings
  for each row execute function update_updated_at_column();
