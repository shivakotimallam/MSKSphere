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
