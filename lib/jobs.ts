import { supabase } from '@/lib/supabase';
import { Job, UserProfile } from '@/types';

export interface SupabaseJob {
  id: string;
  company_name: string;
  company_logo?: string;
  company_linkedin?: string;
  job_title?: string;
  title?: string;
  location: string;
  location_type?: string;
  posted_date?: string;
  match_score?: number;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  employment_type?: string;
  experience_level?: string;
  experience?: string;
  description?: string;
  company_description?: string;
  detailed_requirements?: string;
  culture_photos?: string[];
  requirements?: string[];
  skills?: string[];
  benefits?: string[];
  applicants_count?: number;
  right_swipe?: number;
  deadline?: string;
  portal?: string;
  portal_url?: string;
  job_url?: string;
  company_website?: string;
  type?: string;
  salary_range?: string;
  created_at?: string;
  education_level?: string;
  work_authorization?: string;
}

export interface SupabaseCompany {
  id: string;
  name: string;
  logo?: string;
  logo_url?: string;
  linkedin?: string;
  website?: string;
  description?: string;
  size?: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  one_liner?: string;
  culture_photos?: string[];
}

function parseSalaryRange(salaryRange?: string): { min: number; max: number; raw: string } {
  if (!salaryRange) return { min: 0, max: 0, raw: '' };

  const parts = salaryRange.split(/\s*-\s*/);
  const parseNum = (s: string): number => {
    const cleaned = s.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  if (parts.length >= 2) {
    const min = parseNum(parts[0]);
    const max = parseNum(parts[1]);
    return { min: Math.min(min, max), max: Math.max(min, max), raw: salaryRange.trim() };
  }
  if (parts.length === 1) {
    const val = parseNum(parts[0]);
    return { min: val, max: val, raw: salaryRange.trim() };
  }
  return { min: 0, max: 0, raw: salaryRange.trim() };
}

function getRelativeDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}

function normalizeLocationType(type?: string): 'remote' | 'onsite' | 'hybrid' {
  if (!type) return 'onsite';
  const lower = type.toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

const SUPABASE_URL = 'https://widujxpahzlpegzjjpqp.supabase.co';

export function getCompanyLogoUrl(companyName: string, logo?: string, logoUrl?: string): string {
  if (logoUrl && logoUrl.startsWith('http')) return logoUrl;
  if (logo && logo.startsWith('http')) return logo;
  if (logoUrl) {
    return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logoUrl}`;
  }
  if (logo) {
    return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logo}`;
  }
  const logoPath = `logos/${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logoPath}`;
  return storageUrl;
}



export function mapSupabaseJobToJob(raw: SupabaseJob): Job {
  const salaryFromRange = parseSalaryRange(raw.salary_range);
  const jobTitle = raw.title || raw.job_title || 'Untitled Position';

  const hasRequirements = Array.isArray(raw.requirements) && raw.requirements.length > 0;
  const hasBenefits = Array.isArray(raw.benefits) && raw.benefits.length > 0;

  return {
    id: raw.id || String(Math.random()),
    companyName: raw.company_name || 'Unknown Company',
    companyLogo: getCompanyLogoUrl(raw.company_name || '', raw.company_logo, undefined),
    companyLinkedIn: raw.company_linkedin || undefined,
    jobTitle,
    location: raw.location || 'Not specified',
    locationType: normalizeLocationType(raw.location_type || raw.type),
    postedDate: getRelativeDate(raw.posted_date || raw.created_at),
    matchScore: raw.match_score ?? Math.floor(Math.random() * 30 + 65),
    salaryMin: raw.salary_min ?? salaryFromRange.min,
    salaryMax: raw.salary_max ?? salaryFromRange.max,
    salaryCurrency: raw.salary_currency || 'USD',
    salaryPeriod: raw.salary_period || 'year',
    employmentType: raw.employment_type || raw.type || 'Full-time',
    experienceLevel: raw.experience_level || raw.experience || 'Not specified',
    description: raw.description || 'No description available.',
    companyDescription: raw.company_description || `${raw.company_name || 'This company'} is an innovative organization looking for talented individuals to join their team.`,
    detailedRequirements: raw.detailed_requirements || raw.description || 'Please refer to the job description for detailed requirements.',
    culturePhotos: Array.isArray(raw.culture_photos) ? raw.culture_photos : [],
    requirements: hasRequirements ? raw.requirements! : [],
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    benefits: hasBenefits ? raw.benefits! : [],
    applicantsCount: raw.applicants_count ?? raw.right_swipe ?? 0,
    deadline: raw.deadline || null,
    portal: raw.portal,
    portalUrl: raw.portal_url,
    companyWebsite: raw.company_website,
    salaryRangeRaw: salaryFromRange.raw || undefined,
    industry: undefined,
    educationLevel: raw.education_level,
    workAuthorization: raw.work_authorization,
  };
}

