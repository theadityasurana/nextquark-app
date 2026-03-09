-- Fix for "column total_apps does not exist" error
-- Run this in Supabase SQL Editor

-- First, check for any triggers on live_application_queue
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'live_application_queue';

-- Drop any problematic triggers (if found)
-- DROP TRIGGER IF EXISTS trigger_name ON live_application_queue;

-- Check for functions that might reference total_apps
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%total_apps%';

-- If you find a function, you may need to drop/recreate it
-- DROP FUNCTION IF EXISTS function_name();

-- Ensure the table has correct structure
-- Add total_apps column if needed for tracking
ALTER TABLE live_application_queue 
ADD COLUMN IF NOT EXISTS total_apps INTEGER DEFAULT 0;

-- Or if the column shouldn't exist, remove references to it from triggers/functions
