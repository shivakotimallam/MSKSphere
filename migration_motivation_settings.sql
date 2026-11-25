-- Add motivation settings columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS motivation_message TEXT;

-- Drop the unused motivation_emoji column if it exists
ALTER TABLE profiles DROP COLUMN IF EXISTS motivation_emoji;
