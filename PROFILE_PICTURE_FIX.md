# Profile Picture Fix

## Problem
Profile pictures were not displaying because the app was saving local file paths (like `file:///data/user/0/...`) to Supabase instead of uploading the actual images to cloud storage.

## Solution
Updated the profile screen to properly upload images to Supabase Storage and save the public URL instead of the local file path.

## Setup Steps

### 1. Create Supabase Storage Bucket
Run the SQL script in your Supabase SQL Editor:
```bash
# File: supabase_profile_pictures_storage.sql
```

This will:
- Create a public storage bucket called `profile-pictures`
- Set up RLS policies so users can upload/update/delete their own pictures
- Allow anyone to view profile pictures

### 2. Test the Fix

1. Open the app and go to Profile
2. Tap on your profile picture
3. Tap "Choose from Gallery"
4. Select an image
5. The image will be uploaded to Supabase Storage
6. The public URL will be saved to your profile
7. The image should now display properly!

## What Changed

### Before:
- Picked image → Saved local path → Path stored in database → Image not visible

### After:
- Picked image → Upload to Supabase Storage → Get public URL → Save URL to database → Image visible everywhere

## Features Added

1. **Image Upload Button**: New "Choose from Gallery" button in the avatar modal
2. **Upload Progress**: Shows "Uploading..." while the image is being uploaded
3. **Error Handling**: Shows alerts if upload fails
4. **Success Feedback**: Confirms when upload is successful
5. **URL Option**: Still allows entering a direct URL if preferred

## Storage Structure

Images are stored in Supabase Storage at:
```
profile-pictures/
  └── avatars/
      └── {userId}-{timestamp}.{ext}
```

Example: `profile-pictures/avatars/abc123-1234567890.jpg`

## Permissions

The app will request photo library permissions when you first try to upload a picture.
