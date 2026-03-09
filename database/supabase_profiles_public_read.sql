-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create policy to allow anyone to view basic profile information
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Alternatively, if you want authenticated users only:
-- CREATE POLICY "Authenticated users can view all profiles"
-- ON profiles FOR SELECT
-- TO authenticated
-- USING (true);
