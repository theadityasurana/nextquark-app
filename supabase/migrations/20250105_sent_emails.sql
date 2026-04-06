-- Create sent_emails table if it doesn't exist
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  thread_id TEXT,
  in_reply_to TEXT,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can read own sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Users can insert own sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Users can update own sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Users can delete own sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Service role full access on sent_emails" ON sent_emails;
DROP POLICY IF EXISTS "Anon can insert sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Anon can read sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Anon can update sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Anon can delete sent emails" ON sent_emails;
DROP POLICY IF EXISTS "Allow all sent_emails" ON sent_emails;

-- Simple open policy (service role client handles auth in app layer)
CREATE POLICY "Allow all sent_emails" ON sent_emails FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id ON sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_emails_thread_id ON sent_emails(user_id, thread_id);