async function enrichJobWithCompanyData(job: Job, companyName: string): Promise<Job> {
  try {
    const { data: company, error } = await supabase
      .from('companies')
      .select('description, logo, logo_url, website, linkedin, industry')
      .ilike('name', companyName)
      .single();

    if (error || !company) return job;

    const enriched = { ...job };
    if (company.description) {
      enriched.companyDescription = company.description;
    }
    if (company.logo || company.logo_url) {
      enriched.companyLogo = getCompanyLogoUrl(companyName, company.logo, company.logo_url);
    }
    if (company.website) {
      enriched.companyWebsite = company.website;
    }
    if (company.linkedin) {
      enriched.companyLinkedIn = company.linkedin;
    }
    if (company.industry) {
      enriched.industry = company.industry;
    }
    return enriched;
  } catch {
    return job;
  }
}

function enrichWithCompanyData(rows: SupabaseJob[], companyDataMap: Map<string, { industry?: string; size?: string; company_type?: string; description?: string; website?: string }>): Job[] {
  return rows.map((row) => {
    const job = mapSupabaseJobToJob(row);
    const companyData = companyDataMap.get(row.company_name?.toLowerCase() || '');
    if (companyData) {
      if (companyData.industry) job.industry = companyData.industry;
      if (companyData.size) job.companySize = companyData.size;
      if (companyData.company_type) job.companyType = companyData.company_type;
      if (companyData.description) job.companyDescription = companyData.description;
      if (companyData.website) job.companyWebsite = companyData.website;
    }
    return job;
  });
}

async function buildCompanyDataMap(companyNames: string[]): Promise<Map<string, { industry?: string; size?: string; company_type?: string; description?: string; website?: string }>> {
  const map = new Map<string, { industry?: string; size?: string; company_type?: string; description?: string; website?: string }>();
  if (companyNames.length === 0) return map;
  const { data: companies } = await supabase
    .from('companies')
    .select('name, industry, size, company_type, description, website')
    .in('name', companyNames);
  companies?.forEach(company => {
    if (company.name) {
      map.set(company.name.toLowerCase(), {
        industry: company.industry,
        size: company.size,
        company_type: company.company_type,
        description: company.description,
        website: company.website,
      });
    }
  });
  return map;
}

export interface BatchFetchParams {
  tab: 'discover' | 'india' | 'foryou' | 'remote';
  limit: number;
  offset: number;
  excludeIds?: string[];
  searchTags?: string[];
  filters?: {
    companies?: string[];
    roles?: string[];
    locations?: string[];
    workModes?: string[];
    jobTypes?: string[];
    jobLevels?: string[];
    jobRequirements?: string[];
    postedWithin?: string[];
  };
  desiredRoles?: string[];
}

export interface BatchFetchResult {
  jobs: Job[];
  serverHadMore: boolean;
  serverRowCount: number;
}

