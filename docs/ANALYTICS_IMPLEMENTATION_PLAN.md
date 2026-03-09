# Analytics Section Implementation Plan

## ✅ Completed Fixes

1. **Friend Profile Header** - Removed "friend-profile" text
2. **Favorite Companies** - Now clickable, opens company-profile page
3. **Premium/Pro Badges** - Pro = Gold (#FFD700), Premium = Purple (#9C27B0)
4. **Search Bars** - Made 50% thinner (paddingVertical: 6 instead of 10)
5. **Favorite Companies Icon** - Added Building2 icon next to header

## 📊 Analytics Section - Implementation Plan

### Location: Between Friends and Favorite Companies sections

### Chart Suggestions with Real Supabase Data:

#### 1. **Top Companies Hiring This Week** 🏢
```typescript
const { data } = await supabase
  .from('jobs')
  .select('company_name')
  .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false });

// Group by company_name and count
const companyCounts = data.reduce((acc, job) => {
  acc[job.company_name] = (acc[job.company_name] || 0) + 1;
  return acc;
}, {});

// Display: Horizontal bar chart showing top 5 companies
```

#### 2. **Most Applied Jobs** 🔥
```typescript
const { data } = await supabase
  .from('jobs')
  .select('job_title, company_name, right_swipe')
  .order('right_swipe', { ascending: false })
  .limit(5);

// Display: Horizontal bar chart with job titles and swipe counts
```

#### 3. **Trending Locations** 📍
```typescript
const { data } = await supabase
  .from('jobs')
  .select('location')
  .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

// Group by location and count
const locationCounts = data.reduce((acc, job) => {
  acc[job.location] = (acc[job.location] || 0) + 1;
  return acc;
}, {});

// Display: Horizontal bar chart showing top 5 locations
```

#### 4. **Hot Skills in Demand** 💡
```typescript
const { data } = await supabase
  .from('jobs')
  .select('skills');

// Flatten skills arrays and count frequency
const skillCounts = data.reduce((acc, job) => {
  job.skills?.forEach(skill => {
    acc[skill] = (acc[skill] || 0) + 1;
  });
  return acc;
}, {});

// Display: Horizontal bar chart showing top 10 skills
```

#### 5. **Remote vs Onsite Distribution** 🏠
```typescript
const { data } = await supabase
  .from('jobs')
  .select('location_type');

// Count by type
const typeCounts = data.reduce((acc, job) => {
  const type = job.location_type || 'onsite';
  acc[type] = (acc[type] || 0) + 1;
  return acc;
}, {});

// Display: Donut chart or horizontal bars
```

#### 6. **Average Salary by Experience Level** 💰
```typescript
const { data } = await supabase
  .from('jobs')
  .select('experience_level, salary_min, salary_max');

// Group by experience level and calculate average
const salaryByLevel = data.reduce((acc, job) => {
  const level = job.experience_level || 'Not specified';
  if (!acc[level]) acc[level] = { total: 0, count: 0 };
  const avg = (job.salary_min + job.salary_max) / 2;
  acc[level].total += avg;
  acc[level].count += 1;
  return acc;
}, {});

// Display: Horizontal bar chart with average salaries
```

#### 7. **Application Success Rate** ✅
```typescript
const { data: totalApps } = await supabase
  .from('live_application_queue')
  .select('status');

// Count by status
const statusCounts = totalApps.reduce((acc, app) => {
  acc[app.status] = (acc[app.status] || 0) + 1;
  return acc;
}, {});

// Display: Horizontal bar showing pending/completed/failed
```

#### 8. **Jobs by Industry** 🏭
```typescript
const { data: jobs } = await supabase
  .from('jobs')
  .select('company_name');

const { data: companies } = await supabase
  .from('companies')
  .select('name, industry');

// Join and count by industry
const industryMap = new Map(companies.map(c => [c.name, c.industry]));
const industryCounts = jobs.reduce((acc, job) => {
  const industry = industryMap.get(job.company_name) || 'Other';
  acc[industry] = (acc[industry] || 0) + 1;
  return acc;
}, {});

// Display: Horizontal bar chart
```

### Recommended Charts to Implement:

**Priority 1 (Most Useful):**
1. Top Companies Hiring This Week
2. Most Applied Jobs
3. Hot Skills in Demand

**Priority 2 (Good to Have):**
4. Trending Locations
5. Remote vs Onsite Distribution
6. Average Salary by Experience Level

**Priority 3 (Nice to Have):**
7. Application Success Rate
8. Jobs by Industry

### UI Design:

```typescript
<View style={styles.analyticsSection}>
  <View style={styles.analyticsHeader}>
    <TrendingUp size={20} color={Colors.secondary} />
    <Text style={styles.analyticsSectionTitle}>Insights</Text>
  </View>
  
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.analyticsRow}>
    {/* Chart 1 */}
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsCardTitle}>Top Companies Hiring</Text>
      <Text style={styles.analyticsCardSubtitle}>This Week</Text>
      {/* Bar chart here */}
    </View>
    
    {/* Chart 2 */}
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsCardTitle}>Most Applied Jobs</Text>
      <Text style={styles.analyticsCardSubtitle}>All Time</Text>
      {/* Bar chart here */}
    </View>
    
    {/* Chart 3 */}
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsCardTitle}>Hot Skills</Text>
      <Text style={styles.analyticsCardSubtitle}>In Demand</Text>
      {/* Bar chart here */}
    </View>
  </ScrollView>
</View>
```

### Styling:

```typescript
analyticsSection: { marginBottom: 24, paddingLeft: 20 },
analyticsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingRight: 20 },
analyticsSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary },
analyticsRow: { gap: 12, paddingRight: 20 },
analyticsCard: { width: 280, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
analyticsCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.secondary, marginBottom: 4 },
analyticsCardSubtitle: { fontSize: 12, color: Colors.textTertiary, marginBottom: 12 },
```

## 🔧 "users" Table Error Fix

The error is likely from a database trigger or RLS policy. Run this SQL in Supabase:

```sql
-- Check for triggers referencing users table
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'live_application_queue';

-- If found, update trigger to use profiles table instead of users
```

Or create a view:
```sql
CREATE OR REPLACE VIEW users AS SELECT * FROM profiles;
```

This will alias profiles as users for backward compatibility.
