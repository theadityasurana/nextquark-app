-- Add missing column
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS in_reply_to TEXT;
