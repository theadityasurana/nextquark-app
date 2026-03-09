-- Run this in your Supabase SQL Editor to check if companies exist

-- Check if companies table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'companies'
);

-- Count companies
SELECT COUNT(*) as total_companies FROM companies;

-- Show first 5 companies
SELECT name, logo_url FROM companies LIMIT 5;

-- Check if Meta exists
SELECT * FROM companies WHERE name ILIKE '%meta%';
