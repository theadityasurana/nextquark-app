-- Resend Email Proxy Setup
-- Run this in your Supabase SQL Editor

-- Table to map users to their proxy email addresses
CREATE TABLE IF NOT EXISTS proxy_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proxy_address text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_emails_user ON proxy_emails(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_emails_address ON proxy_emails(proxy_address);

ALTER TABLE proxy_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own proxy email" ON proxy_emails;
CREATE POLICY "Users can read own proxy email"
  ON proxy_emails FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own proxy email" ON proxy_emails;
CREATE POLICY "Users can insert own proxy email"
  ON proxy_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Table to store inbound emails received via Resend webhook
CREATE TABLE IF NOT EXISTS inbound_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proxy_address text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  subject text,
  body_text text,
  body_html text,
  is_starred boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  is_read boolean DEFAULT false,
  received_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_user ON inbound_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_received ON inbound_emails(received_at DESC);

ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own inbound emails" ON inbound_emails;
CREATE POLICY "Users can read own inbound emails"
  ON inbound_emails FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inbound emails" ON inbound_emails;
CREATE POLICY "Users can update own inbound emails"
  ON inbound_emails FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inbound emails" ON inbound_emails;
CREATE POLICY "Users can delete own inbound emails"
  ON inbound_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Table to store sent emails
CREATE TABLE IF NOT EXISTS sent_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_email text NOT NULL,
  to_email text NOT NULL,
  subject text,
  body_text text,
  is_starred boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_user ON sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent ON sent_emails(sent_at DESC);

ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sent emails" ON sent_emails;
CREATE POLICY "Users can read own sent emails"
  ON sent_emails FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sent emails" ON sent_emails;
CREATE POLICY "Users can insert own sent emails"
  ON sent_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sent emails" ON sent_emails;
CREATE POLICY "Users can update own sent emails"
  ON sent_emails FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sent emails" ON sent_emails;
CREATE POLICY "Users can delete own sent emails"
  ON sent_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime so the app gets live updates
ALTER PUBLICATION supabase_realtime ADD TABLE inbound_emails;
ALTER PUBLICATION supabase_realtime ADD TABLE sent_emails;

-- Migration: Add columns to existing inbound_emails table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbound_emails' AND column_name='is_starred') THEN
    ALTER TABLE inbound_emails ADD COLUMN is_starred boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbound_emails' AND column_name='is_archived') THEN
    ALTER TABLE inbound_emails ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbound_emails' AND column_name='is_read') THEN
    ALTER TABLE inbound_emails ADD COLUMN is_read boolean DEFAULT false;
  END IF;
END $$;
