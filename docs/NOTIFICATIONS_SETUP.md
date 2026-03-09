# Push Notifications Setup Complete

## What Was Set Up

### 1. **App Files Created**
- `lib/notifications.ts` - Push notification registration and token management
- Updated `contexts/AuthContext.tsx` - Auto-registers push tokens on sign in

### 2. **Supabase Files Created**
- `supabase_notifications_setup.sql` - Database tables and triggers
- `supabase/functions/send-notification/index.ts` - Edge Function to send notifications

### 3. **Dependencies**
- ✅ `expo-notifications` (already installed)
- ✅ `expo-device` (just installed)
- ✅ `expo-constants` (already installed)

---

## Setup Instructions

### Step 1: Run SQL in Supabase

1. Go to your Supabase dashboard: https://widujxpahzlpegzjjpqp.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase_notifications_setup.sql`
4. Click **Run** to execute

This creates:
- `user_push_tokens` table (stores user device tokens)
- `notifications` table (admin inserts here to send notifications)
- Database trigger that auto-sends notifications

### Step 2: Deploy Edge Function

```bash
# Install Supabase CLI if you haven't
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref widujxpahzlpegzjjpqp

# Deploy the Edge Function
supabase functions deploy send-notification
```

### Step 3: Test the App

```bash
# Start your app
bun run start
```

The app will now:
- ✅ Request notification permissions on sign in
- ✅ Save push tokens to Supabase
- ✅ Ready to receive notifications

---

## How to Send Notifications (Admin)

### Option 1: Supabase Dashboard (Easiest)

1. Go to **Table Editor** → `notifications`
2. Click **Insert row**
3. Fill in:
   - `title`: "New Job Match!"
   - `body`: "We found 5 new jobs matching your profile"
   - `target_user_id`: Leave empty for all users, or add specific user ID
   - `data`: `{}` (optional JSON data)
4. Click **Save**

**The notification sends automatically!**

### Option 2: SQL Query

```sql
-- Send to all users
INSERT INTO notifications (title, body) 
VALUES ('Welcome!', 'Thanks for using our app');

-- Send to specific user
INSERT INTO notifications (title, body, target_user_id, data) 
VALUES (
  'Profile Viewed', 
  'A company viewed your profile',
  'user-uuid-here',
  '{"company_id": "123", "action": "view_profile"}'::jsonb
);
```

### Option 3: API Call (from your admin panel)

```typescript
const { data, error } = await supabase
  .from('notifications')
  .insert({
    title: 'New Feature!',
    body: 'Check out our latest update',
    data: { feature: 'premium', link: '/premium' }
  });
```

---

## Notification Data Structure

```typescript
{
  title: string;           // Notification title
  body: string;            // Notification message
  target_user_id?: uuid;   // null = all users, uuid = specific user
  data?: jsonb;            // Custom data (opens specific screen, etc.)
}
```

### Example with Custom Data

```sql
INSERT INTO notifications (title, body, data) 
VALUES (
  'New Job Alert',
  'Software Engineer at Google',
  '{"job_id": "abc123", "screen": "job-details"}'::jsonb
);
```

In your app, handle the data:
```typescript
// In app/_layout.tsx or similar
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  if (data.screen === 'job-details') {
    router.push(`/job-details?id=${data.job_id}`);
  }
});
```

---

## Testing

### Test on Physical Device

1. Run app on your phone: `bun run start`
2. Sign in to your account
3. Grant notification permissions
4. Go to Supabase → Insert a notification
5. You should receive it instantly!

### Test Notification History

```sql
-- View all sent notifications
SELECT * FROM notifications ORDER BY created_at DESC;

-- View notifications sent to specific user
SELECT * FROM notifications 
WHERE target_user_id = 'user-uuid' 
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Notifications not sending?

1. **Check Edge Function logs:**
   ```bash
   supabase functions logs send-notification
   ```

2. **Verify push tokens exist:**
   ```sql
   SELECT * FROM user_push_tokens;
   ```

3. **Check notification was created:**
   ```sql
   SELECT * FROM notifications WHERE sent_at IS NULL;
   ```

### Permission denied?

Make sure you're signed in and the app has notification permissions:
```typescript
import * as Notifications from 'expo-notifications';

const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status);
```

---

## Advanced Features

### Schedule Notifications

```sql
-- Create scheduled notifications table
CREATE TABLE scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  target_user_id uuid,
  scheduled_for timestamp with time zone NOT NULL,
  sent boolean DEFAULT false
);

-- Use pg_cron or similar to send at scheduled time
```

### Notification Categories

```sql
ALTER TABLE notifications ADD COLUMN category text;

-- Send different types
INSERT INTO notifications (title, body, category) 
VALUES ('New Match', 'You matched with a job!', 'job_match');
```

### Track Opens

```sql
ALTER TABLE notifications ADD COLUMN opened_at timestamp;

-- Update when user opens notification
UPDATE notifications 
SET opened_at = now() 
WHERE id = 'notification-id';
```

---

## Next Steps

1. ✅ Run the SQL setup in Supabase
2. ✅ Deploy the Edge Function
3. ✅ Test sending a notification
4. 🎉 Start sending notifications to your users!

---

## Support

- Expo Notifications Docs: https://docs.expo.dev/versions/latest/sdk/notifications/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
