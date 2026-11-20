-- Add entry_message column to profiles for splash screen quote
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS entry_message text;
