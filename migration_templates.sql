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
  start_time TEXT NOT NULL, -- Format: HH:MM
  end_time TEXT NOT NULL, -- Format: HH:MM
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
