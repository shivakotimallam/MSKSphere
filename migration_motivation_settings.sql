-- Add motivation settings columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS motivation_emoji TEXT,
ADD COLUMN IF NOT EXISTS motivation_message TEXT;
