import { OnboardingWorkExp, OnboardingEducation, OnboardingSkill } from '@/types/onboarding';

export interface ParsedResumeData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  headline?: string;
  linkedInUrl?: string;
  workExperience?: OnboardingWorkExp[];
  education?: OnboardingEducation[];
  skills?: OnboardingSkill[];
}

export function parseResumeText(text: string): ParsedResumeData {
  const parsed: ParsedResumeData = {};

  const nameMatch = text.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/m);
  if (nameMatch) {
    parsed.firstName = nameMatch[1];
    parsed.lastName = nameMatch[2];
  }

  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) parsed.phone = phoneMatch[0].replace(/[^\d+]/g, '');

  const locationMatch = text.match(/([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s*[A-Z][a-z]+,\s*[A-Z]{2})/);
  if (locationMatch) parsed.location = locationMatch[0];

  const linkedInMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
  if (linkedInMatch) parsed.linkedInUrl = `https://linkedin.com/in/${linkedInMatch[1]}`;

  const titlePatterns = /(Software Engineer|Developer|Designer|Manager|Analyst|Consultant|Director|Lead|Senior|Junior|Product Manager|Data Scientist|Marketing|Sales)/i;
  const titleMatch = text.match(titlePatterns);
  if (titleMatch) parsed.headline = titleMatch[0];

  parsed.workExperience = extractWorkExperience(text);
  parsed.education = extractEducation(text);
  parsed.skills = extractSkills(text);

  return parsed;
}

function extractWorkExperience(text: string): OnboardingWorkExp[] {
  const experiences: OnboardingWorkExp[] = [];
  const expSection = text.match(/(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT)([\s\S]*?)(?=EDUCATION|SKILLS|PROJECTS|$)/i);
  if (!expSection) return experiences;

  const expText = expSection[1];
  const jobPattern = /([A-Z][^\n]{10,60})\s*\n\s*([A-Z][^\n]{5,50})\s*\n\s*(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|Present|Current)/gi;
  
  let match;
  while ((match = jobPattern.exec(expText)) !== null && experiences.length < 3) {
    const [, titleOrCompany, companyOrTitle, startDate, endDate] = match;
    const startParts = startDate.split(' ');
    const endParts = endDate.includes('Present') || endDate.includes('Current') ? ['', ''] : endDate.split(' ');

    experiences.push({
      id: Date.now().toString() + Math.random(),
      title: titleOrCompany.length < companyOrTitle.length ? titleOrCompany : companyOrTitle,
      company: titleOrCompany.length > companyOrTitle.length ? titleOrCompany : companyOrTitle,
      employmentType: 'Full-time',
      location: '',
      isRemote: false,
      startMonth: startParts[0] || '',
      startYear: startParts[1] || '',
      endMonth: endParts[0] || '',
      endYear: endParts[1] || '',
      isCurrent: endDate.includes('Present') || endDate.includes('Current'),
      description: '',
    });
  }
  return experiences;
}

function extractEducation(text: string): OnboardingEducation[] {
  const education: OnboardingEducation[] = [];
  const eduSection = text.match(/(?:EDUCATION)([\s\S]*?)(?=EXPERIENCE|SKILLS|PROJECTS|$)/i);
  if (!eduSection) return education;

  const eduText = eduSection[1];
  const degreePattern = /(Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.|M\.A\.)[\s\S]{0,100}?(\d{4})/gi;
  
  let match;
  while ((match = degreePattern.exec(eduText)) !== null && education.length < 2) {
    const [fullMatch, degree, year] = match;
    const lines = fullMatch.split('\n').filter(l => l.trim());
    const institution = lines.find(l => l.length > 10 && !l.match(/\d{4}/)) || '';

    education.push({
      id: Date.now().toString() + Math.random(),
      institution: institution.trim(),
      degree: degree,
      field: '',
      startYear: (parseInt(year) - 4).toString(),
      endYear: year,
    });
  }
  return education;
}

function extractSkills(text: string): OnboardingSkill[] {
  const skills: OnboardingSkill[] = [];
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript', 'SQL',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'HTML', 'CSS', 'MongoDB', 'PostgreSQL',
    'Leadership', 'Communication', 'Project Management', 'Agile', 'Scrum'
  ];

  commonSkills.forEach(skill => {
    if (text.includes(skill)) {
      skills.push({ name: skill, level: 'intermediate', yearsOfExperience: 2 });
    }
  });

  return skills.slice(0, 10);
}
