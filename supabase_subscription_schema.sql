-- Subscription Management Schema
-- Run this in your Supabase SQL Editor

-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS applications_remaining INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS applications_limit INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_type, subscription_end_date);

-- Function to check and expire subscriptions
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    subscription_type = 'free',
    applications_remaining = 40,
    applications_limit = 40,
    subscription_start_date = NULL,
    subscription_end_date = NULL
  WHERE 
    subscription_type IN ('pro', 'premium')
    AND subscription_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run expiry check daily (requires pg_cron extension)
-- Note: You may need to enable pg_cron extension in Supabase dashboard first
-- SELECT cron.schedule('check-subscription-expiry', '0 0 * * *', 'SELECT check_subscription_expiry()');

-- Function to reset monthly applications
CREATE OR REPLACE FUNCTION reset_monthly_applications()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    applications_remaining = applications_limit,
    last_reset_date = NOW()
  WHERE 
    last_reset_date < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- Create payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_id TEXT,
  order_id TEXT,
  status TEXT DEFAULT 'pending',
  coupon_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
