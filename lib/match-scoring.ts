import type { Job, UserProfile } from '@/types';

/**
 * Compute a real match score (0-100) between a user profile and a job.
 * Runs entirely client-side — no API call needed.
 *
 * Scoring breakdown:
 *   Skills overlap:      40 points max
 *   Experience level:    20 points max
 *   Location match:      15 points max
 *   Job type match:      10 points max
 *   Role title match:    15 points max
 */
export function computeMatchScore(profile: UserProfile | null, job: Job): number {
  if (!profile) return 50; // Default if no profile

  let score = 0;

  // 1. Skills overlap (40 points)
  score += scoreSkills(profile.skills || [], job.skills || [], job.requirements || [], job.description || '');

  // 2. Experience level match (20 points)
  score += scoreExperienceLevel(profile.experienceLevel || '', job.experienceLevel || '');

  // 3. Location match (15 points)
  score += scoreLocation(profile.location || '', profile.preferredCities || [], job.location || '', job.locationType);

  // 4. Job type preferences (10 points)
  score += scoreJobType(profile.jobPreferences || [], profile.workModePreferences || [], job.employmentType || '', job.locationType);

  // 5. Desired role title match (15 points)
  score += scoreRoleMatch(profile.desiredRoles || [], job.jobTitle || '');

  return Math.min(100, Math.max(10, Math.round(score)));
}

function scoreSkills(userSkills: string[], jobSkills: string[], jobRequirements: string[], description: string): number {
  if (userSkills.length === 0) return 15; // Neutral if no skills listed

  // Combine job skills + requirements + description keywords
  const jobKeywords = new Set<string>();
  for (const s of jobSkills) jobKeywords.add(s.toLowerCase().trim());
  for (const r of jobRequirements) {
    // Extract individual words/phrases from requirements
    r.toLowerCase().split(/[,;|]/).forEach(part => {
      const trimmed = part.trim();
      if (trimmed.length > 1 && trimmed.length < 40) jobKeywords.add(trimmed);
    });
  }

  // Also scan description for user's skills
  const descLower = description.toLowerCase();

  if (jobKeywords.size === 0 && !description) return 20; // No job skills listed

  let matches = 0;
  const userSkillsLower = userSkills.map(s => s.toLowerCase().trim());

  for (const skill of userSkillsLower) {
    // Direct match in job skills
    if (jobKeywords.has(skill)) {
      matches++;
      continue;
    }
    // Partial match (e.g., "React" matches "React.js" or "ReactJS")
    for (const jk of jobKeywords) {
      if (jk.includes(skill) || skill.includes(jk)) {
        matches += 0.7;
        break;
      }
    }
    // Found in description
    if (descLower.includes(skill)) {
      matches += 0.5;
    }
  }

  const targetSkills = Math.max(jobKeywords.size, 3);
  const ratio = Math.min(matches / targetSkills, 1);
  return Math.round(ratio * 40);
}

function scoreExperienceLevel(userLevel: string, jobLevel: string): number {
  if (!userLevel || !jobLevel) return 10; // Neutral

  const LEVEL_MAP: Record<string, number> = {
    'internship': 0, 'entry_level': 1, 'entry': 1, 'junior': 2,
    'mid': 3, 'mid-level': 3, 'mid level': 3,
    'senior': 4, 'lead': 5, 'expert': 5, 'principal': 5, 'staff': 5,
    'director': 6, 'vp': 7, 'executive': 8,
  };

  const userNum = LEVEL_MAP[userLevel.toLowerCase()] ?? 2;
  const jobLevelLower = jobLevel.toLowerCase();
  let jobNum = 2; // default mid
  for (const [key, val] of Object.entries(LEVEL_MAP)) {
    if (jobLevelLower.includes(key)) {
      jobNum = val;
      break;
    }
  }

  const diff = Math.abs(userNum - jobNum);
  if (diff === 0) return 20;
  if (diff === 1) return 15;
  if (diff === 2) return 8;
  return 3;
}

function scoreLocation(userLocation: string, preferredCities: string[], jobLocation: string, locationType: string): number {
  // Remote jobs match everyone
  if (locationType === 'remote') return 15;

  if (!userLocation && preferredCities.length === 0) return 8;

  const jobLocLower = jobLocation.toLowerCase();

  // Check preferred cities
  for (const city of preferredCities) {
    if (jobLocLower.includes(city.toLowerCase().split(',')[0])) return 15;
  }

  // Check user's current location
  if (userLocation) {
    const userCity = userLocation.toLowerCase().split(',')[0].trim();
    if (jobLocLower.includes(userCity)) return 15;
    // Same country
    const userCountry = userLocation.toLowerCase().split(',').pop()?.trim() || '';
    const jobCountry = jobLocation.toLowerCase().split(',').pop()?.trim() || '';
    if (userCountry && jobCountry && userCountry === jobCountry) return 10;
  }

  // Hybrid gets partial credit
  if (locationType === 'hybrid') return 8;

  return 4;
}

function scoreJobType(jobPrefs: string[], workModePrefs: string[], employmentType: string, locationType: string): number {
  let score = 5; // Base

  // Job type match (Full-time, Part-time, etc.)
  if (jobPrefs.length > 0 && employmentType) {
    if (jobPrefs.some(p => p.toLowerCase() === employmentType.toLowerCase())) {
      score += 5;
    }
  } else {
    score += 3; // Neutral
  }

  // Work mode match (Remote, Onsite, Hybrid)
  if (workModePrefs.length > 0 && locationType) {
    const modeMap: Record<string, string> = { 'remote': 'Remote', 'onsite': 'Onsite', 'hybrid': 'Hybrid' };
    const jobMode = modeMap[locationType] || '';
    if (jobMode && workModePrefs.includes(jobMode)) {
      score = Math.min(score + 3, 10);
    }
  }

  return Math.min(score, 10);
}

function scoreRoleMatch(desiredRoles: string[], jobTitle: string): number {
  if (desiredRoles.length === 0) return 8; // Neutral

  const titleLower = jobTitle.toLowerCase();
  const titleWords = titleLower.split(/[\s,/\-|]+/).filter(w => w.length > 2);

  let bestMatch = 0;
  for (const role of desiredRoles) {
    const roleLower = role.toLowerCase();
    // Exact match
    if (titleLower.includes(roleLower) || roleLower.includes(titleLower)) {
      return 15;
    }
    // Word overlap
    const roleWords = roleLower.split(/[\s,/\-|]+/).filter(w => w.length > 2);
    let wordMatches = 0;
    for (const rw of roleWords) {
      if (titleWords.some(tw => tw.includes(rw) || rw.includes(tw))) {
        wordMatches++;
      }
    }
    const overlap = roleWords.length > 0 ? wordMatches / roleWords.length : 0;
    bestMatch = Math.max(bestMatch, overlap);
  }

  return Math.round(bestMatch * 15);
}

/**
 * Batch compute match scores for an array of jobs.
 */
export function computeMatchScores(profile: UserProfile | null, jobs: Job[]): Job[] {
  return jobs.map(job => ({
    ...job,
    matchScore: computeMatchScore(profile, job),
  }));
}
