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

export async function fetchJobsFromSupabase(): Promise<Job[]> {
  try {
    console.log('Fetching jobs from Supabase...');
    
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total jobs in database: ${count}`);
    
    const pageSize = 1000;
    const allData: SupabaseJob[] = [];
    
    if (count && count > 0) {
      const totalPages = Math.ceil(count / pageSize);
      
      for (let page = 0; page < totalPages; page++) {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
          console.log(`Error fetching page ${page + 1}:`, error.message);
          break;
        }
        
        if (data && data.length > 0) {
          allData.push(...data);
          console.log(`Fetched page ${page + 1}/${totalPages} (${data.length} jobs)`);
        }
      }
    }

    if (allData.length === 0) {
      console.log('No jobs found in Supabase');
      return [];
    }

    console.log(`Successfully fetched ${allData.length} jobs from Supabase (total in DB: ${count})`);
    
    // Fetch company data for all companies in one query
    const uniqueCompanies = [...new Set(allData.map(j => j.company_name).filter(Boolean))];
    const { data: companies } = await supabase
      .from('companies')
      .select('name, industry, size, company_type, description, website')
      .in('name', uniqueCompanies);
    
    const companyDataMap = new Map<string, { industry?: string; size?: string; company_type?: string; description?: string; website?: string }>();
    companies?.forEach(company => {
      if (company.name) {
        companyDataMap.set(company.name.toLowerCase(), {
          industry: company.industry,
          size: company.size,
          company_type: company.company_type,
          description: company.description,
          website: company.website,
        });
      }
    });
    
    return allData.map((row: SupabaseJob) => {
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
  } catch (e) {
    console.log('Exception fetching jobs:', e);
    return [];
  }
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
      work_professions: Array.isArray(profile.workProfessions) ? profile.workProfessions : [],
      onboarding_data: profile.onboardingData || {},
      company_name: job.companyName,
      job_title: job.jobTitle,
      job_url: jobData?.job_url || null,
      status: 'pending',
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
    console.log('Saving job:', jobId, 'for user:', userId);
    const { error } = await supabase
      .from('saved_jobs')
      .insert({ user_id: userId, job_id: jobId });

    if (error) {
      console.log('Error saving job:', error.message);
      return false;
    }

    console.log('Job saved successfully');
    return true;
  } catch (e) {
    console.log('Exception saving job:', e);
    return false;
  }
}
