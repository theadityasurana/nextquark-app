-- Add thread_id for conversation threading
-- thread_id groups inbound + sent emails into the same conversation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbound_emails' AND column_name='thread_id') THEN
    ALTER TABLE inbound_emails ADD COLUMN thread_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sent_emails' AND column_name='thread_id') THEN
    ALTER TABLE sent_emails ADD COLUMN thread_id text;
  END IF;
END $$;

-- Backfill thread_id for existing rows based on normalized subject
UPDATE inbound_emails SET thread_id = lower(regexp_replace(coalesce(subject, ''), '^(Re:|Fwd:|Fw:)\s*', '', 'gi'))
WHERE thread_id IS NULL;

UPDATE sent_emails SET thread_id = lower(regexp_replace(coalesce(subject, ''), '^(Re:|Fwd:|Fw:)\s*', '', 'gi'))
WHERE thread_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_emails_thread ON inbound_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_thread ON sent_emails(thread_id);
