-- Add daily swipes tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_swipes_remaining integer DEFAULT 15;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_swipes_reset_at timestamptz DEFAULT NULL;