export async function fetchJobsBatch(params: BatchFetchParams): Promise<BatchFetchResult> {
  try {
    const { tab, limit, offset, excludeIds, searchTags, filters, desiredRoles } = params;

    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    // Exclude already-swiped jobs server-side
    if (excludeIds && excludeIds.length > 0) {
      const idsToExclude = excludeIds.slice(0, 500);
      query = query.not('id', 'in', `(${idsToExclude.join(',')})`);
    }

    // Tab-level server-side filters
    if (tab === 'india') {
      query = query.ilike('location', '%india%');
    } else if (tab === 'remote') {
      query = query.or('type.ilike.%remote%,location.ilike.%remote%');
    } else if (tab === 'foryou') {
      query = query.ilike('location', '%india%');
    }

    // Search tags — filter by company name or title
    if (searchTags && searchTags.length > 0) {
      const orClauses = searchTags.map(tag => {
        const escaped = tag.replace(/'/g, "''");
        return `company_name.ilike.%${escaped}%,title.ilike.%${escaped}%`;
      }).join(',');
      query = query.or(orClauses);
    }

    if (filters?.companies && filters.companies.length > 0) {
      const orClauses = filters.companies.map(c => `company_name.ilike.%${c.replace(/'/g, "''")}%`).join(',');
      query = query.or(orClauses);
    }

    if (filters?.roles && filters.roles.length > 0) {
      const orClauses = filters.roles.map(r => `title.ilike.%${r.replace(/'/g, "''")}%`).join(',');
      query = query.or(orClauses);
    }

    if (filters?.locations && filters.locations.length > 0) {
      const orClauses = filters.locations.map(l => `location.ilike.%${l.replace(/'/g, "''")}%`).join(',');
      query = query.or(orClauses);
    }

    if (filters?.workModes && filters.workModes.length > 0) {
      const orClauses = filters.workModes.map(m => `type.ilike.%${m.replace(/'/g, "''")}%`).join(',');
      query = query.or(orClauses);
    }

    if (filters?.jobTypes && filters.jobTypes.length > 0) {
      const orClauses = filters.jobTypes.map(t => `employment_type.ilike.%${t.replace(/'/g, "''")}%`).join(',');
      query = query.or(orClauses);
    }

    if (filters?.postedWithin && filters.postedWithin.length > 0) {
      const maxMs = Math.max(...filters.postedWithin.map(range => {
        switch (range) {
          case '1d': return 24 * 60 * 60 * 1000;
          case '2d': return 2 * 24 * 60 * 60 * 1000;
          case '1w': return 7 * 24 * 60 * 60 * 1000;
          case '1m': return 30 * 24 * 60 * 60 * 1000;
          case '3m': return 90 * 24 * 60 * 60 * 1000;
          default: return 90 * 24 * 60 * 60 * 1000;
        }
      }));
      const cutoff = new Date(Date.now() - maxMs).toISOString();
      query = query.gte('created_at', cutoff);
    }

    // Over-fetch since we filter client-side by desired roles
    const fetchLimit = (desiredRoles && desiredRoles.length > 0) ? limit * 1.5 : limit;
    query = query.range(offset, offset + fetchLimit - 1);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      console.log(`Batch fetch (${tab}, offset=${offset}): ${error?.message || 'no data'}`);
      return { jobs: [], serverHadMore: false, serverRowCount: 0 };
    }

    const serverRowCount = data.length;
    // serverHadMore is based on raw DB row count vs what we asked for
    const serverHadMore = serverRowCount >= fetchLimit;

    console.log(`Batch fetch (${tab}, offset=${offset}): ${serverRowCount} jobs from DB, serverHadMore=${serverHadMore}`);

    // Filter client-side by desired roles then trim to requested limit
    let rows = data as SupabaseJob[];
    if (desiredRoles && desiredRoles.length > 0) {
      const filtered = rows.filter(row => {
        const title = (row.title || row.job_title || '').toLowerCase();
        const desc = (row.description || '').toLowerCase();
        return desiredRoles.some(role => {
          const r = role.toLowerCase();
          return title.includes(r) || desc.includes(r);
        });
      });
      rows = filtered.length >= Math.min(limit, 3) ? filtered.slice(0, limit) : rows.slice(0, limit);
    }

    const uniqueCompanies = [...new Set(rows.map(j => j.company_name).filter(Boolean))];
    const companyDataMap = await buildCompanyDataMap(uniqueCompanies);
    const jobs = enrichWithCompanyData(rows, companyDataMap);
    return { jobs, serverHadMore, serverRowCount };
  } catch (e) {
    console.log('Exception in fetchJobsBatch:', e);
    return { jobs: [], serverHadMore: false, serverRowCount: 0 };
  }
}

