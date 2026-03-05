# Razorpay Payment Integration Setup Guide

## ✅ What's Already Done

I've implemented the complete Razorpay payment integration for your app:

1. ✅ Installed `react-native-razorpay` package
2. ✅ Created server functions for secure order creation and payment verification
3. ✅ Updated premium.tsx with payment flow
4. ✅ Added loading states and error handling
5. ✅ Created payment utility functions

## 🚀 What YOU Need to Do

### Step 1: Create Razorpay Account

1. Go to [https://razorpay.com](https://razorpay.com)
2. Click "Sign Up" and create a business account
3. Complete the registration process
4. Verify your email and phone number

### Step 2: Get API Credentials

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** → **API Keys**
3. Click **Generate Test Keys** (for testing)
4. You'll get:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (click "Show" to reveal)
5. **IMPORTANT**: Keep the Key Secret secure and never commit it to Git!

### Step 3: Configure Environment Variables

1. Create a `.env` file in your project root:
   ```bash
   cp .env.example .env
   ```

2. Add your Razorpay credentials to `.env`:
   ```
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID
   EXPO_PUBLIC_RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
   ```

3. Make sure `.env` is in your `.gitignore` file

### Step 4: Update Payment Configuration

Open `lib/razorpay.ts` and update:

1. **Line 4**: Replace `'rzp_test_YOUR_KEY_ID'` with your actual Key ID
2. **Line 48**: Replace the logo URL with your app's logo:
   ```typescript
   image: 'https://your-app-logo-url.com/logo.png',
   ```
3. **Line 50**: Change company name if needed (currently "NextQuark")

### Step 5: Update Currency (Optional)

If you want to use Indian Rupees instead of USD:

1. In `app/premium.tsx`, line 42, change:
   ```typescript
   currency: 'INR', // Changed from 'USD'
   ```

2. Update the prices in the UI to show ₹ instead of $

### Step 6: Test the Integration

1. Restart your development server:
   ```bash
   bun run start
   ```

2. Navigate to the Premium screen in your app

3. Select a plan (Pro or Premium)

4. Click the Subscribe button

5. Use Razorpay's test cards:
   - **Card Number**: 4111 1111 1111 1111
   - **CVV**: Any 3 digits
   - **Expiry**: Any future date
   - **Name**: Any name

6. Complete the payment and verify success

### Step 7: Enable Payment Methods

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings** → **Payment Methods**
3. Enable the payment methods you want:
   - ✅ Credit/Debit Cards
   - ✅ UPI
   - ✅ Net Banking
   - ✅ Wallets (Paytm, PhonePe, etc.)

### Step 8: Complete KYC (For Live Payments)

Before accepting real payments, you must complete KYC:

1. Go to **Account & Settings** → **KYC Details**
2. Submit required documents:
   - Business PAN
   - Business proof (GST certificate, etc.)
   - Bank account details
3. Wait for approval (usually 24-48 hours)

### Step 9: Switch to Live Mode

Once KYC is approved:

1. Generate **Live API Keys** from Dashboard
2. Update `.env` with live credentials:
   ```
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
   EXPO_PUBLIC_RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET
   ```
3. Test with small real transactions first

## 🔧 Additional Configuration

### Add User Details to Payment

Update `app/premium.tsx` line 43-45 to include user info:

```typescript
userEmail: user?.email, // Get from your auth context
userPhone: user?.phone,
userName: user?.name,
```

### Store Subscription in Database

After successful payment, update user subscription in your database.

In `app/api/verify-payment+api.ts`, line 23, add:

```typescript
// Update user subscription in Supabase
const { error } = await supabase
  .from('users')
  .update({
    subscription_plan: planType,
    subscription_status: 'active',
    subscription_end_date: calculateEndDate(billingCycle),
  })
  .eq('id', userId);
```

### Handle Webhooks (Recommended)

For production, set up webhooks to handle:
- Payment failures
- Subscription renewals
- Refunds

1. Go to **Settings** → **Webhooks** in Razorpay Dashboard
2. Add your webhook URL: `https://your-domain.com/api/razorpay-webhook`
3. Select events to listen to
4. Create webhook handler in your app

## 📱 Testing on Device

### iOS
```bash
bun run start
# Press 'i' to open iOS Simulator
```

### Android
```bash
bun run start
# Press 'a' to open Android Emulator
```

### Physical Device
1. Download Expo Go app
2. Scan QR code from terminal
3. Test payment flow

## 🐛 Troubleshooting

### "Module not found: react-native-razorpay"
```bash
cd ios && pod install && cd ..
bun run start --clear
```

### "Invalid Key ID"
- Check if you copied the correct Key ID from dashboard
- Make sure there are no extra spaces
- Verify the key starts with `rzp_test_` or `rzp_live_`

### Payment not opening
- Check if you're testing on a real device or simulator
- Verify Razorpay package is properly installed
- Check console for error messages

### "Payment verification failed"
- Ensure Key Secret is correct in `.env`
- Check if server functions are working
- Verify signature generation logic

## 💰 Pricing Information

Current pricing in the app:
- **Pro Monthly**: $20/month
- **Pro Annual**: $225/year (save 25%)
- **Premium Monthly**: $79.99/month
- **Premium Annual**: $799/year (save 25%)

To change prices, update `app/premium.tsx` lines 78-79.

## 📚 Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [React Native Integration](https://razorpay.com/docs/payments/payment-gateway/react-native/)
- [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Webhooks Guide](https://razorpay.com/docs/webhooks/)

## 🔒 Security Best Practices

1. ✅ Never expose Key Secret in frontend code
2. ✅ Always verify payments on server-side
3. ✅ Use HTTPS for all API calls
4. ✅ Implement webhook signature verification
5. ✅ Store sensitive data in environment variables
6. ✅ Add rate limiting to prevent abuse

## 📞 Support

If you face any issues:
1. Check Razorpay Dashboard logs
2. Review console errors in your app
3. Contact Razorpay support: support@razorpay.com
4. Check their [community forum](https://community.razorpay.com/)

---

## Quick Start Checklist

- [ ] Create Razorpay account
- [ ] Get API credentials (Key ID & Secret)
- [ ] Create `.env` file with credentials
- [ ] Update logo URL in `lib/razorpay.ts`
- [ ] Test with test cards
- [ ] Enable payment methods in dashboard
- [ ] Complete KYC for live payments
- [ ] Switch to live keys
- [ ] Test with real small transaction
- [ ] Set up webhooks (optional but recommended)

**You're all set! 🎉**
