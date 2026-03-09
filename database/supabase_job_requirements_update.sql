-- Supabase Schema Update for Job Requirements
-- Run this in your Supabase SQL Editor

-- Add job_requirements column if it doesn't exist
-- This stores an array of job requirement strings (e.g., ["Security Clearance", "Driver's License"])
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS job_requirements TEXT[];

-- Verify the columns exist
-- You can run this to check:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('work_authorization_status', 'job_requirements');

-- Note: work_authorization_status should already exist from previous migration
-- If it doesn't exist, uncomment the line below:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_authorization_status TEXT;
