-- Add Workday credentials columns to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS workday_email TEXT,
ADD COLUMN IF NOT EXISTS workday_password TEXT;

-- Add comment to indicate encryption
COMMENT ON COLUMN profiles.workday_password IS 'Encrypted password for Workday portal';
