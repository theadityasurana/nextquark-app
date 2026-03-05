-- Check if RLS is enabled on companies table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'companies';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'companies';

-- FIX: Disable RLS or add a policy to allow SELECT
-- Option 1: Disable RLS (simpler, for public data)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Option 2: Keep RLS but allow everyone to read (more secure)
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read access" ON companies FOR SELECT USING (true);
