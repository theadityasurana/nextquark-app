# Website & Company Size Fix

## Issues Found

### 1. Company Size Not Displaying
**Problem**: The company size card was in the code but `job.companySize` was undefined.

**Root Cause**: The `fetchJobById()` function (used in job details page) was NOT enriching the job with company data from the companies table. It was only fetching from the jobs table.

### 2. Website Not Opening
**Problem**: "Could not open website" error in console.

**Root Causes**:
1. Same as above - `fetchJobById()` wasn't fetching the website from companies table
2. URLs in database might not have protocol (http:// or https://)

---

## Fixes Applied

### Fix 1: Updated `fetchJobById()` in `lib/jobs.ts`

**Before**:
```typescript
export async function fetchJobById(jobId: string): Promise<Job | null> {
  // ... fetch job from jobs table
  return mapSupabaseJobToJob(data as SupabaseJob);
}
```

**After**:
```typescript
export async function fetchJobById(jobId: string): Promise<Job | null> {
  // ... fetch job from jobs table
  const job = mapSupabaseJobToJob(data as SupabaseJob);
  
  // Enrich with company data
  const { data: company } = await supabase
    .from('companies')
    .select('industry, size, company_type, description, website')
    .ilike('name', job.companyName)
    .single();
  
  if (company) {
    if (company.industry) job.industry = company.industry;
    if (company.size) job.companySize = company.size;
    if (company.company_type) job.companyType = company.company_type;
    if (company.description) job.companyDescription = company.description;
    if (company.website) job.companyWebsite = company.website;
  }
  
  return job;
}
```

**What it does**: Now when viewing job details, the function fetches company data and enriches the job object with:
- industry
- size (for company size card)
- company_type
- description (for About the Company section)
- website (for Visit Company Website button)

### Fix 2: Added URL Validation in `app/job-details.tsx`

**Before**:
```typescript
onPress={() => Linking.openURL(job.companyWebsite!).catch(() => console.log('Could not open website'))}
```

**After**:
```typescript
onPress={() => {
  console.log('Opening website:', job.companyWebsite);
  const url = job.companyWebsite!;
  // Ensure URL has protocol
  const formattedUrl = url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;
  console.log('Formatted URL:', formattedUrl);
  Linking.openURL(formattedUrl).catch((err) => {
    console.log('Could not open website:', err);
    Alert.alert('Error', 'Could not open website. Please check the URL.');
  });
}}
```

**What it does**:
1. Logs the original URL for debugging
2. Checks if URL has protocol (http:// or https://)
3. If not, adds `https://` prefix
4. Logs the formatted URL
5. Shows user-friendly error alert if opening fails
6. Logs detailed error for debugging

---

## Expected Behavior Now

### Company Size Card
- ✅ Should display below the info cards (Type, Level, Applicants)
- ✅ Shows: "{size} employees" (e.g., "100-500 employees")
- ✅ Green themed card with Building2 icon
- ✅ Only appears if company has size data in companies table

### Visit Company Website Button
- ✅ Should display at the bottom of the page
- ✅ Opens company website in browser
- ✅ Automatically adds https:// if missing
- ✅ Shows error alert if URL is invalid
- ✅ Only appears if company has website in companies table

---

## Testing

### To test Company Size:
1. Open any job details page
2. Look below the 3 info cards (Type, Level, Applicants)
3. Should see green card with "Company Size" and employee count
4. Check console logs: `Fetching job by ID: {id}`

### To test Website:
1. Open any job details page
2. Scroll to bottom
3. Look for "Visit Company Website" button (blue background)
4. Click it
5. Check console logs:
   - `Opening website: {url}`
   - `Formatted URL: {url with protocol}`
6. Browser should open with company website

### Debug Console Logs:
```
Fetching job by ID: abc123
Opening website: example.com
Formatted URL: https://example.com
```

---

## Database Requirements

Make sure the `companies` table has:
- `name` column (for matching with jobs.company_name)
- `size` column (e.g., "100-500", "1000+", "50-100")
- `website` column (e.g., "example.com" or "https://example.com")

Both can be with or without protocol - the code will handle it.

---

## Summary

✅ **fetchJobById** now enriches jobs with company data (same as fetchJobsFromSupabase)
✅ **Company Size** will display in job details page
✅ **Website button** will work and handle URLs without protocol
✅ **Better error handling** with console logs and user alerts
