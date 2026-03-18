-- Add message_id column for email threading (Resend In-Reply-To support)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbound_emails' AND column_name='message_id') THEN
    ALTER TABLE inbound_emails ADD COLUMN message_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sent_emails' AND column_name='resend_message_id') THEN
    ALTER TABLE sent_emails ADD COLUMN resend_message_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sent_emails' AND column_name='in_reply_to') THEN
    ALTER TABLE sent_emails ADD COLUMN in_reply_to text;
  END IF;
END $$;
