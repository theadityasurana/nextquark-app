# Quick Reference: Send Notifications

## 🚀 Send Notification (3 Ways)

### 1. Supabase Dashboard (Easiest)
1. Go to Table Editor → `notifications`
2. Click "Insert row"
3. Add title and body
4. Save → Notification sends automatically!

### 2. SQL Query
```sql
-- All users
INSERT INTO notifications (title, body) 
VALUES ('Hello!', 'This is a test notification');

-- Specific user
INSERT INTO notifications (title, body, target_user_id) 
VALUES ('Welcome!', 'Thanks for signing up', 'user-uuid-here');

-- With custom data
INSERT INTO notifications (title, body, data) 
VALUES (
  'New Job',
  'Check out this opportunity',
  '{"job_id": "123", "screen": "job-details"}'::jsonb
);
```

### 3. From Code
```typescript
await supabase.from('notifications').insert({
  title: 'New Feature',
  body: 'Check it out!',
  target_user_id: null, // null = all users
  data: { screen: 'premium' }
});
```

## 📋 Setup Checklist

- [ ] Run `supabase_notifications_setup.sql` in Supabase SQL Editor
- [ ] Deploy Edge Function: `supabase functions deploy send-notification`
- [ ] Test app on physical device
- [ ] Send test notification from Supabase dashboard

## 🔍 Check Status

```sql
-- View all notifications
SELECT * FROM notifications ORDER BY created_at DESC;

-- View push tokens
SELECT * FROM user_push_tokens;

-- Check unsent notifications
SELECT * FROM notifications WHERE sent_at IS NULL;
```

## 🎯 Common Use Cases

**Welcome new users:**
```sql
INSERT INTO notifications (title, body, target_user_id)
VALUES ('Welcome!', 'Complete your profile to get started', 'NEW_USER_ID');
```

**Job alerts:**
```sql
INSERT INTO notifications (title, body, data)
VALUES (
  'New Job Match',
  '5 new jobs match your profile',
  '{"screen": "discover", "filter": "new"}'::jsonb
);
```

**Broadcast announcement:**
```sql
INSERT INTO notifications (title, body)
VALUES ('App Update', 'New features available now!');
```

That's it! 🎉
