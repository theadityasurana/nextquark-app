-- Supabase Schema Updates for Profile Descriptions
-- Run this in your Supabase SQL Editor

-- The profile data (experience, education, achievements) is stored as JSON in profiles
-- We just need to add the missing top-level fields

-- Add work authorization and job requirements to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS work_authorization_status TEXT,
ADD COLUMN IF NOT EXISTS job_requirements TEXT[];

-- Add resume URL to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- Create resumes table for multiple resume support
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT false
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_primary ON resumes(user_id, is_primary);

-- Note: Experience, Education, and Achievements are stored as JSONB arrays in profiles
-- The TypeScript types already support description, achievements, extracurriculars fields
-- No schema changes needed for those - they're already part of the JSON structure
