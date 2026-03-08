# Profile Picture Upload Fix

## Problem
Profile pictures were not uploading during onboarding or when updating in the profile page.

## Root Cause
The upload functions were using `FormData` or `Blob` directly, which doesn't work properly with Supabase Storage in React Native. Supabase Storage requires `ArrayBuffer` or `File` objects.

## Solution
Changed all upload functions to convert the blob to `ArrayBuffer` before uploading.

## Changes Made

### 1. AuthContext.tsx - Onboarding Avatar Upload (Line ~380)
**Before:**
```typescript
const blob = await response.blob();
const { error: uploadErr } = await supabase.storage
  .from('profile-pictures')
  .upload(path, blob, { ... });
```

**After:**
```typescript
const blob = await response.blob();
const arrayBuffer = await blob.arrayBuffer();
const { error: uploadErr } = await supabase.storage
  .from('profile-pictures')
  .upload(path, arrayBuffer, { ... });
```

### 2. AuthContext.tsx - uploadAvatar Helper (Line ~520)
**Before:**
```typescript
const blob = await response.blob();
const { error } = await supabase.storage
  .from('profile-pictures')
  .upload(path, blob, { ... });
```

**After:**
```typescript
const blob = await response.blob();
const arrayBuffer = await blob.arrayBuffer();
const { error } = await supabase.storage
  .from('profile-pictures')
  .upload(path, arrayBuffer, { ... });
```

### 3. Profile Page - uploadAvatar (Line ~584)
**Before:**
```typescript
const formData = new FormData();
formData.append('file', {
  uri,
  type: `image/${fileExt}`,
  name: fileName,
} as any);

const { error: uploadError } = await supabase.storage
  .from('profile-pictures')
  .upload(filePath, formData, { ... });
```

**After:**
```typescript
const response = await fetch(uri);
const blob = await response.blob();
const arrayBuffer = await blob.arrayBuffer();

const { error: uploadError } = await supabase.storage
  .from('profile-pictures')
  .upload(filePath, arrayBuffer, { ... });
```

### 4. AuthContext.tsx - Resume Upload (Line ~400 & ~550)
Applied the same fix to resume uploads for consistency.

## How It Works Now

### Upload Flow:
1. User picks image from gallery or camera
2. Get the local URI (e.g., `file:///path/to/image.jpg`)
3. Fetch the file as a blob: `await fetch(uri).then(r => r.blob())`
4. Convert blob to ArrayBuffer: `await blob.arrayBuffer()`
5. Upload ArrayBuffer to Supabase Storage
6. Store the path (not full URL) in database: `{user_id}/avatar_123456.jpg`
7. Construct full URL when displaying

### Storage Pattern:
- **Path stored in DB**: `abc123/avatar_1234567890.jpg`
- **Full URL for display**: `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/abc123/avatar_1234567890.jpg`

## Testing
1. ✅ Upload profile picture during onboarding
2. ✅ Upload profile picture from profile page
3. ✅ Display profile picture in profile page
4. ✅ Display profile picture in discover page
5. ✅ Display profile picture in friend profile page

## Why ArrayBuffer?
- React Native's `fetch` API returns blobs that need to be converted
- Supabase Storage's JavaScript client expects `ArrayBuffer`, `File`, or `Blob` (but Blob doesn't work reliably in RN)
- ArrayBuffer is the most reliable format for React Native + Supabase Storage
- This is the recommended approach in Supabase docs for React Native

## Additional Notes
- The same fix was applied to resume uploads for consistency
- All uploads now follow the same pattern: URI → Blob → ArrayBuffer → Upload
- Error handling remains the same
- The path storage pattern (not full URL) remains unchanged
