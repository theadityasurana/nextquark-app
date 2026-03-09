# Gmail Integration Setup

## ✅ What's Implemented

### Core Features
- **OAuth 2.0 Authentication** - Secure Google Sign-In with token management
- **Inbox Management** - View, search, and filter emails (All, Primary, Promotions, Social, Updates)
- **Email Actions**:
  - ⭐ Star/Unstar emails
  - 🗑️ Delete emails (move to trash)
  - 📦 Archive emails
  - ✉️ Mark as read/unread
  - 📧 Send emails with Reply/Forward
  - 🔍 Search emails
- **Thread View** - Full conversation threads with rich text composer
- **Sent Mail** - View sent emails
- **Push Notifications** - Get notified of new emails (polling every 2 minutes)
- **Token Management** - Automatic token refresh

## 🔧 Setup Instructions

### 1. Google Cloud Console Configuration

You need to configure the OAuth redirect URI in your Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add the following redirect URIs:
   - For development: `https://auth.expo.io/@your-expo-username/hireswipe-v3-clone-ceuofke`
   - For production: Your custom scheme (e.g., `rork-app://`)

### 2. Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click **Enable**

### 3. OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Add the following scopes:
   - `https://www.googleapis.com/auth/gmail.modify`
3. Add test users if in testing mode

### 4. Run the App

```bash
# Install dependencies (already done)
bun install

# Start the development server
bun run start

# For web testing
bun run start-web
```

## 📱 How to Use

### Connect Gmail Account

1. Open the app and navigate to the **Messages** tab
2. Tap **"Connect Gmail Account"**
3. Sign in with your Google account
4. Grant permissions for Gmail access
5. Your inbox will load automatically

### Email Actions

- **Tap** an email to view the full thread
- **Long press** an email to see quick actions (Mark Read/Unread, Archive, Delete)
- **Tap the star icon** to star/unstar
- **Swipe or use sidebar** to switch between Inbox, Starred, Sent, Archived

### Compose & Reply

1. Open any email thread
2. Tap **Reply** or **Forward** at the bottom
3. Use the rich text editor (Bold, Italic, Underline, Font size)
4. Add Cc/Bcc if needed
5. Tap **Send**

### Notifications

- Notifications check for new emails every 2 minutes
- Tap a notification to open the email directly
- Notifications show: Sender name, Subject, and email preview

## 🔐 Security Notes

- OAuth tokens are stored securely in AsyncStorage
- Tokens are automatically refreshed when expired
- Client secret is included (for development only - move to backend for production)

## 🚀 Production Deployment

For production, you should:

1. **Move OAuth to Backend**: Don't expose client secret in the app
2. **Use Gmail Push API**: Replace polling with real-time webhooks
3. **Secure Token Storage**: Use Expo SecureStore or native keychain
4. **Add Error Handling**: Better error messages and retry logic
5. **Optimize Performance**: Implement pagination and caching

## 📝 API Credentials

Configure your OAuth credentials in `.env` file:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-client-secret
```

⚠️ **Important**: Never commit credentials to version control. Use environment variables.

## 🐛 Troubleshooting

### "Unable to load emails" Error
- Check if your OAuth token is valid
- Try disconnecting and reconnecting Gmail
- Verify Gmail API is enabled in Google Cloud Console

### Notifications Not Working
- Grant notification permissions when prompted
- Check if the app is running in the background
- Verify notification settings in device settings

### OAuth Redirect Issues
- Ensure redirect URI matches exactly in Google Cloud Console
- For Expo Go, use the Expo auth proxy URI
- For standalone builds, use your custom scheme

## 📚 Files Modified/Created

- `lib/gmailAuth.ts` - OAuth authentication and token management
- `lib/gmail.ts` - Gmail API functions (updated with new features)
- `lib/gmailNotifications.ts` - Push notification handling
- `app/(tabs)/messages/index.tsx` - Messages screen (updated)
- `app/chat.tsx` - Thread view (updated)
- `app.json` - Added notification plugin

## 🎯 Next Steps

To enhance the integration further:

1. Add attachment support (upload/download)
2. Implement draft saving
3. Add email labels/categories management
4. Support multiple Gmail accounts
5. Add offline mode with local caching
6. Implement email search with filters
7. Add signature support
8. Support HTML email composition
