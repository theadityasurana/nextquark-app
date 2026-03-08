-- DIAGNOSIS: Find what's causing "total_apps" error
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check for triggers on live_application_queue
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'live_application_queue';

-- 2. Check for functions that reference total_apps
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%total_apps%'
AND routine_schema = 'public';

-- 3. LIKELY CAUSE: A trigger is trying to update profiles.total_apps
-- Check if profiles table has total_apps column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'total_apps';

-- FIX 1: Add the missing column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_apps INTEGER DEFAULT 0;

-- FIX 2: Or disable the trigger (find trigger name from query 1 first)
-- DROP TRIGGER IF EXISTS [trigger_name] ON live_application_queue;

-- After running FIX 1, test by inserting a record:
-- INSERT INTO live_application_queue (user_id, job_id, company_name, job_title, status)
-- VALUES ('test-user-id', 'test-job-id', 'Test Company', 'Test Job', 'pending');
