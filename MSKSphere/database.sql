-- ============================================================
-- MSKSphere — Complete Database Schema
-- Run this entire file once in the Supabase SQL Editor.
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- ============================================================
-- 1. TEMPLATES & GOALS
-- ============================================================
-- Migration: Add Templates Feature to MSKSphere
-- This migration adds tables for templates and template tasks, and extends the tasks table
-- Execute this in the Supabase SQL Editor

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📅',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create template_tasks table
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  start_time TEXT, -- Format: HH:MM (nullable = no fixed time)
  end_time TEXT, -- Format: HH:MM (nullable = no fixed time)
  selected_days TEXT[] NOT NULL, -- Array of day names: ['Monday', 'Tuesday', etc.]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- For existing databases: add priority column if missing
ALTER TABLE template_tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

-- Add columns to existing tasks table for template source tracking
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_source TEXT DEFAULT 'regular' CHECK (task_source IN ('regular', 'template')),
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_template_task_id UUID REFERENCES template_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_icon_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_start_time TEXT, -- Format: HH:MM
  ADD COLUMN IF NOT EXISTS scheduled_end_time TEXT; -- Format: HH:MM

-- Note: Duplicate prevention is handled at the application layer in script.js
-- The applyTemplate function checks for existing tasks before inserting new ones

-- Create goals table for long-term goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  deadline DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);

-- Enable Row Level Security for goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals table
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON goals;
CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for goals updated_at
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_user_id ON template_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_template_id ON tasks(source_template_id) WHERE source_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_source_template_task_id ON tasks(source_template_task_id) WHERE source_template_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_task_source ON tasks(task_source) WHERE task_source = 'template';

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates table
-- Users can only see their own templates
DROP POLICY IF EXISTS "Users can view own templates" ON templates;
CREATE POLICY "Users can view own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own templates
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own templates
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own templates
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;
CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for template_tasks table
-- Users can only see their own template tasks
DROP POLICY IF EXISTS "Users can view own template tasks" ON template_tasks;
CREATE POLICY "Users can view own template tasks"
  ON template_tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own template tasks
DROP POLICY IF EXISTS "Users can insert own template tasks" ON template_tasks;
CREATE POLICY "Users can insert own template tasks"
  ON template_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own template tasks
DROP POLICY IF EXISTS "Users can update own template tasks" ON template_tasks;
CREATE POLICY "Users can update own template tasks"
  ON template_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own template tasks
DROP POLICY IF EXISTS "Users can delete own template tasks" ON template_tasks;
CREATE POLICY "Users can delete own template tasks"
  ON template_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Note: Generated tasks in the tasks table are already protected by existing RLS policies
-- The foreign key constraints are set to ON DELETE SET NULL, so deleting a template
-- does NOT delete the generated tasks - they become orphaned but remain accessible

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_tasks_updated_at ON template_tasks;
CREATE TRIGGER update_template_tasks_updated_at
  BEFORE UPDATE ON template_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 1b. TEMPLATE TASKS — OPTIONAL TIMES
-- ============================================================
-- Allow template tasks without fixed start/end times
ALTER TABLE template_tasks ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE template_tasks ALTER COLUMN end_time DROP NOT NULL;

