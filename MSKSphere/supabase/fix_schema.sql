-- Fix Schema: reconcile database with what script.js expects
-- Run this once in the Supabase SQL Editor. All statements are idempotent
-- (safe to run multiple times).

-- 0. tasks: core columns the app inserts/selects (safe no-ops if they exist)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS custom_days TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- 1. template_tasks: code inserts/selects `task_name` and `priority`
ALTER TABLE template_tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE template_tasks
  ADD COLUMN IF NOT EXISTS selected_days TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2. tasks: template-tracking columns used by applyTemplate / rendering
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_source TEXT DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS source_template_id UUID,
  ADD COLUMN IF NOT EXISTS source_template_task_id UUID,
  ADD COLUMN IF NOT EXISTS template_icon_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_start_time TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_end_time TEXT;

-- 3. daily_notes: code uses note_date + best_thing/bad_thing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_notes' AND column_name = 'best_thing'
  ) THEN
    ALTER TABLE daily_notes ADD COLUMN best_thing TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_notes' AND column_name = 'bad_thing'
  ) THEN
    ALTER TABLE daily_notes ADD COLUMN bad_thing TEXT;
  END IF;
END $$;

ALTER TABLE daily_notes ALTER COLUMN note DROP NOT NULL;

-- 4. profiles: motivation settings columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS motivation_emoji TEXT,
  ADD COLUMN IF NOT EXISTS motivation_message TEXT;
