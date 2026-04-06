-- Add settings columns to proxy_emails
ALTER TABLE proxy_emails ADD COLUMN IF NOT EXISTS forward_to_email TEXT;
ALTER TABLE proxy_emails ADD COLUMN IF NOT EXISTS reply_mode TEXT DEFAULT 'in_app';
