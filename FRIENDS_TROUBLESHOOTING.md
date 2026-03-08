# Friends Feature Troubleshooting Guide

## Issue: Friend blocks not showing in Discover page

### Possible Causes & Solutions:

### 1. **Row Level Security (RLS) Policy Issue** ⚠️ MOST LIKELY
The `profiles` table might have RLS enabled but no policy allowing public reads.

**Solution:**
Run the SQL file `supabase_profiles_public_read.sql` in your Supabase SQL Editor:

```sql
-- Enable public read access to profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);
```

**To check in Supabase:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Check if `profiles` table has a SELECT policy
3. If not, run the SQL above

### 2. **No Profiles in Database**
Check if there are any profiles in the database.

**To verify:**
```sql
SELECT id, name, avatar_url FROM profiles LIMIT 10;
```

### 3. **Check Browser Console**
Open the app and check the browser console for:
- "Fetching all profiles..." message
- "Fetched profiles: X" message
- Any error messages

### 4. **Network Issues**
Check if the Supabase URL is correct in `lib/supabase.ts`:
```typescript
const SUPABASE_URL = 'https://widujxpahzlpegzjjpqp.supabase.co';
```

## Changes Made:

### 1. **Added Fallback Avatar Image**
- Now uses UI Avatars API when `avatar_url` is null/empty
- Generates avatar with user's initials on colored background
- Format: `https://ui-avatars.com/api/?name=John+Doe&background=6366f1&color=fff&size=200`

### 2. **Added Loading & Empty States**
- Shows "Loading friends..." while fetching
- Shows "No friends found" if no profiles exist or search returns empty

### 3. **Added Console Logging**
- Logs when fetching profiles
- Logs number of profiles fetched
- Logs any errors

## Testing Steps:

1. **Open the app and navigate to Discover page**
2. **Check the console for logs:**
   - Should see: "Fetching all profiles..."
   - Should see: "Fetched profiles: X"
3. **If you see errors:**
   - Check RLS policies (most common issue)
   - Verify Supabase connection
4. **If you see "Fetched profiles: 0":**
   - Add some test profiles to the database
5. **If avatars don't load:**
   - Should now show colored avatars with initials as fallback

## Quick Test Profile Creation:

Run this in Supabase SQL Editor to create test profiles:

```sql
INSERT INTO profiles (id, name, headline, location, bio)
VALUES 
  (gen_random_uuid(), 'John Doe', 'Software Engineer', 'San Francisco, CA', 'Passionate about building great products'),
  (gen_random_uuid(), 'Jane Smith', 'Product Manager', 'New York, NY', 'Love solving complex problems'),
  (gen_random_uuid(), 'Mike Johnson', 'UX Designer', 'Austin, TX', 'Design enthusiast and coffee lover');
```

## Expected Behavior:

✅ Friends section appears at top of Discover page
✅ Search bar is visible
✅ Friend blocks show in horizontal scroll
✅ Each block shows avatar (or colored fallback) + name
✅ Clicking a block opens friend profile page
✅ Loading state shows while fetching
✅ Empty state shows if no friends found
