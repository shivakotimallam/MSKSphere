-- Allow exams to be saved without a start time
ALTER TABLE exams ALTER COLUMN start_time DROP NOT NULL;
