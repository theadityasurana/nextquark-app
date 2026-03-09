# Razorpay Payment Flow - Visual Guide

## 🎨 Complete Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

1. User opens app
   │
   ├─→ Navigates to Premium screen (app/premium.tsx)
   │
   ├─→ Sees 3 plans: Free, Pro, Premium
   │
   ├─→ Selects plan (Pro or Premium)
   │
   ├─→ Toggles Monthly/Annual billing
   │
   └─→ Clicks "Subscribe" button


2. Payment Initiation
   │
   ├─→ App calls initiatePayment() from lib/razorpay.ts
   │
   ├─→ Shows loading spinner
   │
   └─→ Sends request to server


3. Server Creates Order
   │
   ├─→ POST /api/create-order
   │   ├─ Amount: $20, $225, $79.99, or $799
   │   ├─ Plan: pro or premium
   │   └─ Billing: monthly or annual
   │
   ├─→ Server calls Razorpay API
   │   └─ Uses Key ID + Key Secret (from .env)
   │
   └─→ Razorpay returns order_id


4. Payment Sheet Opens
   │
   ├─→ Native Razorpay UI appears IN-APP
   │
   ├─→ User sees payment options:
   │   ├─ Credit/Debit Card
   │   ├─ UPI
   │   ├─ Net Banking
   │   └─ Wallets
   │
   └─→ User enters payment details


5. Payment Processing
   │
   ├─→ Razorpay processes payment
   │
   ├─→ User completes authentication (if needed)
   │
   └─→ Payment succeeds or fails


6. Payment Verification
   │
   ├─→ App receives payment response
   │   ├─ razorpay_payment_id
   │   ├─ razorpay_order_id
   │   └─ razorpay_signature
   │
   ├─→ App calls POST /api/verify-payment
   │
   ├─→ Server verifies signature
   │   └─ Uses HMAC SHA256 with Key Secret
   │
   └─→ Returns success or failure


7. Update Subscription
   │
   ├─→ If verified: Update database
   │   ├─ User subscription_plan = "pro" or "premium"
   │   ├─ subscription_status = "active"
   │   └─ subscription_end_date = calculated date
   │
   └─→ Show success alert to user


8. User Feedback
   │
   ├─→ Success: "Payment Successful! 🎉"
   │   └─ Navigate back to app
   │
   └─→ Failure: "Payment Failed"
       └─ Show error message
```

## 🔐 Security Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │         │    Server    │         │  Razorpay    │
│  (Your App)  │         │  (API Route) │         │   (Cloud)    │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │  1. Create Order       │                        │
       ├───────────────────────>│                        │
       │                        │  2. Create Order       │
       │                        ├───────────────────────>│
       │                        │  (with Key Secret)     │
       │                        │                        │
       │                        │  3. Order Created      │
       │  4. Order ID           │<───────────────────────┤
       │<───────────────────────┤                        │
       │                        │                        │
       │  5. Open Payment UI    │                        │
       ├────────────────────────┼───────────────────────>│
       │                        │                        │
       │  6. User Pays          │                        │
       ├────────────────────────┼───────────────────────>│
       │                        │                        │
       │  7. Payment Response   │                        │
       │<───────────────────────┼────────────────────────┤
       │  (payment_id,          │                        │
       │   order_id,            │                        │
       │   signature)           │                        │
       │                        │                        │
       │  8. Verify Payment     │                        │
       ├───────────────────────>│                        │
       │                        │  9. Verify Signature   │
       │                        │  (with Key Secret)     │
       │                        │                        │
       │  10. Verified ✓        │                        │
       │<───────────────────────┤                        │
       │                        │                        │
```

## 📁 File Structure

```
rork/
│
├── app/
│   ├── premium.tsx                    ← UI with payment button
│   │
│   └── api/
│       ├── create-order+api.ts        ← Creates Razorpay order
│       └── verify-payment+api.ts      ← Verifies payment
│
├── lib/
│   └── razorpay.ts                    ← Payment utility functions
│
├── .env                               ← Your API credentials (create this!)
├── .env.example                       ← Template for .env
│
└── Documentation/
    ├── RAZORPAY_SETUP.md              ← Complete setup guide
    ├── RAZORPAY_IOS_SETUP.md          ← iOS configuration
    ├── RAZORPAY_QUICK_REFERENCE.md    ← Test credentials
    ├── RAZORPAY_IMPLEMENTATION.md     ← This summary
    └── RAZORPAY_FLOW.md               ← This file
```

## 💳 Payment Methods Flow