// Legacy functions kept for any other callers
export async function fetchJobsFromSupabase(): Promise<Job[]> {
  const result = await fetchJobsBatch({ tab: 'discover', limit: 10, offset: 0 });
  return result.jobs;
}

export async function fetchRemainingJobs(): Promise<Job[]> {
  return [];
}

export async function fetchCompanyFromSupabase(companyName: string): Promise<SupabaseCompany | null> {
  try {
    console.log('Fetching company from Supabase:', companyName);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', companyName)
      .single();

    if (error) {
      console.log('Error fetching company:', error.message);
      return null;
    }

    console.log('Company data fetched:', data?.name);
    return data as SupabaseCompany;
  } catch (e) {
    console.log('Exception fetching company:', e);
    return null;
  }
}

export async function fetchJobsByCompany(companyName: string): Promise<Job[]> {
  try {
    console.log('Fetching jobs for company:', companyName);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .ilike('company_name', companyName)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching company jobs:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No jobs found for company:', companyName);
      return [];
    }

    console.log(`Fetched ${data.length} jobs for ${companyName}`);
    return data.map((row: SupabaseJob) => mapSupabaseJobToJob(row));
  } catch (e) {
    console.log('Exception fetching company jobs:', e);
    return [];
  }
}

export async function incrementRightSwipe(jobId: string): Promise<void> {
  try {
    console.log('Incrementing right_swipe for job:', jobId);
    const { data: currentJob, error: fetchError } = await supabase
      .from('jobs')
      .select('right_swipe')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      console.log('Error fetching current right_swipe:', fetchError.message);
      return;
    }

    const currentCount = currentJob?.right_swipe ?? 0;
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ right_swipe: currentCount + 1 })
      .eq('id', jobId);

    if (updateError) {
      console.log('Error updating right_swipe:', updateError.message);
      return;
    }

    console.log(`right_swipe incremented to ${currentCount + 1} for job:`, jobId);
  } catch (e) {
    console.log('Exception incrementing right_swipe:', e);
  }
}

