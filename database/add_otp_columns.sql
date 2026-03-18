-- Add OTP columns to live_application_queue
ALTER TABLE live_application_queue
  ADD COLUMN IF NOT EXISTS verification_otp TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS otp_received_at TIMESTAMPTZ DEFAULT NULL;
