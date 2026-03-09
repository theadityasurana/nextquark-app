-- MANUAL REFERRAL CODE SETUP FOR TESTING
-- Run this in Supabase SQL Editor

-- Step 1: Find your user ID and set a referral code
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET referral_code = 'ADITYZ4P',
    referral_swipes_earned = 0
WHERE email = 'your-email@example.com';

-- Step 2: Verify it was set
SELECT id, full_name, email, referral_code, applications_remaining 
FROM profiles 
WHERE referral_code = 'ADITYZ4P';

-- Alternative: Set referral code for ALL existing users
UPDATE profiles 
SET referral_code = UPPER(SUBSTRING(COALESCE(full_name, 'USER'), 1, 4) || 
                   SUBSTRING(MD5(RANDOM()::TEXT), 1, 4)),
    referral_swipes_earned = 0
WHERE referral_code IS NULL;

-- View all users with referral codes
SELECT id, full_name, email, referral_code, applications_remaining, referral_swipes_earned
FROM profiles 
ORDER BY created_at DESC;
