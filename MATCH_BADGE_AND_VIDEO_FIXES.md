# Match Badge and Video Background Fixes

## Summary of Changes

This document outlines the fixes implemented for the match badge visibility and video background display issues.

---

## 1. Video Background Fix

### Issue
The loading.mp4 video was using `ResizeMode.CONTAIN`, which maintained aspect ratio but didn't fill the entire background area between the header and bottom tabs.

### Solution
Changed the video resize mode from `CONTAIN` to `COVER` to ensure the video completely fills the background area.

**File Modified:** `app/(tabs)/(home)/index.tsx`

```typescript
// Before
resizeMode={ResizeMode.CONTAIN}

// After
resizeMode={ResizeMode.COVER}
```

**Result:** The video now covers the entire background area between the "416 applications left this month" section and the bottom tab navigation.

---

## 2. Match Badge Visibility Fix

### Issue
The match score badge (e.g., "81% Match") was showing on all job cards regardless of whether the user was in the Discover or For You section.

### Solution
- Added a `showMatchBadge` prop to the `JobCard` component
- Pass `showMatchBadge={feedMode === 'foryou'}` from the home screen
- The badge now only displays when in "For You" mode

**Files Modified:**
- `components/JobCard.tsx`
- `app/(tabs)/(home)/index.tsx`

**Changes in JobCard.tsx:**
```typescript
interface JobCardProps {
  job: Job;
  onViewDetails?: () => void;
  backgroundColor?: string;
  showMatchBadge?: boolean; // New prop
}

export default function JobCard({ job, onViewDetails, backgroundColor, showMatchBadge = true }: JobCardProps) {
  // ...
  <View style={styles.matchAndExp}>
    {showMatchBadge && <MatchScoreBadge score={job.matchScore} />}
  </View>
}
```

**Changes in index.tsx:**
```typescript
<JobCard 
  job={job} 
  onViewDetails={() => router.push({ pathname: '/job-details' as any, params: { id: job.id } })} 
  backgroundColor={cardColor} 
  showMatchBadge={feedMode === 'foryou'} // Conditional based on feed mode
/>
```

**Result:** 
- Match badge is hidden in Discover section
- Match badge is visible in For You section

---

## 3. For You Count Bug Fix

### Issue
The "For You" chip was showing different numbers when switching between Discover and For You sections because it was using `jobs.length`, which changes based on the active filters.

### Solution
Created a separate `forYouCount` calculation that remains constant regardless of which section is active. This count is based solely on the user's desired roles filtering.

**File Modified:** `app/(tabs)/(home)/index.tsx`

```typescript
// New constant calculation
const forYouCount = useMemo(() => {
  let filtered = allJobs;
  if (swipedJobIds.length > 0) {
    const swipedSet = new Set(swipedJobIds);
    filtered = filtered.filter(job => !swipedSet.has(job.id));
  }
  if (userProfile?.desiredRoles && userProfile.desiredRoles.length > 0) {
    filtered = filtered.filter(job => 
      userProfile.desiredRoles!.some(role => {
        const roleLower = role.toLowerCase();
        return job.jobTitle.toLowerCase().includes(roleLower) ||
          job.description.toLowerCase().includes(roleLower) ||
          job.skills.some(skill => skill.toLowerCase().includes(roleLower));
      })
    );
  }
  return filtered.length;
}, [allJobs, swipedJobIds, userProfile]);

// Use forYouCount in the chip
<Text style={[styles.feedToggleBadgeText, { color: feedMode === 'foryou' ? '#000000' : '#FFFFFF' }]}>
  {forYouCount}
</Text>
```

**Result:** The For You chip now displays a consistent count based on desired roles, regardless of which section is currently active.

---

## Testing Checklist

- [x] Video background fills entire area between header and bottom tabs
- [x] Match badge is hidden in Discover section
- [x] Match badge is visible in For You section
- [x] For You count remains constant when switching between sections
- [x] For You count accurately reflects jobs matching desired roles

---

## Technical Details

### Dependencies
- No new dependencies added
- Uses existing `ResizeMode` from `expo-av`
- Uses existing `useMemo` hook for performance optimization

### Performance Impact
- Minimal: Added one additional `useMemo` calculation for `forYouCount`
- The calculation is memoized and only recalculates when dependencies change

### Backward Compatibility
- `showMatchBadge` prop defaults to `true` to maintain existing behavior for other uses of JobCard
- No breaking changes to existing functionality

---

## Files Modified

1. `app/(tabs)/(home)/index.tsx` - Main home screen with job cards
2. `components/JobCard.tsx` - Job card component
3. `app/(tabs)/discover/index.tsx` - No functional changes (already doesn't use JobCard component)

---

## Date
January 2025
