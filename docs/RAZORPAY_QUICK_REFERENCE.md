# Razorpay Quick Reference

## 🧪 Test Credentials

### Test Cards (Always Successful)
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25 (any future date)
Name: Test User
```

### Test Cards (Different Scenarios)

**Successful Payment:**
- 4111 1111 1111 1111
- 5555 5555 5555 4444 (Mastercard)

**Failed Payment:**
- 4000 0000 0000 0002

**Requires Authentication:**
- 4000 0027 6000 3184

### Test UPI IDs
```
success@razorpay
failure@razorpay
```

### Test Wallets
All test wallets will show success in test mode.

## 💰 Current Pricing

```javascript
// Monthly Plans
Pro: $20/month
Premium: $79.99/month

// Annual Plans (25% discount)
Pro: $225/year (saves $15)
Premium: $799/year (saves $160.88)
```

## 🔑 Environment Variables

```bash
# Test Mode
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXX
EXPO_PUBLIC_RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX

# Live Mode
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXX
EXPO_PUBLIC_RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

## 📱 Payment Flow

1. User selects plan (Pro/Premium)
2. User selects billing cycle (Monthly/Annual)
3. User clicks "Subscribe" button
4. App creates order on server → `/api/create-order`
5. Razorpay payment sheet opens
6. User completes payment
7. App verifies payment → `/api/verify-payment`
8. Success/failure alert shown
9. User subscription updated in database

## 🔧 Key Files

```
app/premium.tsx              → Premium screen with payment UI
lib/razorpay.ts             → Payment utility functions
app/api/create-order+api.ts → Server function to create orders
app/api/verify-payment+api.ts → Server function to verify payments
```

## 🎯 Quick Commands

```bash
# Install dependencies
bun install

# Start development server
bun run start

# Start web preview
bun run start-web

# Clear cache and restart
bun run start --clear

# Build for iOS (requires EAS)
eas build --profile development --platform ios

# Build for Android (requires EAS)
eas build --profile development --platform android
```

## 🐛 Common Issues & Fixes

### Issue: "Module not found: react-native-razorpay"
```bash
bun install
bun run start --clear
```

### Issue: Payment not opening on iOS
- You need a Custom Development Build (Expo Go doesn't support it)
- Run: `eas build --profile development --platform ios`

### Issue: "Invalid Key ID"
- Check `.env` file exists
- Verify Key ID starts with `rzp_test_` or `rzp_live_`
- Restart dev server after changing `.env`

### Issue: Payment verification failed
- Check Key Secret is correct
- Ensure server functions are working
- Check network connectivity

## 📊 Testing Checklist

- [ ] Test Pro Monthly payment
- [ ] Test Pro Annual payment
- [ ] Test Premium Monthly payment
- [ ] Test Premium Annual payment
- [ ] Test payment cancellation
- [ ] Test payment failure scenario
- [ ] Test with different payment methods (Card, UPI, Wallet)
- [ ] Verify success alert shows
- [ ] Verify failure alert shows
- [ ] Check payment appears in Razorpay dashboard

## 🌐 Important URLs

- **Dashboard**: https://dashboard.razorpay.com
- **API Keys**: https://dashboard.razorpay.com/app/keys
- **Payments**: https://dashboard.razorpay.com/app/payments
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/
- **Documentation**: https://razorpay.com/docs/

## 💡 Pro Tips

1. Always test in Test Mode first
2. Use webhooks for production reliability
3. Store subscription status in your database
4. Implement retry logic for failed payments
5. Show clear error messages to users
6. Log all payment attempts for debugging
7. Set up email notifications for successful payments

## 🔐 Security Reminders

- ✅ Never commit `.env` file to Git
- ✅ Never expose Key Secret in frontend
- ✅ Always verify payments on server-side
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Validate all inputs

## 📞 Support Contacts

- **Razorpay Support**: support@razorpay.com
- **Phone**: 1800-102-0480 (India)
- **Community**: https://community.razorpay.com/
