# Profile Data Leak - Permanent Fix

## Issue Description

When a new user signs up and navigates to their profile page, they were seeing data from a previous user including:
- Bio
- Favorite companies
- Veteran status
- Disability status
- Skills and top skills
- Achievements
- Job preferences
- Work mode preferences
- Minimum and maximum salary
- Desired roles
- Cover letter

## Root Cause

The issue was caused by **data caching and improper state management** across user sessions:

1. **AuthContext State Persistence**: The `onboardingData` and `userProfile` states in AuthContext were not being cleared when switching between users
2. **Profile Screen Initialization**: The profile screen was initializing with cached data from `supabaseProfile` or `onboardingData` without verifying it belonged to the current user
3. **AsyncStorage Caching**: Old user data remained in AsyncStorage and was being loaded for new users

## The Fix

### 1. AuthContext Changes (`contexts/AuthContext.tsx`)

#### Clear Data on Sign Up
```typescript
const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
  // Clear any existing user data before signing up
  console.log('[AUTH] Clearing previous user data before signup');
  setUserProfile(null);
  setOnboardingData(defaultOnboardingData);
  setSwipedJobIds([]);
  await AsyncStorage.multiRemove([ONBOARDING_KEY, SWIPED_JOBS_KEY]);
  
  // ... rest of signup logic
  
  // Set fresh onboarding data for new user
  const freshOnboardingData = {
    ...defaultOnboardingData,
    firstName,
    lastName,
  };
  setOnboardingData(freshOnboardingData);
  await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(freshOnboardingData));
}, []);
```

#### Clear Data on Sign In
```typescript
const signInWithEmail = useCallback(async (email: string, password: string) => {
  // Clear any existing user data before signing in
  console.log('[AUTH] Clearing previous user data before signin');
  setUserProfile(null);
  setOnboardingData(defaultOnboardingData);
  setSwipedJobIds([]);
  await AsyncStorage.multiRemove([ONBOARDING_KEY, SWIPED_JOBS_KEY]);
  
  // ... rest of signin logic
}, []);
```

#### Clear Data When Fetching Profile
```typescript
const fetchAndSetProfile = useCallback(async (userId: string, session: Session) => {
  console.log('[AUTH] fetchAndSetProfile for userId:', userId);
  
  // Clear previous user data first to prevent data leakage
  console.log('[AUTH] Clearing previous user data before fetching new profile');
  setUserProfile(null);
  setOnboardingData(defaultOnboardingData);
  setSwipedJobIds([]);
  
  // ... rest of profile fetching logic
}, []);
```

### 2. Profile Screen Changes (`app/(tabs)/profile/index.tsx`)

#### Initialize with Empty State
```typescript
const [user, setUser] = useState<UserProfile>(() => {
  // Always start with empty profile - data will be loaded from supabaseProfile
  return buildProfileFromOnboarding(defaultOnboardingData);
});
```

#### Proper User Data Loading
```typescript
useEffect(() => {
  // Reset user state when supabaseUserId changes (user switch)
  if (!supabaseUserId) {
    console.log('[PROFILE] No supabaseUserId, resetting to default profile');
    setUser(buildProfileFromOnboarding(defaultOnboardingData));
    return;
  }

  // Load profile data for the current authenticated user
  if (supabaseProfile && supabaseProfile.id === supabaseUserId) {
    console.log('[PROFILE] Loading profile for user:', supabaseUserId);
    setUser(prev => ({ ...prev, ...supabaseProfile, favoriteCompanies: supabaseProfile.favoriteCompanies || [] }));
  } else if (supabaseUserId && !supabaseProfile) {
    // User is authenticated but profile hasn't loaded yet, use onboarding data
    console.log('[PROFILE] Using onboarding data for user:', supabaseUserId);
    setUser(buildProfileFromOnboarding(onboardingData));
  }
}, [supabaseProfile, supabaseUserId, onboardingData]);
```

## How It Works

### Sign Up Flow
1. User clicks "Sign Up"
2. **Clear all cached data** (userProfile, onboardingData, swipedJobIds, AsyncStorage)
3. Create new Supabase auth user
4. Create new profile in database with default values
5. Set fresh onboarding data with only firstName and lastName
6. User proceeds to onboarding with clean slate

### Sign In Flow
1. User clicks "Sign In"
2. **Clear all cached data** (userProfile, onboardingData, swipedJobIds, AsyncStorage)
3. Authenticate with Supabase
4. Fetch user's profile from database
5. Load user's actual data into state

### Profile Screen Loading
1. Profile screen initializes with empty default data
2. When `supabaseUserId` is available, check if profile data matches current user
3. Only load profile data if it belongs to the current authenticated user
4. If user changes (logout/login), reset to default state

## Testing Checklist

- [ ] Sign up as User A, complete onboarding with data
- [ ] Sign out
- [ ] Sign up as User B (new account)
- [ ] Verify User B sees NO data from User A
- [ ] Complete onboarding for User B
- [ ] Sign out
- [ ] Sign in as User A
- [ ] Verify User A sees their own data, not User B's
- [ ] Sign out
- [ ] Sign in as User B
- [ ] Verify User B sees their own data, not User A's

## Prevention Measures

1. **Always clear state on authentication changes**: Any time a user signs up, signs in, or their session changes, clear all user-specific state
2. **Verify data ownership**: Always check that loaded data belongs to the current `supabaseUserId`
3. **Initialize with empty state**: Don't pre-populate state with potentially stale data
4. **Clear AsyncStorage**: Remove cached data when switching users
5. **Add logging**: Console logs help track data flow and identify issues

## Related Files

- `contexts/AuthContext.tsx` - Authentication and user state management
- `app/(tabs)/profile/index.tsx` - Profile screen UI and state
- `types/onboarding.ts` - Default onboarding data structure
- `types/index.ts` - UserProfile type definition

## Impact

This fix ensures:
- ✅ New users see only their own data
- ✅ No data leakage between user accounts
- ✅ Proper state management across authentication flows
- ✅ Clean slate for each new user
- ✅ Correct data persistence for returning users
