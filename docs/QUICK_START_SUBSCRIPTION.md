# Quick Start - Test Subscription System Now!

## 🚀 5-Minute Setup:

### **Step 1: Run SQL (2 minutes)**
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to SQL Editor
3. Open `supabase_subscription_schema.sql`
4. Copy all content
5. Paste in SQL Editor
6. Click "Run"

### **Step 2: Restart App (1 minute)**
```bash
bun run start --clear
```

### **Step 3: Test Free Subscription (2 minutes)**
1. Open app
2. Go to Profile → "Upgrade to Premium"
3. Select **Pro** plan
4. Enter coupon: **FREE100**
5. Click "Apply"
6. Click "Activate Free Subscription"
7. ✅ Done!

---

## ✅ Verify It Works:

### **Check Profile Page:**
Should show:
```
👑 You are a Pro User
100 applications remaining this month
```

### **Check Home Page:**
Should show:
```
Good morning, [Your Name]
100 applications left this month
```

### **Check Supabase:**
1. Go to Table Editor → profiles
2. Find your user row
3. Should see:
   - subscription_type: "pro"
   - applications_remaining: 100
   - subscription_end_date: (1 month from now)

---

## 🎟️ Test Different Scenarios:

### **Test Premium:**
1. Go back to Premium screen
2. Select **Premium** plan
3. Use coupon **FREE100** again
4. Should show 500 applications

### **Test Paid Flow:**
1. Select a plan WITHOUT coupon
2. Click Subscribe
3. Payment page opens in browser
4. (Don't complete payment in test mode)

### **Test Expiry:**
Manually expire subscription in Supabase:
1. Go to profiles table
2. Set `subscription_end_date` to yesterday
3. Refresh app
4. Should revert to Free plan

---

## 🐛 If Something Doesn't Work:

### **Subscription not showing:**
```bash
# Clear cache and restart
bun run start --clear
```

### **SQL errors:**
- Make sure you're in the correct project
- Check if tables already exist
- Try running each CREATE statement separately

### **Profile not updating:**
- Sign out and sign in again
- Check if user ID is correct
- Verify Supabase connection

---

## 📞 Need Help?

Check these files:
- `SUBSCRIPTION_IMPLEMENTATION.md` - Full details
- `RAZORPAY_SETUP.md` - Payment setup
- `RAZORPAY_QUICK_REFERENCE.md` - Test credentials

---

## 🎉 That's It!

Your subscription system is ready. Test it with **FREE100** coupon and see everything work!

**Next:** Set up real Razorpay payments following `RAZORPAY_SETUP.md`
