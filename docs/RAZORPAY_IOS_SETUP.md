# iOS Configuration for Razorpay

Since you're using Expo, the `react-native-razorpay` package requires a **Custom Development Build** to work on iOS.

## Option 1: Use Expo Development Build (Recommended)

### Step 1: Install EAS CLI
```bash
bun i -g @expo/eas-cli
```

### Step 2: Configure EAS
```bash
eas build:configure
```

### Step 3: Create Development Build
```bash
# For iOS
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android
```

### Step 4: Install and Run
1. Download the build from EAS dashboard
2. Install on your device
3. Run: `bun start --dev-client`

## Option 2: Use Expo Prebuild (Local Development)

If you have Xcode installed:

```bash
# Generate native iOS project
bunx expo prebuild

# Install iOS dependencies
cd ios && pod install && cd ..

# Run on iOS
bun run start -- --ios
```

## Why Custom Build is Needed?

Razorpay uses native iOS modules that aren't available in Expo Go:
- Native payment UI
- Secure payment processing
- Biometric authentication support

## Alternative: Web-Based Payment (No Custom Build Needed)

If you want to avoid custom builds, you can use web-based Razorpay:

1. Open payment in WebView
2. User completes payment on web
3. Redirect back to app

Let me know if you want me to implement this alternative approach!

## Testing Without Custom Build

For quick testing during development:
1. Use the web version: `bun run start-web`
2. Test payment flow in browser
3. Build custom development build for mobile testing

## Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Razorpay React Native Docs](https://razorpay.com/docs/payments/payment-gateway/react-native/)
