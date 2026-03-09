# Resume Upload Fix - Quick Reference

## What Changed

I've completely rewritten the resume upload to use **FormData with direct Supabase API calls**, which is the most reliable method for React Native file uploads.

## The New Approach

### Upload Method
```javascript
// 1. Create FormData
const formData = new FormData();
formData.append('file', {
  uri: file.uri,
  type: file.mimeType || 'application/pdf',
  name: fileName,
} as any);

// 2. Get auth token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// 3. Upload directly to Supabase Storage API
const uploadUrl = `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/resumes/${filePath}`;

const response = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});
```

### View Method
- Opens resume in device's default viewer (PDF reader, etc.)
- Uses `Linking.openURL()` with Supabase signed URL
- No in-app modal needed

## Why This Works

1. ✅ FormData is native to React Native
2. ✅ Direct API call bypasses SDK issues
3. ✅ Standard multipart/form-data encoding
4. ✅ Works on both iOS and Android
5. ✅ No complex conversions needed

## Testing

1. Open app → Profile → Resume
2. Tap "Upload New Resume"
3. Select a PDF file
4. Should upload successfully!
5. Tap eye icon to view

## If It Still Fails

Check these:
1. Are you logged in? (Check supabaseUserId)
2. Does the "resumes" bucket exist in Supabase?
3. Are RLS policies set correctly?
4. Is the file under 5MB?
5. Try a simple PDF first

## Supabase Storage Bucket Setup

Make sure you have:
- Bucket name: `resumes`
- Public: No (keep private)
- RLS policies allowing authenticated users to upload/view their own files

The file path structure is: `{userId}/{timestamp}.{extension}`

## No Extra Dependencies

Removed:
- ❌ expo-file-system (not needed)
- ❌ react-native-webview (not needed)

Only using:
- ✅ expo-document-picker (already installed)
- ✅ React Native's built-in fetch and FormData
