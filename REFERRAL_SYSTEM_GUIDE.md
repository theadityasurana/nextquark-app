# Referral System Implementation Guide

## Overview
A code-based referral system where users share unique codes (e.g., "ALEX5K2P") to earn bonus swipes. No website required - users manually enter codes during sign-up.

## How It Works

### User Flow
1. **User A** opens Profile → taps "Share & Earn Free Swipes"
2. **Modal opens** showing:
   - Unique referral code (e.g., "JOHN4X7Z")
   - Stats (friends joined, swipes earned)
   - Copy button + Share button
3. **User A** shares code via WhatsApp/SMS/social media
4. **User B** downloads app → enters code during sign-up
5. **System** validates code → awards +5 swipes to both users

### Rewards
- **Referrer (User A)**: +5 swipes per successful referral
- **Referee (User B)**: +5 welcome bonus swipes
- Swipes are added to `applications_remaining` and `applications_limit`

## Files Created/Modified

### New Files
1. **`lib/referral.ts`** - Core referral logic
   - `generateReferralCode()` - Creates unique 8-char codes
   - `createReferralCode()` - Assigns code to user
   - `applyReferralCode()` - Validates and awards swipes
   - `getReferralStats()` - Fetches user's referral data

2. **`supabase_referral_setup.sql`** - Database schema
   - Adds columns to `profiles` table
   - Creates `referrals` tracking table
   - Sets up RLS policies

### Modified Files
1. **`app/(tabs)/profile/index.tsx`**
   - Added referral modal with code display
   - Integrated share functionality
   - Shows referral stats

2. **`app/sign-up.tsx`**
   - Added optional referral code input field
   - Applies code after successful sign-up

## Setup Instructions

### Step 1: Database Setup
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase_referral_setup.sql`
3. Run the SQL script
4. Verify columns exist:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name LIKE 'referral%';
   ```

### Step 2: Test the System

#### Test Scenario 1: Generate Referral Code
1. Open app → Go to Profile
2. Tap "Share & Earn Free Swipes" card
3. Modal should show your unique code (e.g., "ALEX5K2P")
4. Verify in Supabase:
   ```sql
   SELECT id, name, referral_code FROM profiles WHERE referral_code IS NOT NULL;
   ```

#### Test Scenario 2: Use Referral Code
1. Sign out from app
2. Create new account
3. Enter referral code from Test 1
4. Complete sign-up
5. Check both users' swipes increased by 5:
   ```sql
   SELECT name, applications_remaining, referral_swipes_earned 
   FROM profiles WHERE referral_code = 'YOUR_CODE' OR referred_by IS NOT NULL;
   ```

#### Test Scenario 3: View Stats
1. Log in as referrer
2. Go to Profile → Tap "Share & Earn"
3. Should show:
   - Friends Joined: 1
   - Swipes Earned: 5

## Database Schema

### profiles table (new columns)
```sql
referral_code TEXT UNIQUE           -- User's unique code (e.g., "ALEX5K2P")
referral_swipes_earned INTEGER      -- Total swipes earned from referrals
referred_by UUID                    -- ID of user who referred them
```

### referrals table (new)
```sql
id UUID PRIMARY KEY
referrer_id UUID                    -- User who shared the code
referee_id UUID                     -- User who used the code
referral_code TEXT                  -- Code that was used
swipes_awarded INTEGER              -- Swipes given (default: 5)
created_at TIMESTAMP                -- When referral happened
```

## Code Structure

### Referral Code Generation
```typescript
// Format: First 4 letters of name + 4 random chars
// Example: "JOHN" + "4X7Z" = "JOHN4X7Z"
generateReferralCode(name: string): string
```

### Validation Rules
- Code must exist in database
- Cannot use your own code
- Can only use one referral code per account
- Code is case-insensitive (auto-converted to uppercase)

### Share Functionality
Uses React Native's built-in `Share` API:
```typescript
Share.share({
  message: `Join NextQuark with my referral code ${code} and get 5 free swipes!`
});
```

## Troubleshooting

### Issue: Referral code not generating
**Solution**: Check if user has a name in profile. Code uses first 4 letters of name.

### Issue: "Referral code not found"
**Solution**: 
1. Verify code exists: `SELECT * FROM profiles WHERE referral_code = 'CODE';`
2. Check RLS policies are enabled
3. Ensure user is authenticated

### Issue: Swipes not awarded
**Solution**:
1. Check `referrals` table: `SELECT * FROM referrals WHERE referee_id = 'USER_ID';`
2. Verify `applications_remaining` increased in both profiles
3. Check console logs for errors

### Issue: Can't share code
**Solution**: 
- iOS: Ensure app has proper permissions
- Android: Share API should work by default
- Fallback: User can copy code and share manually

## Future Enhancements

### Optional Features (Not Implemented)
1. **Referral Leaderboard** - Show top referrers
2. **Tiered Rewards** - More swipes for more referrals
3. **Expiring Codes** - Codes valid for limited time
4. **Custom Codes** - Let users choose their code
5. **Deep Linking** - Auto-fill code from app link
6. **Referral History** - Show list of referred users
7. **Fraud Prevention** - Limit referrals per IP/device

## API Reference

### `createReferralCode(userId, userName)`
Creates and assigns a unique referral code to user.
- **Returns**: `string | null` - The generated code or null on error

### `applyReferralCode(newUserId, referralCode)`
Validates code and awards swipes to both users.
- **Returns**: `{ success: boolean, message: string }`

### `getReferralStats(userId)`
Fetches user's referral statistics.
- **Returns**: 
  ```typescript
  {
    referralCode: string | null,
    totalSwipesEarned: number,
    totalReferrals: number,
    referrals: Array<Referral>
  }
  ```

## Security Considerations

1. **RLS Policies**: Users can only view their own referrals
2. **Unique Constraint**: Each user can only be referred once
3. **Self-Referral Prevention**: Cannot use your own code
4. **Code Uniqueness**: Codes are unique across all users
5. **Server-Side Validation**: All checks happen in Supabase

## Testing Checklist

- [ ] Database schema created successfully
- [ ] Referral code generates on profile screen
- [ ] Code can be copied to clipboard
- [ ] Share button opens native share sheet
- [ ] Sign-up screen shows referral code field
- [ ] Valid code awards swipes to both users
- [ ] Invalid code shows error message
- [ ] Stats update correctly after referral
- [ ] Cannot use same code twice
- [ ] Cannot use own referral code

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify RLS policies are correct
3. Test with console.log statements
4. Check network requests in browser DevTools