export async function addToLiveApplicationQueue(
  userId: string,
  job: Job,
  profile: UserProfile
): Promise<boolean> {
  try {
    console.log('Adding to live_application_queue for job:', job.id, 'user:', userId);

    const { data: jobData } = await supabase
      .from('jobs')
      .select('job_url')
      .eq('id', job.id)
      .single();

    // Split name safely with fallbacks
    const nameParts = (profile.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Build entry with safe defaults for all optional fields
    const entry = {
      user_id: userId,
      job_id: job.id,
      first_name: firstName,
      last_name: lastName,
      gender: profile.gender || null,
      phone: profile.phone || null,
      country_code: profile.countryCode || null,
      location: profile.location || null,
      headline: profile.headline || null,
      bio: profile.bio || null,
      resume_url: profile.resumeUrl || null,
      linkedin_url: profile.linkedinUrl || null,
      github_url: profile.githubUrl || null,
      veteran_status: profile.veteranStatus || null,
      disability_status: profile.disabilityStatus || null,
      ethnicity: profile.ethnicity || null,
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      top_skills: Array.isArray(profile.topSkills) ? profile.topSkills : [],
      experience: Array.isArray(profile.experience) ? profile.experience : [],
      education: Array.isArray(profile.education) ? profile.education : [],
      certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
      achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
      job_preferences: Array.isArray(profile.jobPreferences) ? profile.jobPreferences : [],
      work_mode_preferences: Array.isArray(profile.workModePreferences) ? profile.workModePreferences : [],
      salary_currency: profile.salaryCurrency || null,
      salary_min: profile.salaryMinPref || null,
      salary_max: profile.salaryMaxPref || null,
      desired_roles: Array.isArray(profile.desiredRoles) ? profile.desiredRoles : [],
      preferred_cities: Array.isArray(profile.preferredCities) ? profile.preferredCities : [],
      company_name: job.companyName,
      job_title: job.jobTitle,
      job_url: jobData?.job_url || null,
      status: 'pending',
      applied_at: new Date().toISOString(),
      progress_timestamps: JSON.stringify([new Date().toISOString()]),
    };

    const { error } = await supabase
      .from('live_application_queue')
      .insert(entry);

    if (error) {
      console.log('Error adding to live_application_queue:', error.message, error);
      return false;
    }

    console.log('Successfully added to live_application_queue for job:', job.id);
    return true;
  } catch (e) {
    console.log('Exception adding to live_application_queue:', e);
    return false;
  }
}

const PROGRESS_TOTAL_STEPS = 11;
const PROGRESS_DURATION_MS = 120000; // 120 seconds total
const PROGRESS_STEP_DURATION_MS = PROGRESS_DURATION_MS / (PROGRESS_TOTAL_STEPS - 2); // ~13.3s per animated step (steps 2-10)

export async function updateApplicationProgress(appId: string): Promise<{ step: number; timestamps: string[]; done: boolean }> {
  try {
    const { data, error } = await supabase
      .from('live_application_queue')
      .select('applied_at, created_at, status, progress_timestamps')
      .eq('id', appId)
      .single();

    if (error || !data) return { step: 0, timestamps: [], done: false };

    const appliedAt = data.applied_at || data.created_at;
    if (!appliedAt) return { step: 0, timestamps: [], done: false };

    const elapsed = Date.now() - new Date(appliedAt).getTime();
    // First 2 steps are instant, remaining 9 steps spread over 120s
    const animatedStep = Math.min(Math.floor(elapsed / PROGRESS_STEP_DURATION_MS), PROGRESS_TOTAL_STEPS - 2 - 1);
    const currentStep = Math.min(animatedStep + 2, PROGRESS_TOTAL_STEPS - 1);
    const done = currentStep >= PROGRESS_TOTAL_STEPS - 1;

    // Build timestamps array
    let timestamps: string[] = [];
    try {
      timestamps = data.progress_timestamps ? JSON.parse(data.progress_timestamps) : [appliedAt];
    } catch {
      timestamps = [appliedAt];
    }

    // Fill in missing timestamps for completed steps
    const startTime = new Date(appliedAt).getTime();
    let updated = false;
    for (let i = timestamps.length; i <= currentStep; i++) {
      if (i < 2) {
        timestamps.push(appliedAt);
      } else {
        const stepTime = new Date(startTime + (i - 2) * PROGRESS_STEP_DURATION_MS).toISOString();
        timestamps.push(stepTime);
      }
      updated = true;
    }

    // Update DB if new steps completed or if done and status still pending
    if (updated || (done && data.status === 'pending')) {
      const updatePayload: any = { progress_timestamps: JSON.stringify(timestamps) };
      if (done && (data.status === 'pending' || data.status === 'failed')) {
        updatePayload.status = 'completed';
      }
      await supabase.from('live_application_queue').update(updatePayload).eq('id', appId);
    }

    return { step: currentStep, timestamps, done };
  } catch (e) {
    console.log('Error updating application progress:', e);
    return { step: 0, timestamps: [], done: false };
  }
}

export async function fetchJobById(jobId: string): Promise<Job | null> {
  try {
    console.log('Fetching job by ID:', jobId);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.log('Error fetching job by ID:', error.message);
      return null;
    }

    if (!data) return null;
    
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
  } catch (e) {
    console.log('Exception fetching job by ID:', e);
    return null;
  }
}

export async function fetchUserApplications(userId: string): Promise<any[]> {
  try {
    console.log('Fetching applications for user:', userId);
    const { data: applications, error } = await supabase
      .from('live_application_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching applications:', error.message);
      return [];
    }

    if (!applications || applications.length === 0) {
      console.log('No applications found');
      return [];
    }

    // Fetch company data (logo, logo_url) for enrichment
    const companyNames = [...new Set(applications.map(app => app.company_name).filter(Boolean))];
    const { data: companies } = await supabase
      .from('companies')
      .select('name, logo, logo_url');

    const companyDataMap = new Map<string, { logo?: string; logo_url?: string }>();
    companies?.forEach(company => {
      if (company.name) {
        companyDataMap.set(company.name.toLowerCase(), {
          logo: company.logo,
          logo_url: company.logo_url,
        });
      }
    });

    // Enrich applications with company data
    const enrichedApplications = applications.map(app => {
      const companyKey = app.company_name?.toLowerCase();
      const companyData = companyKey ? companyDataMap.get(companyKey) : null;
      return {
        ...app,
        company_logo: companyData?.logo || null,
        company_logo_url: companyData?.logo_url || null,
      };
    });

    console.log(`Fetched ${enrichedApplications.length} applications`);
    return enrichedApplications;
  } catch (e) {
    console.log('Exception fetching applications:', e);
    return [];
  }
}

