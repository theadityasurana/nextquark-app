# 📊 Notification System - Visual Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR RORK APP                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User Signs In                                            │  │
│  │  ↓                                                        │  │
│  │  AuthContext.tsx automatically calls:                     │  │
│  │  - registerForPushNotifications()                         │  │
│  │  - savePushToken(userId, token)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            ↓
┌───────────────────────────┼──────────────────────────────────────┐
│                      SUPABASE                                     │
│                           ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  user_push_tokens table                                    │ │
│  │  ┌──────────────┬─────────────────────────────────────┐   │ │
│  │  │ user_id      │ push_token                          │   │ │
│  │  ├──────────────┼─────────────────────────────────────┤   │ │
│  │  │ uuid-123     │ ExponentPushToken[xxxxxx]           │   │ │
│  │  │ uuid-456     │ ExponentPushToken[yyyyyy]           │   │ │
│  │  └──────────────┴─────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  notifications table (ADMIN INSERTS HERE)                  │ │
│  │  ┌────────┬───────────┬──────────┬────────────────────┐   │ │
│  │  │ title  │ body      │ user_id  │ data               │   │ │
│  │  ├────────┼───────────┼──────────┼────────────────────┤   │ │
│  │  │ Hello! │ Welcome   │ null     │ {"screen": "/..."}│   │ │
│  │  └────────┴───────────┴──────────┴────────────────────┘   │ │
│  │                    ↓ (trigger fires automatically)         │ │
│  └────────────────────┼──────────────────────────────────────┘ │
│                       ↓                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Edge Function: send-notification                          │ │
│  │  1. Fetches push tokens from user_push_tokens              │ │
│  │  2. Prepares notification payload                          │ │
│  │  3. Sends to Expo Push API                                 │ │
│  │  4. Marks notification as sent                             │ │
│  └────────────────────┬───────────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────────┘
                         ↓
┌────────────────────────┼─────────────────────────────────────────┐
│                  EXPO PUSH API                                    │
│                        ↓                                          │
│  Delivers notification to user's device                          │
└────────────────────────┼─────────────────────────────────────────┘
                         ↓
┌────────────────────────┼─────────────────────────────────────────┐
│                  USER'S PHONE                                     │
│                        ↓                                          │
│  📱 Notification appears!                                        │
│  User taps → app/_layout.tsx handles navigation                 │
└───────────────────────────────────────────────────────────────────┘
```

## Admin Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN WANTS TO SEND NOTIFICATION                            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Option 1: Supabase Dashboard                                │
│  ─────────────────────────────────────────────────────────  │
│  1. Go to Table Editor → notifications                       │
│  2. Click "Insert row"                                       │
│  3. Fill in title, body, (optional: target_user_id, data)   │
│  4. Click Save                                               │
│  ✅ DONE! Notification sends automatically                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Option 2: SQL Query                                         │
│  ─────────────────────────────────────────────────────────  │
│  INSERT INTO notifications (title, body)                     │
│  VALUES ('Hello', 'World');                                  │
│  ✅ DONE! Notification sends automatically                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Option 3: API Call (from admin panel)                       │
│  ─────────────────────────────────────────────────────────  │
│  await supabase.from('notifications').insert({               │
│    title: 'Hello',                                           │
│    body: 'World'                                             │
│  });                                                         │
│  ✅ DONE! Notification sends automatically                   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Example

```
ADMIN ACTION:
┌──────────────────────────────────────────────────────────┐
│ INSERT INTO notifications (title, body, data)            │
│ VALUES (                                                 │
│   'New Job Match',                                       │
│   'Software Engineer at Google',                        │
│   '{"job_id": "123", "screen": "/job-details"}'::jsonb │
│ );                                                       │
└──────────────────────────────────────────────────────────┘
                    ↓
DATABASE TRIGGER FIRES (automatic)
                    ↓
EDGE FUNCTION EXECUTES (automatic)
                    ↓
FETCHES PUSH TOKENS:
┌──────────────────────────────────────────────────────────┐
│ SELECT push_token FROM user_push_tokens                 │
│ Result: [                                                │
│   "ExponentPushToken[xxxxxx]",                          │
│   "ExponentPushToken[yyyyyy]"                           │
│ ]                                                        │
└──────────────────────────────────────────────────────────┘
                    ↓
SENDS TO EXPO:
┌──────────────────────────────────────────────────────────┐
│ POST https://exp.host/--/api/v2/push/send               │
│ Body: [                                                  │
│   {                                                      │
│     to: "ExponentPushToken[xxxxxx]",                    │
│     title: "New Job Match",                             │
│     body: "Software Engineer at Google",                │
│     data: { job_id: "123", screen: "/job-details" }    │
│   }                                                      │
│ ]                                                        │
└──────────────────────────────────────────────────────────┘
                    ↓
USER RECEIVES NOTIFICATION:
┌──────────────────────────────────────────────────────────┐
│  📱 iPhone/Android                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🔔 New Job Match                                   │ │
│  │ Software Engineer at Google                        │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                    ↓
USER TAPS NOTIFICATION:
┌──────────────────────────────────────────────────────────┐
│ app/_layout.tsx handles tap:                            │
│ - Reads data.job_id = "123"                             │
│ - Reads data.screen = "/job-details"                    │
│ - Navigates to: /job-details?id=123                     │
│ ✅ User sees job details screen                         │
└──────────────────────────────────────────────────────────┘
```

## Setup Checklist

```
□ Step 1: Run supabase_notifications_setup.sql in Supabase
   └─ Creates tables and triggers

□ Step 2: Deploy Edge Function
   └─ supabase functions deploy send-notification

□ Step 3: Test on physical device
   └─ Run app, sign in, grant permissions

□ Step 4: Send test notification
   └─ Insert row in notifications table

✅ DONE! System is live
```

## Key Points

✅ **Automatic** - No manual triggering needed
✅ **Simple** - Just insert a row in the table
✅ **Flexible** - Send to all users or specific users
✅ **Rich** - Include custom data for navigation
✅ **Tracked** - All notifications logged in database

## That's It!

The system is fully automated. Admin just needs to insert rows in the `notifications` table, and everything else happens automatically! 🚀
