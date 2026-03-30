-- Add experience_level column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Add desired_role_categories column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_role_categories TEXT[] DEFAULT '{}';
