-- Step 1: Create user_push_tokens table
CREATE TABLE IF NOT EXISTS user_push_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens' AND policyname = 'Users can insert their own push token'
  ) THEN
    CREATE POLICY "Users can insert their own push token"
      ON user_push_tokens FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens' AND policyname = 'Users can update their own push token'
  ) THEN
    CREATE POLICY "Users can update their own push token"
      ON user_push_tokens FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens' AND policyname = 'Service role can read all tokens'
  ) THEN
    CREATE POLICY "Service role can read all tokens"
      ON user_push_tokens FOR SELECT
      USING (true);
  END IF;
END $$;

-- Step 2: Create notifications table (admin inserts here)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only admins/service role can insert)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role can insert notifications'
  ) THEN
    CREATE POLICY "Service role can insert notifications"
      ON notifications FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role can read notifications'
  ) THEN
    CREATE POLICY "Service role can read notifications"
      ON notifications FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role can update notifications'
  ) THEN
    CREATE POLICY "Service role can update notifications"
      ON notifications FOR UPDATE
      USING (true);
  END IF;
END $$;

-- Step 3: Enable HTTP extension (if not already enabled)
-- Run this first, then run the rest of the script
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Step 4: Create function to trigger Edge Function
CREATE OR REPLACE FUNCTION trigger_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function asynchronously using pg_net
  PERFORM
    net.http_post(
      url := 'https://widujxpahzlpegzjjpqp.supabase.co/functions/v1/send-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpZHVqeHBhaHpscGVnempqcHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTI2NjIsImV4cCI6MjA4NzMyODY2Mn0.OyjX0Qg4UlDPfTmCwhdK3JuE30698f6A-a01LunhDtM"}'::jsonb,
      body := json_build_object(
        'notificationId', NEW.id,
        'title', NEW.title,
        'body', NEW.body,
        'data', NEW.data,
        'targetUserId', NEW.target_user_id
      )::jsonb
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger on notifications table
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notification();

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id);
