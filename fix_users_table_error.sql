-- Fix for "relation users does not exist" error
-- This creates a view that aliases profiles table as users
-- Run this in your Supabase SQL Editor

-- Drop view if it exists
DROP VIEW IF EXISTS users;

-- Create view that maps profiles to users
CREATE VIEW users AS 
SELECT 
  id,
  full_name as name,
  email,
  phone,
  avatar_url,
  headline,
  location,
  bio,
  skills,
  experience,
  education,
  certifications,
  achievements,
  swiped_job_ids,
  favorite_companies,
  subscription_type,
  created_at,
  updated_at
FROM profiles;

-- Grant permissions
GRANT SELECT ON users TO anon, authenticated;

-- This allows any code referencing "users" table to work with "profiles" data
