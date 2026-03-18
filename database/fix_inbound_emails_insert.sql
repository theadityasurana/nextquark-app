-- Fix: Allow service role to insert into inbound_emails
-- The webhook handler uses the service_role key which bypasses RLS,
-- but if there's any issue, this policy ensures inserts work.

-- Add INSERT policy for inbound_emails (was missing!)
DROP POLICY IF EXISTS "Service role can insert inbound emails" ON inbound_emails;
CREATE POLICY "Service role can insert inbound emails"
  ON inbound_emails FOR INSERT
  WITH CHECK (true);

-- Verify the table columns exist and check for any issues
DO $$
BEGIN
  -- Ensure body_text and body_html columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbound_emails' AND column_name='body_text') THEN
    ALTER TABLE inbound_emails ADD COLUMN body_text text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inbound_emails' AND column_name='body_html') THEN
    ALTER TABLE inbound_emails ADD COLUMN body_html text;
  END IF;
END $$;