export async function fetchAllCompanies(): Promise<string[]> {
  try {
    console.log('Fetching all companies from Supabase...');
    const { data, error } = await supabase
      .from('companies')
      .select('name')
      .order('name', { ascending: true });

    if (error) {
      console.log('Error fetching companies:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No companies found');
      return [];
    }

    console.log(`Fetched ${data.length} companies`);
    return data.map(c => c.name).filter(Boolean);
  } catch (e) {
    console.log('Exception fetching companies:', e);
    return [];
  }
}

export async function fetchUniqueJobTitles(): Promise<string[]> {
  try {
    console.log('Fetching unique job titles from Supabase...');
    const { data, error } = await supabase
      .from('jobs')
      .select('title');

    if (error) {
      console.log('Error fetching job titles:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No job titles found');
      return [];
    }

    const uniqueTitles = [...new Set(data.map(j => j.title).filter(Boolean))];
    console.log(`Fetched ${uniqueTitles.length} unique job titles`);
    return uniqueTitles.sort();
  } catch (e) {
    console.log('Exception fetching job titles:', e);
    return [];
  }
}

export async function fetchUniqueLocations(): Promise<string[]> {
  try {
    console.log('Fetching unique locations from Supabase...');
    const { data, error } = await supabase
      .from('jobs')
      .select('location');

    if (error) {
      console.log('Error fetching locations:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No locations found');
      return [];
    }

    const uniqueLocations = [...new Set(data.map(j => j.location).filter(Boolean))];
    console.log(`Fetched ${uniqueLocations.length} unique locations`);
    return uniqueLocations.sort();
  } catch (e) {
    console.log('Exception fetching locations:', e);
    return [];
  }
}

export async function saveJob(userId: string, jobId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_jobs')
      .insert({ user_id: userId, job_id: jobId });
    return !error;
  } catch {
    return false;
  }
}

export async function unsaveJob(userId: string, jobId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);
    return !error;
  } catch {
    return false;
  }
}

export async function isJobSaved(userId: string, jobId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .single();
    return !!data;
  } catch {
    return false;
  }
}

// --- OTP Extraction & Matching ---

const OTP_KEYWORDS = [
  'verification code', 'verify your email', 'otp', 'one-time',
  'confirmation code', 'security code', 'passcode', 'pin code',
  'verify your account', 'enter the code', 'enter this code',
  'your code is', 'your code:', 'code is:',
];

export function extractOtp(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const hasKeyword = OTP_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasKeyword) return null;

  // Match 4-8 digit standalone codes (most common OTP formats)
  const matches = text.match(/\b(\d{4,8})\b/g);
  if (!matches) return null;

  // Filter out likely non-OTP numbers (years, zip codes in context, etc.)
  for (const m of matches) {
    const n = parseInt(m, 10);
    if (m.length >= 4 && m.length <= 8 && n >= 1000 && !(n >= 1900 && n <= 2100)) {
      return m;
    }
  }
  return null;
}

function domainFromEmail(email: string): string {
  return (email.split('@')[1] || '').toLowerCase();
}

function companyMatchesEmail(companyName: string, fromEmail: string, subject: string): boolean {
  const company = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domain = domainFromEmail(fromEmail).replace(/[^a-z0-9]/g, '');
  const subjectLower = subject.toLowerCase();
  return domain.includes(company) || company.includes(domain.split('.')[0]) || subjectLower.includes(companyName.toLowerCase());
}

// --- Interview Detection ---

const INTERVIEW_KEYWORDS = [
  'interview', 'schedule a call', 'schedule a chat',
  'we\'d like to speak', 'we would like to speak',
  'invite you to interview', 'interview invitation',
  'next round', 'phone screen', 'technical screen',
  'on-site interview', 'virtual interview', 'video interview',
  'meet the team', 'hiring manager', 'interview slot',
  'book a time', 'calendar invite', 'interview scheduled',
  'we are pleased to invite', 'pleased to inform you',
  'move forward with your application', 'moving forward',
  'like to invite you', 'selected for an interview',
  'shortlisted', 'next steps in the process',
];

