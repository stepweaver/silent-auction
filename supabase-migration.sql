-- Migration: Update bids table from 'contact' to required 'email' column
-- Run this in your Supabase SQL Editor if you have an existing bids table

-- Add new column
alter table bids add column if not exists email text;

-- Migrate existing data: if contact looks like an email, put it in email
update bids 
set 
  email = case 
    when contact ~* '^[^@]+@[^@]+\.[^@]+$' then contact
    else null
  end
where email is null and contact is not null;

-- For rows that couldn't be migrated automatically (no contact or invalid format)
-- Set a placeholder email if email is still null (required field)
-- You may want to review these and update manually
update bids 
set email = COALESCE(email, 'needs-update@example.com')
where email is null;

-- Now make email required
alter table bids alter column email set not null;

-- Drop the old contact column if it exists
alter table bids drop column if exists contact;

-- Verify the migration
select column_name, data_type, is_nullable 
from information_schema.columns 
where table_name = 'bids' 
order by ordinal_position;

