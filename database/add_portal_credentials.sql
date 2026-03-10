-- Add portal credentials columns to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS workday_email TEXT,
ADD COLUMN IF NOT EXISTS workday_password TEXT,
ADD COLUMN IF NOT EXISTS joblever_email TEXT,
ADD COLUMN IF NOT EXISTS joblever_password TEXT,
ADD COLUMN IF NOT EXISTS greenhouse_email TEXT,
ADD COLUMN IF NOT EXISTS greenhouse_password TEXT,
ADD COLUMN IF NOT EXISTS taleo_email TEXT,
ADD COLUMN IF NOT EXISTS taleo_password TEXT;

-- Add comments to indicate encryption
COMMENT ON COLUMN profiles.workday_password IS 'Encrypted password for Workday portal';
COMMENT ON COLUMN profiles.joblever_password IS 'Encrypted password for Joblever portal';
COMMENT ON COLUMN profiles.greenhouse_password IS 'Encrypted password for Greenhouse portal';
COMMENT ON COLUMN profiles.taleo_password IS 'Encrypted password for Oracle Taleo portal';