-- ============================================================
-- 2. EXAMS
-- ============================================================
-- Migration: Add Exams Feature to MSKSphere
-- This migration adds the exams table for tracking upcoming examinations
-- Execute this in the Supabase SQL Editor

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  exam_date DATE NOT NULL,
  start_time TEXT,            -- Format: HH:MM (optional)
  end_time TEXT,             -- Format: HH:MM (optional)
  exam_type TEXT CHECK (exam_type IN ('Mid-I', 'Mid-II', 'Internals (Lab)', 'Externals (Lab)', 'Semester', 'Other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for exams
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);

-- Enable Row Level Security
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exams table
-- Users can only see their own exams
DROP POLICY IF EXISTS "Users can view own exams" ON exams;
CREATE POLICY "Users can view own exams"
  ON exams FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own exams
DROP POLICY IF EXISTS "Users can insert own exams" ON exams;
CREATE POLICY "Users can insert own exams"
  ON exams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own exams
DROP POLICY IF EXISTS "Users can update own exams" ON exams;
CREATE POLICY "Users can update own exams"
  ON exams FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own exams
DROP POLICY IF EXISTS "Users can delete own exams" ON exams;
CREATE POLICY "Users can delete own exams"
  ON exams FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for exams updated_at
DROP TRIGGER IF EXISTS update_exams_updated_at ON exams;
CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2b. EXAMS — OPTIONAL TIMES
-- ============================================================
-- Allow exams to be saved without a start time
ALTER TABLE exams ALTER COLUMN start_time DROP NOT NULL;

-- ============================================================
-- 3. STUDY (SUBJECTS, UNITS, TOPICS & EXAM LINKS)
-- ============================================================
-- Migration: Study Management System (Subjects, Units, Topics) + Exam Linking
-- Execute this in the Supabase SQL Editor

-- A. subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Academic', 'Technical Skills', 'Programming', 'Professional Skills', 'Personal Learning', 'Other')),
  description TEXT,
  learning_goal TEXT,
  target_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  estimated_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. subject_units table
CREATE TABLE IF NOT EXISTS subject_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. subject_topics table
CREATE TABLE IF NOT EXISTS subject_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES subject_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  estimated_time TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- D. Link exams to subjects (optional)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- E. Optional exam-topic -> subject-topic links (for future exam-prep tracking)
CREATE TABLE IF NOT EXISTS exam_topic_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_topic_id UUID,
  subject_topic_id UUID NOT NULL REFERENCES subject_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_units_subject_id ON subject_units(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_units_user_id ON subject_units(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_topics_subject_id ON subject_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_topics_unit_id ON subject_topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_subject_topics_user_id ON subject_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_topic_links_exam_id ON exam_topic_links(exam_id);

-- updated_at function (same as other migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_topic_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subjects" ON subjects;
CREATE POLICY "Users can view own subjects" ON subjects FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own subjects" ON subjects;
CREATE POLICY "Users can insert own subjects" ON subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own subjects" ON subjects;
CREATE POLICY "Users can update own subjects" ON subjects FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own subjects" ON subjects;
CREATE POLICY "Users can delete own subjects" ON subjects FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own subject_units" ON subject_units;
CREATE POLICY "Users can view own subject_units" ON subject_units FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own subject_units" ON subject_units;
CREATE POLICY "Users can insert own subject_units" ON subject_units FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own subject_units" ON subject_units;
CREATE POLICY "Users can update own subject_units" ON subject_units FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own subject_units" ON subject_units;
CREATE POLICY "Users can delete own subject_units" ON subject_units FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own subject_topics" ON subject_topics;
CREATE POLICY "Users can view own subject_topics" ON subject_topics FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own subject_topics" ON subject_topics;
CREATE POLICY "Users can insert own subject_topics" ON subject_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own subject_topics" ON subject_topics;
CREATE POLICY "Users can update own subject_topics" ON subject_topics FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own subject_topics" ON subject_topics;
CREATE POLICY "Users can delete own subject_topics" ON subject_topics FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own exam_topic_links" ON exam_topic_links;
CREATE POLICY "Users can view own exam_topic_links" ON exam_topic_links FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own exam_topic_links" ON exam_topic_links;
CREATE POLICY "Users can insert own exam_topic_links" ON exam_topic_links FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own exam_topic_links" ON exam_topic_links;
CREATE POLICY "Users can update own exam_topic_links" ON exam_topic_links FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own exam_topic_links" ON exam_topic_links;
CREATE POLICY "Users can delete own exam_topic_links" ON exam_topic_links FOR DELETE USING (auth.uid() = user_id);

-- Triggers
DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subject_units_updated_at ON subject_units;
CREATE TRIGGER update_subject_units_updated_at BEFORE UPDATE ON subject_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subject_topics_updated_at ON subject_topics;
CREATE TRIGGER update_subject_topics_updated_at BEFORE UPDATE ON subject_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3b. STUDY SESSIONS (HOURS TRACKING)
-- ============================================================
-- Migration: Study Sessions (Study Hours Tracking)
-- Execute this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES subject_units(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES subject_topics(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_date ON study_sessions(session_date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own study_sessions" ON study_sessions;
CREATE POLICY "Users can view own study_sessions" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own study_sessions" ON study_sessions;
CREATE POLICY "Users can insert own study_sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own study_sessions" ON study_sessions;
CREATE POLICY "Users can update own study_sessions" ON study_sessions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own study_sessions" ON study_sessions;
CREATE POLICY "Users can delete own study_sessions" ON study_sessions FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_study_sessions_updated_at ON study_sessions;
CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. EXPENSE TRACKER (ACCOUNTS & TRANSACTIONS)
-- ============================================================
-- Migration: Add Expense Tracker Feature to MSKSphere
-- This migration adds tables for accounts and transactions
-- Execute this in the Supabase SQL Editor

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Cash, Bank Account, Savings Account, UPI/Wallet, etc.
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for accounts
CREATE POLICY "Users can view their own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- income, expense, transfer
  amount DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  transfer_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- For transfers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- Create trigger for updated_at on accounts
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4b. SECRET SAVINGS ACCOUNTS
-- ============================================================
-- Migration: Secret savings account flag on accounts
-- Execute in Supabase SQL Editor
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 5. PENDING MONEY (LENT / TO-GIVE)
-- ============================================================
-- Migration: Add Pending Money Tracking to MSKSphere
-- This migration adds a table to track pending money (money to receive and money to give)
-- Execute this in the Supabase SQL Editor

-- Create pending_money table
CREATE TABLE IF NOT EXISTS pending_money (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'receive' (money lent to you) or 'give' (money you owe)
  person_name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on pending_money
ALTER TABLE pending_money ENABLE ROW LEVEL SECURITY;

-- Create policies for pending_money
CREATE POLICY "Users can view their own pending money"
  ON pending_money FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending money"
  ON pending_money FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending money"
  ON pending_money FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending money"
  ON pending_money FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for pending_money
CREATE INDEX IF NOT EXISTS idx_pending_money_user ON pending_money(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_money_date ON pending_money(date);
CREATE INDEX IF NOT EXISTS idx_pending_money_status ON pending_money(status);
CREATE INDEX IF NOT EXISTS idx_pending_money_type ON pending_money(type);

-- Create trigger for updated_at on pending_money
CREATE TRIGGER update_pending_money_updated_at
  BEFORE UPDATE ON pending_money
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. DAILY NOTES
-- ============================================================
-- Create daily_notes table
CREATE TABLE IF NOT EXISTS daily_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  note TEXT,
  best_thing TEXT,
  bad_thing TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, note_date)
);

-- Enable RLS
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own daily notes"
  ON daily_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily notes"
  ON daily_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily notes"
  ON daily_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily notes"
  ON daily_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_notes_user_date ON daily_notes(user_id, note_date);

-- Add columns if they don't exist (for existing installations)
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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_notes' AND column_name = 'note'
  ) THEN
    ALTER TABLE daily_notes ALTER COLUMN note DROP NOT NULL;
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_notes_updated_at
  BEFORE UPDATE ON daily_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. PROFILES — MOTIVATION SETTINGS
-- ============================================================
-- Add motivation settings columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS motivation_emoji TEXT,
ADD COLUMN IF NOT EXISTS motivation_message TEXT;

-- ============================================================
-- 7b. PROFILES — ENTRY SCREEN MESSAGE
-- ============================================================
-- Add entry_message column to profiles for splash screen quote
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS entry_message text;
