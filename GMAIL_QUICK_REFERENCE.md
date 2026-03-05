# Gmail Integration - Quick Reference

## 🎯 What Was Implemented

### New Files Created:
1. **`lib/gmailAuth.ts`** - OAuth 2.0 authentication & token management
2. **`lib/gmailNotifications.ts`** - Push notification handling
3. **`GMAIL_INTEGRATION.md`** - Complete documentation
4. **`setup-gmail.sh`** - Setup guide script

### Files Modified:
1. **`lib/gmail.ts`** - Added delete, archive, star, mark read, sent mail functions
2. **`app/(tabs)/messages/index.tsx`** - Added OAuth flow, email actions, notifications
3. **`app/chat.tsx`** - Updated to use real OAuth tokens
4. **`app.json`** - Added notification plugin & permissions
5. **`package.json`** - Added dependencies (auto-installed)

## 🔑 Key Features

### Authentication
```typescript
// Connect Gmail
const { request, response, promptAsync } = useGmailAuth();
await promptAsync();

// Get valid token (auto-refreshes)
const token = await getValidAccessToken();

// Disconnect
await revokeGmailAccess();
```

### Email Operations
```typescript
// Fetch inbox
const emails = await fetchGmailMessages(token, 30);

// Fetch sent mail
const sent = await fetchSentMessages(token, 30);

// Delete email
await deleteGmailMessage(token, messageId);

// Archive email
await archiveGmailMessage(token, messageId);

// Star/unstar
await starGmailMessage(token, messageId, true);

// Mark read/unread
await markAsRead(token, messageId, true);

// Send email
await sendGmailMessage(token, to, subject, body, threadId);
```

### Notifications
```typescript
// Register for notifications
await registerForPushNotifications();

// Check for new emails (called every 2 min)
await checkForNewEmails();

// Handle notification taps
setupNotificationListener((threadId, messageId) => {
  router.push({ pathname: '/chat', params: { threadId, messageId } });
});
```

## 📱 User Flow

1. **Connect Account**
   - User taps "Connect Gmail Account"
   - OAuth flow opens in browser
   - User signs in and grants permissions
   - Token stored securely
   - Inbox loads automatically

2. **View Emails**
   - Inbox shows all emails
   - Filter by: All, Primary, Promotions, Social, Updates
   - Search emails
   - Switch views: Inbox, Starred, Sent, Archived

3. **Email Actions**
   - Tap: Open thread
   - Long press: Quick actions menu
   - Star icon: Toggle star
   - Swipe: (Future enhancement)

4. **Compose/Reply**
   - Tap Reply/Forward
   - Rich text editor
   - Add Cc/Bcc
   - Send email

5. **Notifications**
   - Background polling every 2 minutes
   - Shows: Sender, Subject, Preview
   - Tap: Opens email directly

## 🔧 Configuration Required

### Google Cloud Console:
1. Enable Gmail API
2. Configure OAuth consent screen
3. Add redirect URIs:
   - `https://auth.expo.io/@YOUR_USERNAME/hireswipe-v3-clone-ceuofke`
   - `rork-app://`
   - `http://localhost:8081`

### App Configuration:
- Configure in `.env` file:
  ```
  EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
  EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-client-secret
  ```

## 🚀 Running the App

```bash
# Install dependencies (already done)
bun install

# Start development server
bun run start

# For web
bun run start-web
```

## 🧪 Testing Checklist

- [ ] Connect Gmail account
- [ ] View inbox emails
- [ ] Search emails
- [ ] Filter by category
- [ ] Star/unstar email
- [ ] Delete email
- [ ] Archive email
- [ ] Mark as read/unread
- [ ] Open email thread
- [ ] Reply to email
- [ ] Forward email
- [ ] View sent mail
- [ ] Receive notification (wait 2 min after sending test email)
- [ ] Tap notification to open email
- [ ] Disconnect Gmail

## 🐛 Common Issues

### "Unable to load emails"
- Token expired → Disconnect and reconnect
- Gmail API not enabled → Enable in Google Cloud Console
- Wrong redirect URI → Check Google Cloud Console

### OAuth redirect fails
- Redirect URI mismatch → Must match exactly in Google Cloud Console
- Use `https://auth.expo.io/@YOUR_USERNAME/hireswipe-v3-clone-ceuofke`

### Notifications not working
- Permissions not granted → Check device settings
- App not running → Keep app in background
- Polling interval → Wait up to 2 minutes

## 📊 Architecture

```
User Action
    ↓
Messages Screen (UI)
    ↓
Gmail Auth (OAuth)
    ↓
Gmail API (lib/gmail.ts)
    ↓
Google Gmail API
    ↓
Response → Update UI
    ↓
Notifications (background polling)
```

## 🔐 Security Notes

⚠️ **Current Implementation (Development)**
- Client secret in code (OK for development)
- Tokens in AsyncStorage (OK for development)

✅ **Production Recommendations**
- Move OAuth to backend server
- Use Expo SecureStore for tokens
- Implement proper error handling
- Add rate limiting
- Use Gmail Push API (webhooks) instead of polling

## 📈 Performance

- **Token Management**: Auto-refresh before expiry
- **Caching**: React Query with 2-minute stale time
- **Batch Fetching**: Fetches 10 messages at a time
- **Polling**: Every 2 minutes (configurable)

## 🎨 UI Components

- **Connect Button**: Shows when not authenticated
- **Email List**: Inbox with filters
- **Email Item**: Tap to open, long press for actions
- **Thread View**: Full conversation
- **Compose Modal**: Rich text editor
- **Sidebar**: Navigation (Inbox, Starred, Sent, Archived)
- **Notifications**: Native push notifications

## 📝 Next Steps

To enhance further:
1. Add attachment support
2. Implement draft saving
3. Add swipe gestures
4. Support multiple accounts
5. Add offline mode
6. Implement real-time push (webhooks)
7. Add email signatures
8. Support HTML composition

---

**All done! 🎉**

Run `./setup-gmail.sh` to see the setup guide.
