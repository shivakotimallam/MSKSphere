-- Allow template tasks without fixed start/end times
ALTER TABLE template_tasks ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE template_tasks ALTER COLUMN end_time DROP NOT NULL;
