-- Fix live_application_queue table to support incomplete user profiles
-- Run this in Supabase SQL Editor

-- Ensure all optional fields are nullable so incomplete profiles can still submit applications
ALTER TABLE live_application_queue 
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN country_code DROP NOT NULL,
  ALTER COLUMN location DROP NOT NULL,
  ALTER COLUMN headline DROP NOT NULL,
  ALTER COLUMN bio DROP NOT NULL,
  ALTER COLUMN resume_url DROP NOT NULL,
  ALTER COLUMN linkedin_url DROP NOT NULL,
  ALTER COLUMN github_url DROP NOT NULL,
  ALTER COLUMN veteran_status DROP NOT NULL,
  ALTER COLUMN disability_status DROP NOT NULL,
  ALTER COLUMN ethnicity DROP NOT NULL,
  ALTER COLUMN salary_currency DROP NOT NULL,
  ALTER COLUMN salary_min DROP NOT NULL,
  ALTER COLUMN salary_max DROP NOT NULL,
  ALTER COLUMN job_url DROP NOT NULL,
  ALTER COLUMN onboarding_data DROP NOT NULL;

-- Ensure array fields have proper defaults (text[] type)
ALTER TABLE live_application_queue 
  ALTER COLUMN skills SET DEFAULT '{}'::text[],
  ALTER COLUMN top_skills SET DEFAULT '{}'::text[],
  ALTER COLUMN desired_roles SET DEFAULT '{}'::text[],
  ALTER COLUMN preferred_cities SET DEFAULT '{}'::text[],
  ALTER COLUMN work_mode_preferences SET DEFAULT '{}'::text[],
  ALTER COLUMN work_professions SET DEFAULT '{}'::text[];

-- Ensure JSONB array fields have proper defaults
ALTER TABLE live_application_queue 
  ALTER COLUMN experience SET DEFAULT '[]'::jsonb,
  ALTER COLUMN education SET DEFAULT '[]'::jsonb,
  ALTER COLUMN certifications SET DEFAULT '[]'::jsonb,
  ALTER COLUMN achievements SET DEFAULT '[]'::jsonb,
  ALTER COLUMN job_preferences SET DEFAULT '[]'::jsonb;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'live_application_queue'
ORDER BY ordinal_position;
