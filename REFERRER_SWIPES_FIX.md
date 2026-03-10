# Fix Referrer Swipes Issue - Setup Guide

## Problem
The referrer (person who shared the code) is not receiving their 5 bonus swipes when someone uses their referral code. This is due to **Row Level Security (RLS)** policies preventing the new user from updating another user's profile.

## Root Cause
When a new user signs up with a referral code:
- The new user is authenticated as themselves
- They try to update the referrer's profile (different user)
- RLS policies block this cross-user update
- The referrer doesn't get their swipes

## Solution
Use a PostgreSQL function with `SECURITY DEFINER` to bypass RLS for the referrer update.

## Setup Steps

### Step 1: Run the SQL Function
Open Supabase Dashboard → SQL Editor and run this:

```sql
-- Create RPC function to update referrer swipes (bypasses RLS)
CREATE OR REPLACE FUNCTION update_referrer_swipes(
  referrer_user_id UUID,
  swipes_to_add INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with elevated privileges, bypassing RLS
AS $$
BEGIN
  UPDATE profiles
  SET 
    applications_remaining = COALESCE(applications_remaining, 0) + swipes_to_add,
    applications_limit = COALESCE(applications_limit, 0) + swipes_to_add,
    referral_swipes_earned = COALESCE(referral_swipes_earned, 0) + swipes_to_add,
    updated_at = NOW()
  WHERE id = referrer_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_referrer_swipes(UUID, INTEGER) TO authenticated;
```

### Step 2: Verify Function Creation
Run this to confirm the function exists:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'update_referrer_swipes';
```

You should see one row returned.

### Step 3: Test the Referral System

1. **Create a referral code:**
   - Sign in as User A
   - Go to Profile → "Share & Earn Free Swipes"
   - Copy the referral code

2. **Test with new user:**
   - Sign out
   - Create new account as User B
   - Enter User A's referral code during signup
   - Complete registration

3. **Check console logs:**
   - Look for: `✅ [REFERRAL] Referrer updated successfully`
   - If you see errors, check the full error message

4. **Verify in database:**
```sql
-- Check referrer got their swipes
SELECT 
  full_name, 
  applications_remaining, 
  applications_limit,
  referral_swipes_earned,
  referral_code
FROM profiles 
WHERE referral_code IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- Check new user got their swipes
SELECT 
  full_name, 
  applications_remaining, 
  applications_limit,
  referred_by
FROM profiles 
WHERE referred_by IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Check referral record
SELECT 
  r.*,
  p1.full_name as referrer_name,
  p2.full_name as referee_name
FROM referrals r
JOIN profiles p1 ON r.referrer_id = p1.id
JOIN profiles p2 ON r.referee_id = p2.id
ORDER BY r.created_at DESC
LIMIT 5;
```

## Expected Results

### For New User (User B):
- `applications_remaining`: 45
- `applications_limit`: 45
- `referred_by`: User A's ID

### For Referrer (User A):
- `applications_remaining`: Previous + 5
- `applications_limit`: Previous + 5
- `referral_swipes_earned`: Previous + 5

## Troubleshooting

### Issue: Function not found error
**Solution**: Make sure you ran the SQL function creation script in Supabase SQL Editor.

### Issue: Permission denied
**Solution**: Run the GRANT statement:
```sql
GRANT EXECUTE ON FUNCTION update_referrer_swipes(UUID, INTEGER) TO authenticated;
```

### Issue: Still not working
**Check:**
1. Console logs for detailed error messages
2. Supabase logs in Dashboard → Logs
3. RLS policies on profiles table:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## How It Works Now

1. New user signs up with referral code
2. System validates the code
3. **RPC function** updates referrer's swipes (bypasses RLS)
4. Direct update for new user's swipes (they can update their own profile)
5. Referral record is created
6. Both users get their swipes!

## Files Modified
- `/lib/referral.ts` - Uses RPC function instead of direct update
- `/database/update_referrer_swipes_function.sql` - New SQL function

The referrer should now receive their 5 bonus swipes correctly!