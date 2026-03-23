export interface OnboardingSkill {
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    yearsOfExperience: number;
  }
  
  export interface OnboardingWorkExp {
    id: string;
    title: string;
    company: string;
    employmentType: string;
    location: string;
    isRemote: boolean;
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    isCurrent: boolean;
    description: string;
  }
  
  export interface OnboardingEducation {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
  }
  
  export interface OnboardingData {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female' | 'prefer_not_to_say' | '';
    profilePicture: string | null;
    phone: string;
    countryCode: string;
    location: string;
    headline: string;
    linkedInUrl: string;
    githubUrl: string;
    workExperience: OnboardingWorkExp[];
    education: OnboardingEducation[];
    skills: OnboardingSkill[];
    workPreferences: string[];
    desiredRoles: string[];
    salaryMin: number;
    salaryMax: number;
    salaryCurrency: string;
    preferredCities: string[];
    openToRelocation: boolean;
    resumeUri: string | null;
    veteranStatus: string;
    disabilityStatus: string;
    ethnicity: string;
    race: string;
    workAuthorizationStatus: string;
  }
  
  export interface StepProps {
    data: OnboardingData;
    onUpdate: (partial: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
  }
  
  export const defaultOnboardingData: OnboardingData = {
    firstName: '',
    lastName: '',
    gender: '',
    profilePicture: null,
    phone: '',
    countryCode: '+91',
    location: '',
    headline: '',
    linkedInUrl: '',
    githubUrl: '',
    workExperience: [],
    education: [],
    skills: [],
    workPreferences: [],
    desiredRoles: [],
    salaryMin: 40000,
    salaryMax: 200000,
    salaryCurrency: 'USD',
    preferredCities: [],
    openToRelocation: false,
    resumeUri: null,
    veteranStatus: '',
    disabilityStatus: '',
    ethnicity: '',
    race: '',
    workAuthorizationStatus: '',
  };
  