```
┌─────────────────────────────────────────────────────────┐
│              Razorpay Payment Sheet                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  💳 Cards                                                │
│     ├─ Credit Card                                       │
│     └─ Debit Card                                        │
│                                                          │
│  📱 UPI                                                  │
│     ├─ Google Pay                                        │
│     ├─ PhonePe                                           │
│     ├─ Paytm                                             │
│     └─ Any UPI app                                       │
│                                                          │
│  🏦 Net Banking                                          │
│     ├─ SBI                                               │
│     ├─ HDFC                                              │
│     ├─ ICICI                                             │
│     └─ 50+ other banks                                   │
│                                                          │
│  👛 Wallets                                              │
│     ├─ Paytm                                             │
│     ├─ PhonePe                                           │
│     ├─ Amazon Pay                                        │
│     └─ More...                                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Test vs Live Mode

```
┌─────────────────────────────────────────────────────────┐
│                      TEST MODE                           │
├─────────────────────────────────────────────────────────┤
│  Key ID:  rzp_test_XXXXXXXXXXXXX                        │
│  Secret:  test_secret_XXXXXXXXXX                        │
│                                                          │
│  ✓ No real money charged                                │
│  ✓ Use test cards                                       │
│  ✓ Instant approval                                     │
│  ✓ No KYC needed                                        │
│  ✓ Visible in test dashboard                            │
└─────────────────────────────────────────────────────────┘

                         ↓
                  (After KYC)
                         ↓

┌─────────────────────────────────────────────────────────┐
│                      LIVE MODE                           │
├─────────────────────────────────────────────────────────┤
│  Key ID:  rzp_live_XXXXXXXXXXXXX                        │
│  Secret:  live_secret_XXXXXXXXXX                        │
│                                                          │
│  ⚠️  Real money charged                                 │
│  ⚠️  Use real cards                                     │
│  ⚠️  Real bank processing                               │
│  ✓ KYC required                                         │
│  ✓ Visible in live dashboard                            │
└─────────────────────────────────────────────────────────┘
```

## 🔄 State Management

```
Premium Screen States:

┌─────────────────┐
│  Initial State  │
│  isProcessing:  │
│  false          │
└────────┬────────┘
         │
         │ User clicks Subscribe
         ↓
┌─────────────────┐
│  Loading State  │
│  isProcessing:  │
│  true           │
│  (Shows spinner)│
└────────┬────────┘
         │
         │ Payment completes
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
┌────────┐ ┌────────┐
│Success │ │Failure │
│State   │ │State   │
│        │ │        │
│Show ✓  │ │Show ✗  │
│Alert   │ │Alert   │
└────────┘ └────────┘
```

## 📊 Pricing Structure

```
┌─────────────────────────────────────────────────────────┐
│                    PRICING PLANS                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FREE                                                    │
│  ├─ $0                                                   │
│  ├─ 40 applications/week                                │
│  └─ Basic features                                      │
│                                                          │
│  PRO ⭐ (Popular)                                        │
│  ├─ Monthly: $20/month                                  │
│  ├─ Annual:  $225/year (save $15)                       │
│  ├─ 100 applications/month                              │
│  └─ AI auto-fill + Priority support                     │
│                                                          │
│  PREMIUM 👑 (Best Value)                                │
│  ├─ Monthly: $79.99/month                               │
│  ├─ Annual:  $799/year (save $160.88)                   │
│  ├─ 500 applications/month                              │
│  └─ All features + Profile boost                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎬 Quick Start Visual

```
Step 1: Create Account
   ↓
Step 2: Get API Keys
   ↓
Step 3: Create .env file
   ↓
Step 4: Update lib/razorpay.ts
   ↓
Step 5: Test with test card
   ↓
Step 6: Complete KYC
   ↓
Step 7: Switch to live keys
   ↓
Step 8: Launch! 🚀
```

## 🛠️ Troubleshooting Decision Tree

```
Payment not working?
│
├─ Is .env file created?
│  ├─ No → Create .env with credentials
│  └─ Yes → Continue
│
├─ Are credentials correct?
│  ├─ No → Check Razorpay dashboard
│  └─ Yes → Continue
│
├─ Is it iOS?
│  ├─ Yes → Need Custom Development Build
│  └─ No → Continue
│
├─ Check console for errors
│  ├─ "Invalid Key" → Check credentials
│  ├─ "Network error" → Check internet
│  └─ Other → Check logs
│
└─ Still not working?
   └─ Contact Razorpay support
```

---

**This visual guide complements the other documentation files.**
**Start with RAZORPAY_SETUP.md for step-by-step instructions!**
