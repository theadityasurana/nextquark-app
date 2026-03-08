# Profile Picture Implementation Guide

## Overview
Profile pictures follow the same pattern as company logos in the app.

## Storage Structure

### Supabase Storage
- **Bucket**: `profile-pictures` (already exists)
- **Path format**: `{user_id}/{filename}` (e.g., `abc123/avatar_1234567890.jpg`)
- **Public URL**: `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/{path}`

### Database
- **Table**: `profiles`
- **Column**: `avatar_url` (stores the path, not full URL)
- Example value: `abc123/avatar_1234567890.jpg`

## Implementation Pattern

### 1. Upload (Already Implemented in Profile Page)
```typescript
// In profile/index.tsx - uploadAvatar function
const filePath = `${supabaseUserId}/${fileName}`;
await supabase.storage.from('profile-pictures').upload(filePath, formData);
await supabase.from('profiles').upsert({ id: supabaseUserId, avatar_url: filePath });
```

### 2. Fetch & Display Pattern

#### Pattern A: Direct from profiles table
```typescript
// Fetch profile with avatar_url
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name, avatar_url')
  .eq('id', userId)
  .single();

// Construct full URL for display
const avatarUrl = profile.avatar_url 
  ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${profile.avatar_url}`
  : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name);
```

#### Pattern B: Using helper function (recommended)
```typescript
// Create helper in lib/profile.ts or similar
export function getProfilePictureUrl(avatarUrl?: string, fallbackName?: string): string {
  if (!avatarUrl) {
    return fallbackName 
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=6366f1&color=fff&size=200`
      : 'https://via.placeholder.com/200';
  }
  
  if (avatarUrl.startsWith('http')) {
    return avatarUrl; // Already full URL
  }
  
  return `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${avatarUrl}`;
}
```

## Current Implementation Status

### ✅ Already Working
1. **Profile Page** (`app/(tabs)/profile/index.tsx`)
   - Upload functionality
   - Display with full URL construction
   - Camera icon overlay for editing

2. **Discover Page** (`app/(tabs)/discover/index.tsx`)
   - Friends section displays profile pictures
   - Full URL construction: Lines 195-196
   - Fallback to UI Avatars

### 🔧 Needs Implementation
None - the pattern is already correctly implemented!

## Key Differences from Company Logos

| Aspect | Company Logos | Profile Pictures |
|--------|---------------|------------------|
| Bucket | `company-logos` | `profile-pictures` |
| Table | `companies` | `profiles` |
| Column | `logo_url` | `avatar_url` |
| Path format | `logos/{company}.png` | `{user_id}/{filename}` |
| Fallback | Placeholder | UI Avatars with name |

## Example Usage

### Display in Friend List
```typescript
const avatarUrl = profile.avatar_url 
  ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${profile.avatar_url}`
  : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=6366f1&color=fff&size=200`;

<Image source={{ uri: avatarUrl }} style={styles.friendAvatar} />
```

### Display in Profile Page
```typescript
// Already implemented correctly
<Image source={{ uri: user.avatar }} style={styles.avatar} />
```

## Testing Checklist
- [x] Upload profile picture from profile page
- [x] Display profile picture in profile page
- [x] Display profile pictures in discover page friends section
- [ ] Display profile pictures in friend profile page
- [ ] Display profile pictures in messages/chat

## Notes
- The implementation already follows best practices
- Profile pictures are stored per user with unique filenames
- Fallback to UI Avatars provides good UX when no picture is uploaded
- The pattern is consistent with company logos
