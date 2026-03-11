export interface Job {
    id: string;
    companyName: string;
    companyLogo: string;
    companyLinkedIn?: string;
    jobTitle: string;
    location: string;
    locationType: 'remote' | 'onsite' | 'hybrid';
    postedDate: string;
    matchScore: number;
    salaryMin: number;
    salaryMax: number;
    salaryCurrency: string;
    salaryPeriod: string;
    employmentType: string;
    experienceLevel: string;
    description: string;
    companyDescription: string;
    detailedRequirements: string;
    culturePhotos: string[];
    requirements: string[];
    skills: string[];
    benefits: string[];
    applicantsCount: number;
    deadline: string | null;
    portal?: string;
    portalUrl?: string;
    companyWebsite?: string;
    salaryRangeRaw?: string;
    jobLevel?: string;
    jobRequirements?: string[];
    industry?: string;
    companySize?: string;
    companyType?: string;
    educationLevel?: string;
    workAuthorization?: string;
  }
  
  export interface Match {
    id: string;
    job: Job;
    matchedDate: string;
    status: 'new' | 'viewed' | 'awaiting' | 'interview_scheduled' | 'interested';
    lastMessage: string | null;
    unreadCount: number;
    companyInterest?: string;
  }
  
  export interface Conversation {
    id: string;
    companyName: string;
    companyLogo: string;
    recruiterName: string;
    jobTitle: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isOnline: boolean;
    category?: 'new' | 'follow_up' | 'active';
  }
  
  export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    isRead: boolean;
    isDelivered?: boolean;
    attachmentType?: 'image' | 'file' | 'pdf' | null;
    attachmentName?: string;
  }
  
  export interface Application {
    id: string;
    job: Job;
    appliedDate: string;
    status: 'applied' | 'under_review' | 'interview_scheduled' | 'offer' | 'rejected' | 'withdrawn';
    lastActivity: string;
    interviewDate: string | null;
    interviewTime: string | null;
    meetingLink: string | null;
    meetingPlatform: 'google_meet' | 'zoom' | 'microsoft_teams' | null;
  }
  
  export interface WorkExperience {
    id: string;
    company: string;
    title: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string;
    skills?: string[];
    employmentType?: string;
    workMode?: string;
    jobLocation?: string;
  }
  
  export interface Education {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    description?: string;
    achievements?: string;
    extracurriculars?: string;
  }
  
  export interface Certification {
    id: string;
    name: string;
    issuingOrganization: string;
    credentialUrl: string;
    skills: string[];
  }
  
  export interface Achievement {
    id: string;
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }
  
  export interface Resume {
    id: string;
    name: string;
    fileName: string;
    uploadDate: string;
    isActive: boolean;
  }
  
  export interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    headline: string;
    location: string;
    avatar: string;
    bio: string;
    profileCompletion: number;
    totalApplications: number;
    interviewsScheduled: number;
    matchRate: number;
    profileViews: number;
    skills: string[];
    topSkills: string[];
    experience: WorkExperience[];
    education: Education[];
    certifications: Certification[];
    achievements: Achievement[];
    jobPreferences: string[];
    workModePreferences: string[];
    salaryCurrency: string;
    salaryMinPref: number;
    salaryMaxPref: number;
    linkedinUrl?: string;
    githubUrl?: string;
    isProfileVerified?: boolean;
    veteranStatus?: string;
    disabilityStatus?: string;
    ethnicity?: string;
    race?: string;
    gender?: string;
    countryCode?: string;
    resumeUrl?: string;
    desiredRoles?: string[];
    preferredCities?: string[];
    workProfessions?: string[];
    onboardingData?: any;
    coverLetter?: string;
    workAuthorizationStatus?: string;
    jobRequirements?: string[];
    favoriteCompanies?: string[];
    preferredWorkLocations?: string[];
    workdayEmail?: string;
    workdayPassword?: string;
    jobleverEmail?: string;
    jobleverPassword?: string;
    greenhouseEmail?: string;
    greenhousePassword?: string;
    taleoEmail?: string;
    taleoPassword?: string;
  }
  