-- Create RPC function to update referrer swipes (bypasses RLS)
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_referrer_swipes(
  referrer_user_id UUID,
  swipes_to_add INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner, bypassing RLS
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
