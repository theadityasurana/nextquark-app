-- Notifications table: stores both broadcast and user-specific push notifications
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- NULL target_user_id = broadcast to all users
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  -- optional deep-link or metadata
  data JSONB DEFAULT '{}',
  -- 'broadcast' | 'user_specific'
  type TEXT NOT NULL DEFAULT 'broadcast',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fetching user-specific + broadcast notifications
CREATE INDEX idx_notifications_target ON notifications (target_user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications (type, created_at DESC);

-- RLS: users can read their own notifications + broadcasts
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read broadcast notifications"
  ON notifications FOR SELECT
  USING (type = 'broadcast');

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = target_user_id);

-- Service role (Edge Functions) can insert/update
CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role');

-- Ensure user_push_tokens table exists (you may already have this)
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, push_token)
);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
  ON user_push_tokens FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on tokens"
  ON user_push_tokens FOR ALL
  USING (auth.role() = 'service_role');
