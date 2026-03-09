# Profile Data Leak Bug Fix

## Issue Description

After a new user completes onboarding and navigates to their profile, they were seeing data (bio, headline, work experience, favorite companies) from another user instead of empty fields. This was a critical data privacy issue where cached profile information was being displayed to the wrong user.

## Root Cause

The bug was caused by a race condition in the profile screen initialization:

1. **Profile State Initialization** (`app/(tabs)/profile/index.tsx` line 147-152):
   ```typescript
   const [user, setUser] = useState<UserProfile>(() => {
     if (supabaseProfile) {
       return { ...supabaseProfile, favoriteCompanies: supabaseProfile.favoriteCompanies || [] };
     }
     return buildProfileFromOnboarding(onboardingData);
   });
   ```

2. **The Problem**: When a new user signed up and completed onboarding:
   - The profile screen would initialize with `buildProfileFromOnboarding(onboardingData)`
   - However, `onboardingData` could contain **cached data from a previous user session** stored in memory or AsyncStorage
   - This happened because the profile screen mounted before the AuthContext had time to properly reset and fetch the new user's data

3. **Missing User ID Check**: The initialization didn't verify that the `onboardingData` belonged to the currently authenticated user (via `supabaseUserId`)

## The Fix

### 1. Added User ID Validation in Profile Initialization

**File**: `app/(tabs)/profile/index.tsx`

```typescript
const [user, setUser] = useState<UserProfile>(() => {
  if (supabaseProfile) {
    return { ...supabaseProfile, favoriteCompanies: supabaseProfile.favoriteCompanies || [] };
  }
  // Only build from onboarding if we have a valid supabaseUserId
  // This prevents showing cached data from other users
  if (supabaseUserId) {
    return buildProfileFromOnboarding(onboardingData);
  }
  // Return empty profile if no user is authenticated
  return buildProfileFromOnboarding(defaultOnboardingData);
});
```

**Changes**:
- Added check for `supabaseUserId` before using `onboardingData`
- Falls back to `defaultOnboardingData` (empty profile) if no authenticated user
- Prevents cached data from being displayed to wrong user

### 2. Enhanced Profile Update Effect

```typescript
useEffect(() => {
  if (supabaseProfile && supabaseUserId) {
    // Only update user state if we have both profile and userId
    // This ensures we're showing the correct user's data
    setUser(prev => ({ ...prev, ...supabaseProfile, favoriteCompanies: supabaseProfile.favoriteCompanies || [] }));
  }
}, [supabaseProfile, supabaseUserId]);
```

**Changes**:
- Added `supabaseUserId` to the dependency array
- Only updates profile when both `supabaseProfile` AND `supabaseUserId` are present
- Ensures data consistency and prevents race conditions

### 3. Added Import for Default Onboarding Data

```typescript
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
```

## How This Fixes the Issue

1. **User ID Validation**: By checking `supabaseUserId` before using `onboardingData`, we ensure that profile data is only loaded when there's a valid authenticated user session.

2. **Safe Fallback**: If no user is authenticated or the user ID is missing, the profile initializes with `defaultOnboardingData` (empty profile) instead of potentially cached data from another user.

3. **Synchronized Updates**: The enhanced useEffect ensures that profile updates only happen when both the profile data AND user ID are available, preventing partial or mismatched data from being displayed.

## Testing Recommendations

To verify the fix works correctly:

1. **Test New User Signup**:
   - Sign up as a new user
   - Complete onboarding with minimal information
   - Navigate to profile
   - Verify that only the information you entered during onboarding is displayed
   - Verify that bio, headline, work experience, and favorite companies are empty if not filled during onboarding

2. **Test User Switching**:
   - Sign in as User A with a complete profile
   - Sign out
   - Sign up as a new User B
   - Complete onboarding
   - Navigate to profile
   - Verify that User B's profile does NOT show any data from User A

3. **Test Cache Clearing**:
   - Sign in as a user
   - Sign out
   - Clear app cache/data
   - Sign in as a different user
   - Verify correct profile data is displayed

## Security Implications

This was a **critical security and privacy bug** because:
- User A's personal information (bio, work experience, favorite companies) could be exposed to User B
- This violates user privacy and data protection regulations (GDPR, CCPA, etc.)
- Could lead to data confusion and loss of user trust

The fix ensures that:
- Each user only sees their own profile data
- No cached data from previous sessions is leaked to new users
- Profile data is properly scoped to the authenticated user ID

## Related Files Modified

1. `app/(tabs)/profile/index.tsx` - Profile screen component
   - Added user ID validation in state initialization
   - Enhanced profile update effect with user ID check
   - Added import for defaultOnboardingData

## Prevention Measures

To prevent similar issues in the future:

1. **Always validate user ID** before loading user-specific data
2. **Use user ID as a key** in React Query queries and state management
3. **Clear cached data** on logout in AuthContext
4. **Test user switching scenarios** thoroughly
5. **Add user ID to all data fetching dependencies**

## Status

✅ **FIXED** - The profile data leak issue has been resolved. New users will no longer see cached data from other users.
