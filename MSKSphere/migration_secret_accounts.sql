-- Migration: Secret savings account flag on accounts
-- Execute in Supabase SQL Editor
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;
