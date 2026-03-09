-- ============================================
-- TEST NOTIFICATIONS
-- Copy and paste these into Supabase SQL Editor
-- ============================================

-- 1. Send to ALL users
INSERT INTO notifications (title, body) 
VALUES ('Welcome to NextQuark!', 'Start swiping to find your dream job');

-- 2. Send to specific user (replace with actual user_id)
INSERT INTO notifications (title, body, target_user_id) 
VALUES (
  'Profile Viewed', 
  'A company just viewed your profile!',
  'REPLACE_WITH_USER_ID'
);

-- 3. Send with custom data (opens specific screen)
INSERT INTO notifications (title, body, data) 
VALUES (
  'New Job Match',
  'Software Engineer at Google - 95% match',
  '{"job_id": "abc123", "screen": "/job-details"}'::jsonb
);

-- 4. Send job alert
INSERT INTO notifications (title, body, data) 
VALUES (
  '5 New Jobs Available',
  'Check out these opportunities matching your profile',
  '{"screen": "/(tabs)/discover"}'::jsonb
);

-- 5. Send premium upgrade prompt
INSERT INTO notifications (title, body, data) 
VALUES (
  'Unlock Premium Features',
  'Get unlimited swipes and priority applications',
  '{"screen": "/premium"}'::jsonb
);

-- ============================================
-- CHECK NOTIFICATION STATUS
-- ============================================

-- View all notifications
SELECT 
  id,
  title,
  body,
  target_user_id,
  sent_at,
  created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- View push tokens (check if users are registered)
SELECT 
  user_id,
  push_token,
  created_at
FROM user_push_tokens 
ORDER BY created_at DESC;

-- Count total users with push tokens
SELECT COUNT(*) as total_users_with_notifications 
FROM user_push_tokens;

-- View unsent notifications (if any)
SELECT * FROM notifications 
WHERE sent_at IS NULL 
ORDER BY created_at DESC;