function emailContainsInterview(subject: string, bodyText: string): boolean {
  const combined = `${subject} ${bodyText}`.toLowerCase();
  return INTERVIEW_KEYWORDS.some((kw) => combined.includes(kw));
}

export async function scanEmailsForInterviews(userId: string): Promise<number> {
  try {
    // Fetch applications that are in submitted/completed/applied status (not already interview_scheduled)
    const { data: apps, error: appsErr } = await supabase
      .from('live_application_queue')
      .select('id, company_name, status, created_at')
      .eq('user_id', userId)
      .in('status', ['completed', 'applied', 'submitted', 'under_review'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (appsErr || !apps || apps.length === 0) return 0;

    // Fetch recent inbound emails (last 30 days for interview emails)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: emails, error: emailsErr } = await supabase
      .from('inbound_emails')
      .select('id, from_email, subject, body_text')
      .eq('user_id', userId)
      .gte('received_at', monthAgo)
      .order('received_at', { ascending: false })
      .limit(200);

    if (emailsErr || !emails || emails.length === 0) return 0;

    let updated = 0;

    for (const email of emails) {
      const subject = email.subject || '';
      const bodyText = email.body_text || '';

      if (!emailContainsInterview(subject, bodyText)) continue;

      // Find matching application by company
      const matchedApp = apps.find((app) =>
        companyMatchesEmail(app.company_name || '', email.from_email || '', subject)
      );

      if (matchedApp) {
        const { error: updateErr } = await supabase
          .from('live_application_queue')
          .update({ status: 'interview_scheduled' })
          .eq('id', matchedApp.id);

        if (!updateErr) {
          updated++;
          console.log(`Interview detected for application ${matchedApp.id} (${matchedApp.company_name}) from email: "${subject}"`);
          // Remove from apps list so we don't double-match
          const idx = apps.indexOf(matchedApp);
          if (idx !== -1) apps.splice(idx, 1);
        }
      }
    }

    if (updated > 0) {
      console.log(`Updated ${updated} application(s) to interview_scheduled`);
    }
    return updated;
  } catch (e) {
    console.log('scanEmailsForInterviews error:', e);
    return 0;
  }
}

export async function scanEmailsForOtp(userId: string): Promise<number> {
  try {
    // Fetch pending/recent applications
    const { data: apps, error: appsErr } = await supabase
      .from('live_application_queue')
      .select('id, company_name, verification_otp, created_at')
      .eq('user_id', userId)
      .is('verification_otp', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (appsErr || !apps || apps.length === 0) return 0;

    // Fetch recent inbound emails (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: emails, error: emailsErr } = await supabase
      .from('inbound_emails')
      .select('id, from_email, subject, body_text')
      .eq('user_id', userId)
      .gte('received_at', weekAgo)
      .order('received_at', { ascending: false })
      .limit(100);

    if (emailsErr || !emails || emails.length === 0) return 0;

    let updated = 0;

    for (const email of emails) {
      const otp = extractOtp(`${email.subject || ''} ${email.body_text || ''}`);
      if (!otp) continue;

      // Find matching application by company
      const matchedApp = apps.find((app) =>
        companyMatchesEmail(app.company_name || '', email.from_email || '', email.subject || '')
      );

      if (matchedApp) {
        const { error: updateErr } = await supabase
          .from('live_application_queue')
          .update({
            verification_otp: otp,
            otp_received_at: new Date().toISOString(),
          })
          .eq('id', matchedApp.id);

        if (!updateErr) {
          updated++;
          console.log(`OTP "${otp}" linked to application ${matchedApp.id} (${matchedApp.company_name})`);
          // Remove from apps list so we don't double-match
          const idx = apps.indexOf(matchedApp);
          if (idx !== -1) apps.splice(idx, 1);
        }
      }
    }

    return updated;
  } catch (e) {
    console.log('scanEmailsForOtp error:', e);
    return 0;
  }
}
