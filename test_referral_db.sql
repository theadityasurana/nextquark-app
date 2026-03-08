-- TEST QUERIES - Run these in Supabase SQL Editor to verify setup

-- 1. Check if referral columns exist in profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('referral_code', 'referral_swipes_earned', 'referred_by')
ORDER BY column_name;

-- 2. Check if referrals table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'referrals';

-- 3. Check referrals table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'referrals'
ORDER BY ordinal_position;

-- 4. Check RLS policies on referrals table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'referrals';

-- 5. View all referral codes (if any exist)
SELECT id, full_name, referral_code, referral_swipes_earned, referred_by
FROM profiles 
WHERE referral_code IS NOT NULL
ORDER BY created_at DESC;

-- 6. View all referrals (if any exist)
SELECT r.*, 
       p1.full_name as referrer_name,
       p2.full_name as referee_name
FROM referrals r
LEFT JOIN profiles p1 ON r.referrer_id = p1.id
LEFT JOIN profiles p2 ON r.referee_id = p2.id
ORDER BY r.created_at DESC;
