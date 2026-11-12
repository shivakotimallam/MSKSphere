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
  start_time TEXT NOT NULL, -- Format: HH:MM
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
