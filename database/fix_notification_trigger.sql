-- Quick fix for the trigger function
-- Run this in Supabase SQL Editor

-- Drop the old function
DROP FUNCTION IF EXISTS trigger_notification() CASCADE;

-- Create the corrected function using pg_net
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notification();

-- Test it
SELECT 'Trigger function updated successfully!' as status;
