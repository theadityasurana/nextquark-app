-- Referral System Setup
-- Run this in Supabase SQL Editor

-- Step 1: Add referral columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referral_swipes_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- Step 2: Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  swipes_awarded INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referee_id)
);

-- Step 3: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referee ON referrals(referee_id);

-- Step 4: Enable RLS (Row Level Security)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for referrals table
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "System can insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

-- Step 6: Grant permissions
GRANT SELECT, INSERT ON referrals TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Verification queries (optional - run these to check setup)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name LIKE 'referral%';
-- SELECT * FROM referrals LIMIT 5;
