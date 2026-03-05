-- Add favorite_companies column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS favorite_companies TEXT[] DEFAULT '{}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_favorite_companies 
ON profiles USING GIN (favorite_companies);

-- Update existing profiles to have empty array if null
UPDATE profiles 
SET favorite_companies = '{}' 
WHERE favorite_companies IS NULL;
