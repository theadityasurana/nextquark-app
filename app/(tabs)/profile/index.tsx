import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronRight,
  Briefcase,
  GraduationCap,
  Star,
  Eye,
  FileText,
  FileText as FileTextIcon,
  LogOut,
  Zap,
  Plus,
  X,
  Check,
  Pencil,
  Camera,
  MapPin,
  Award,
  Link2,
  ChevronDown,
  Crown,
  Phone,
  Mail,
  Github,
  Linkedin,
  Trophy,
  ShieldCheck,
  Settings,
  Share2,
  Lock,
  Search,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors, { lightColors, darkColors } from '@/constants/colors';
import { UserProfile, WorkExperience, Education, Certification, Achievement } from '@/types';
import { CURRENCIES, getSalaryConfig, formatSalaryForCurrency } from '@/constants/cities';
import RangeSlider from '@/components/RangeSlider';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { fetchUserApplications } from '@/lib/jobs';
import { getSubscriptionStatus, type SubscriptionData, getSubscriptionDisplayName, getSubscriptionBadgeColor } from '@/lib/subscription';
import { supabase, SUPABASE_URL, getProfilePictureUrl, getCompanyLogoStorageUrl, getStorageUploadUrl } from '@/lib/supabase';
import { getReferralStats, createReferralCode } from '@/lib/referral';
import { Share, Clipboard } from 'react-native';
import { suggestedSkills, suggestedRoles, majorCities } from '@/constants/onboarding';
import { universities } from '@/constants/universities';

type ModalType = 'skill' | 'experience' | 'education' | 'bio' | 'headline' | 'location' | 'certification' | 'avatar' | 'achievement' | 'contact' | 'coverletter' | 'jobrequirements' | 'favoritecompanies' | 'referral' | 'veteranstatus' | 'disabilitystatus' | 'ethnicity' | 'race' | 'desiredroles' | 'preferredcities' | 'workdaycredentials' | 'completeprofile' | null;

type ProfileWizardStep = 'topskills' | 'education' | 'experience' | 'achievements' | 'certifications';

const WIZARD_HELPER_TEXT: Record<ProfileWizardStep, string> = {
  topskills: "your skills are literally your superpower ✨ pick the ones that make you *you*",
  education: "drop your academic era here 🎓 flex those degrees bestie",
  experience: "time to show off your work glow-up 💼 no cap, recruiters love this",
  achievements: "main character energy only 🏆 what wins are you proud of?",
  certifications: "certified iconic 📜 add your certs and watch your profile slay",
};

const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODE_OPTIONS = ['Remote', 'Onsite', 'Hybrid'];
const EXP_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const EXP_MODE_OPTIONS = ['Remote', 'Onsite', 'Hybrid'];

function buildProfileFromOnboarding(data: OnboardingData): UserProfile {
  return {
    id: 'local',
    name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'User',
    email: '',
    phone: data.phone || '',
    headline: data.headline || '',
    location: data.location || '',
    avatar: data.profilePicture || `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(data.firstName || data.lastName || 'user')}&size=200`,
    bio: '',
    profileCompletion: 0,
    totalApplications: 0,
    interviewsScheduled: 0,
    matchRate: 0,
    profileViews: 0,
    skills: data.skills.map(s => s.name),
    topSkills: [],
    experience: data.workExperience.map(w => ({
      id: w.id,
      company: w.company,
      title: w.title,
      startDate: w.startMonth && w.startYear ? `${w.startMonth} ${w.startYear}` : '',
      endDate: w.isCurrent ? null : (w.endMonth && w.endYear ? `${w.endMonth} ${w.endYear}` : ''),
      isCurrent: w.isCurrent,
      description: w.description,
      employmentType: w.employmentType,
      workMode: w.isRemote ? 'Remote' : 'Onsite',
      jobLocation: w.location,
    })),
    education: data.education.map(e => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      startDate: e.startYear,
      endDate: e.endYear,
    })),
    certifications: [],
    achievements: [],
    jobPreferences: [],
    workModePreferences: data.workPreferences,
    salaryCurrency: data.salaryCurrency,
    salaryMinPref: data.salaryMin,
    salaryMaxPref: data.salaryMax,
    linkedinUrl: data.linkedInUrl || undefined,
    githubUrl: undefined,
    isProfileVerified: false,
    veteranStatus: data.veteranStatus || undefined,
    disabilityStatus: data.disabilityStatus || undefined,
    ethnicity: data.ethnicity || undefined,
    gender: data.gender || undefined,
    favoriteCompanies: [],
  };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, onboardingData, userProfile: supabaseProfile, saveProfile, refetchProfile, supabaseUserId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);
  const favoriteCompaniesY = useRef(0);
  const params = useLocalSearchParams<{ scrollTo?: string }>();

  useFocusEffect(
    useCallback(() => {
      if (params.scrollTo === 'favoritecompanies') {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: favoriteCompaniesY.current, animated: true });
        }, 300);
      } else {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }
      refetchProfile();
    }, [params.scrollTo, refetchProfile])
  );

  const { data: applications = [] } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    queryFn: () => fetchUserApplications(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-status', supabaseUserId],
    queryFn: () => getSubscriptionStatus(supabaseUserId!),
    enabled: !!supabaseUserId,
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: referralStats, refetch: refetchReferralStats } = useQuery({
    queryKey: ['referral-stats', supabaseUserId],
    queryFn: () => getReferralStats(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const totalApplications = applications.length;
  const interviewsScheduled = applications.filter((app: { status?: string }) => 
    app.status === 'interviewing' || app.status === 'interview_scheduled'
  ).length;

  const [user, setUser] = useState<UserProfile>(() => {
    // Always start with empty profile - data will be loaded from supabaseProfile
    const profile = buildProfileFromOnboarding(defaultOnboardingData);
    // Set default salary to INR with range 0 to 1 crore
    profile.salaryCurrency = 'INR';
    profile.salaryMinPref = 0;
    profile.salaryMaxPref = 10000000;
    return profile;
  });
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

  const [newSkill, setNewSkill] = useState('');
  const [bioText, setBioText] = useState(user.bio);
  const [headlineText, setHeadlineText] = useState(user.headline);
  const [locationText, setLocationText] = useState(user.location);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expSkills, setExpSkills] = useState('');
  const [expType, setExpType] = useState('Full-time');
  const [expMode, setExpMode] = useState('Onsite');
  const [expLocation, setExpLocation] = useState('');

  const handleExpDescriptionChange = (text: string) => {
    if (text.endsWith('\n') && !text.endsWith('\n\n')) {
      const lines = text.split('\n');
      const lastLine = lines[lines.length - 2];
      if (lastLine && !lastLine.trim().startsWith('•')) {
        lines[lines.length - 2] = '• ' + lastLine;
        setExpDescription(lines.join('\n') + '• ');
      } else {
        setExpDescription(text + '• ');
      }
    } else if (text === '' || text === '• ') {
      setExpDescription('');
    } else if (expDescription === '' && text.length > 0 && !text.startsWith('•')) {
      setExpDescription('• ' + text);
    } else {
      setExpDescription(text);
    }
  };

  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStartDate, setEduStartDate] = useState('');
  const [eduEndDate, setEduEndDate] = useState('');
  const [eduDescription, setEduDescription] = useState('');
  const [eduAchievements, setEduAchievements] = useState('');
  const [eduExtracurriculars, setEduExtracurriculars] = useState('');

  const handleEduDescriptionChange = (text: string) => {
    if (text.endsWith('\n') && !text.endsWith('\n\n')) {
      const lines = text.split('\n');
      const lastLine = lines[lines.length - 2];
      if (lastLine && !lastLine.trim().startsWith('•')) {
        lines[lines.length - 2] = '• ' + lastLine;
        setEduDescription(lines.join('\n') + '• ');
      } else {
        setEduDescription(text + '• ');
      }
    } else if (text === '' || text === '• ') {
      setEduDescription('');
    } else if (eduDescription === '' && text.length > 0 && !text.startsWith('•')) {
      setEduDescription('• ' + text);
    } else {
      setEduDescription(text);
    }
  };

  const handleEduAchievementsChange = (text: string) => {
    if (text.endsWith('\n') && !text.endsWith('\n\n')) {
      const lines = text.split('\n');
      const lastLine = lines[lines.length - 2];
      if (lastLine && !lastLine.trim().startsWith('•')) {
        lines[lines.length - 2] = '• ' + lastLine;
        setEduAchievements(lines.join('\n') + '• ');
      } else {
        setEduAchievements(text + '• ');
      }
    } else if (text === '' || text === '• ') {
      setEduAchievements('');
    } else if (eduAchievements === '' && text.length > 0 && !text.startsWith('•')) {
      setEduAchievements('• ' + text);
    } else {
      setEduAchievements(text);
    }
  };

  const handleEduExtracurricularsChange = (text: string) => {
    if (text.endsWith('\n') && !text.endsWith('\n\n')) {
      const lines = text.split('\n');
      const lastLine = lines[lines.length - 2];
      if (lastLine && !lastLine.trim().startsWith('•')) {
        lines[lines.length - 2] = '• ' + lastLine;
        setEduExtracurriculars(lines.join('\n') + '• ');
      } else {
        setEduExtracurriculars(text + '• ');
      }
    } else if (text === '' || text === '• ') {
      setEduExtracurriculars('');
    } else if (eduExtracurriculars === '' && text.length > 0 && !text.startsWith('•')) {
      setEduExtracurriculars('• ' + text);
    } else {
      setEduExtracurriculars(text);
    }
  };

  const [certName, setCertName] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [certSkills, setCertSkills] = useState('');

  const [achTitle, setAchTitle] = useState('');
  const [achIssuer, setAchIssuer] = useState('');
  const [achDate, setAchDate] = useState('');
  const [achDescription, setAchDescription] = useState('');

  const [coverLetter, setCoverLetter] = useState(user.coverLetter || '');

  const [workAuthStatus, setWorkAuthStatus] = useState(user.workAuthorizationStatus || '');
  const [jobReqs, setJobReqs] = useState(user.jobRequirements?.join(', ') || '');

  const [contactPhone, setContactPhone] = useState(user.phone);
  const [contactEmail, setContactEmail] = useState(user.email);
  const [contactLinkedin, setContactLinkedin] = useState(user.linkedinUrl ?? '');
  const [contactGithub, setContactGithub] = useState(user.githubUrl ?? '');

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedVeteranStatus, setSelectedVeteranStatus] = useState(user.veteranStatus || '');
  const [selectedDisabilityStatus, setSelectedDisabilityStatus] = useState(user.disabilityStatus || '');
  const [selectedEthnicity, setSelectedEthnicity] = useState(user.ethnicity || '');
  const [selectedRace, setSelectedRace] = useState(user.race || '');
  const [cityQuery, setCityQuery] = useState('');
  const [roleQuery, setRoleQuery] = useState('');
  const [skillQuery, setSkillQuery] = useState('');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universitySearch, setUniversitySearch] = useState('');
  const [workdayEmail, setWorkdayEmail] = useState(user.workdayEmail || '');
  const [workdayPassword, setWorkdayPassword] = useState(user.workdayPassword || '');
  const [showWorkdayPassword, setShowWorkdayPassword] = useState(false);
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const [jobleverEmail, setJobleverEmail] = useState(user.jobleverEmail || '');
  const [jobleverPassword, setJobleverPassword] = useState(user.jobleverPassword || '');
  const [showJobleverPassword, setShowJobleverPassword] = useState(false);
  const [greenhouseEmail, setGreenhouseEmail] = useState(user.greenhouseEmail || '');
  const [greenhousePassword, setGreenhousePassword] = useState(user.greenhousePassword || '');
  const [showGreenhousePassword, setShowGreenhousePassword] = useState(false);
  const [taleoEmail, setTaleoEmail] = useState(user.taleoEmail || '');
  const [taleoPassword, setTaleoPassword] = useState(user.taleoPassword || '');
  const [showTaleoPassword, setShowTaleoPassword] = useState(false);

const WORK_AUTH_OPTIONS = [
  'Yes, I am a U.S. Citizen',
  'Yes, I am a Permanent Resident (Green Card)',
  'Yes, I have H1B visa',
  'Yes, I have L1 visa',
  'Yes, I have OPT/CPT (F1 visa)',
  'Yes, I have TN visa',
  'Yes, I have O1 visa',
  'Yes, I have other work authorization',
  'No, I need sponsorship',
  'Prefer not to disclose',
];

const VETERAN_OPTIONS = [
  'I am not a protected veteran',
  'I am a veteran',
  'I am a disabled veteran',
  'I am a recently separated veteran',
  'I am an active duty wartime or campaign badge veteran',
  'I am an Armed Forces service medal veteran',
  'Prefer not to disclose',
];

const DISABILITY_OPTIONS = [
  'Yes, I have a disability (or previously had a disability)',
  'No, I do not have a disability',
  'Prefer not to disclose',
];

const ETHNICITY_OPTIONS = [
  'White',
  'Hispanic or Latino',
  'Black or African American',
  'Asian',
  'Southeast Asian',
  'Native Hawaiian or Other Pacific Islander',
  'American Indian or Alaska Native',
  'Prefer not to disclose',
];

const RACE_OPTIONS = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Native Hawaiian or Other Pacific Islander',
  'White',
  'Hispanic or Latino',
  'Two or More Races',
  'Prefer not to disclose',
];

const MAJOR_CITIES = [
  'San Francisco, CA, USA', 'New York, NY, USA', 'Seattle, WA, USA', 'Austin, TX, USA',
  'Los Angeles, CA, USA', 'Chicago, IL, USA', 'Boston, MA, USA', 'Denver, CO, USA',
  'Portland, OR, USA', 'Miami, FL, USA', 'Atlanta, GA, USA', 'Dallas, TX, USA',
  'Toronto, Canada', 'Vancouver, Canada', 'London, UK', 'Berlin, Germany',
  'Amsterdam, Netherlands', 'Paris, France', 'Barcelona, Spain', 'Dubai, UAE',
  'Bangalore, India', 'Mumbai, India', 'Singapore', 'Tokyo, Japan', 'Sydney, Australia',
];

  const { data: allCompaniesData = [], isLoading: isLoadingCompanies, error: companiesError } = useQuery({
    queryKey: ['all-companies-data'],
    queryFn: async () => {
      console.log('Fetching companies from Supabase...');
      const { data, error } = await supabase
        .from('companies')
        .select('name, logo_url')
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching companies:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Successfully fetched companies:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('First 3 companies:', data.slice(0, 3).map(c => c.name));
      } else {
        console.log('⚠️ Query succeeded but returned empty array');
      }
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
    enabled: true,
    retry: false,
  });

  useEffect(() => {
    if (companiesError) {
      console.error('Companies query error:', companiesError);
    }
  }, [companiesError]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: user.profileCompletion / 100,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, user.profileCompletion]);

  useEffect(() => {
    // Reset user state when supabaseUserId changes (user switch)
    if (!supabaseUserId) {
      console.log('[PROFILE] No supabaseUserId, resetting to default profile');
      setUser(buildProfileFromOnboarding(defaultOnboardingData));
      return;
    }

    // Load profile data for the current authenticated user
    if (supabaseProfile && supabaseProfile.id === supabaseUserId) {
      console.log('[PROFILE] Loading profile for user:', supabaseUserId);
      setUser(prev => ({ ...prev, ...supabaseProfile, favoriteCompanies: supabaseProfile.favoriteCompanies || [] }));
    } else if (supabaseUserId && !supabaseProfile) {
      // User is authenticated but profile hasn't loaded yet, use onboarding data
      console.log('[PROFILE] Using onboarding data for user:', supabaseUserId);
      setUser(buildProfileFromOnboarding(onboardingData));
    }
  }, [supabaseProfile, supabaseUserId, onboardingData]);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      console.log('Auto-syncing profile to Supabase');
      saveProfile(user);
    }, 3000);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [user, saveProfile]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const salaryConfig = getSalaryConfig(user.salaryCurrency);
  const currencyObj = CURRENCIES.find((c) => c.code === user.salaryCurrency);
  const currencySymbol = currencyObj?.symbol ?? '$';

  const formatSalary = useCallback((v: number) => {
    return formatSalaryForCurrency(v, user.salaryCurrency, currencySymbol);
  }, [user.salaryCurrency, currencySymbol]);

  const openAddSkillModal = useCallback(() => {
    setNewSkill('');
    setActiveModal('skill');
  }, []);

  const openBioModal = useCallback(() => {
    setBioText(user.bio);
    setActiveModal('bio');
  }, [user.bio]);

  const openHeadlineModal = useCallback(() => {
    setHeadlineText(user.headline);
    setActiveModal('headline');
  }, [user.headline]);

  const openLocationModal = useCallback(() => {
    setLocationText(user.location);
    setActiveModal('location');
  }, [user.location]);

  const openAvatarModal = useCallback(() => {
    setAvatarUrl(user.avatar);
    setActiveModal('avatar');
  }, [user.avatar]);

  const openContactModal = useCallback(() => {
    setContactPhone(user.phone);
    setContactEmail(user.email);
    setContactLinkedin(user.linkedinUrl ?? '');
    setContactGithub(user.githubUrl ?? '');
    setActiveModal('contact');
  }, [user.phone, user.email, user.linkedinUrl, user.githubUrl]);

  const openAddExperienceModal = useCallback(() => {
    setEditingExperience(null);
    setExpTitle('');
    setExpCompany('');
    setExpStartDate('');
    setExpEndDate('');
    setExpDescription('• ');
    setExpIsCurrent(false);
    setExpSkills('');
    setExpType('Full-time');
    setExpMode('Onsite');
    setExpLocation('');
    setActiveModal('experience');
  }, []);

  const openEditExperienceModal = useCallback((exp: WorkExperience) => {
    setEditingExperience(exp);
    setExpTitle(exp.title);
    setExpCompany(exp.company);
    setExpStartDate(exp.startDate);
    setExpEndDate(exp.endDate ?? '');
    setExpDescription(exp.description);
    setExpIsCurrent(exp.isCurrent);
    setExpSkills(exp.skills?.join(', ') ?? '');
    setExpType(exp.employmentType ?? 'Full-time');
    setExpMode(exp.workMode ?? 'Onsite');
    setExpLocation(exp.jobLocation ?? '');
    setActiveModal('experience');
  }, []);

  const openAddEducationModal = useCallback(() => {
    setEditingEducation(null);
    setEduInstitution('');
    setEduDegree('');
    setEduField('');
    setEduStartDate('');
    setEduEndDate('');
    setEduDescription('• ');
    setEduAchievements('• ');
    setEduExtracurriculars('• ');
    setUniversitySearch('');
    setShowUniversityDropdown(false);
    setActiveModal('education');
  }, []);

  const openEditEducationModal = useCallback((edu: Education) => {
    setEditingEducation(edu);
    setEduInstitution(edu.institution);
    setEduDegree(edu.degree);
    setEduField(edu.field);
    setEduStartDate(edu.startDate);
    setEduEndDate(edu.endDate);
    setEduDescription(edu.description ?? '');
    setEduAchievements(edu.achievements ?? '');
    setEduExtracurriculars(edu.extracurriculars ?? '');
    setUniversitySearch(edu.institution);
    setShowUniversityDropdown(false);
    setActiveModal('education');
  }, []);

  const openAddCertificationModal = useCallback(() => {
    setEditingCertification(null);
    setCertName('');
    setCertOrg('');
    setCertUrl('');
    setCertSkills('');
    setActiveModal('certification');
  }, []);

  const openEditCertificationModal = useCallback((cert: Certification) => {
    setEditingCertification(cert);
    setCertName(cert.name);
    setCertOrg(cert.issuingOrganization);
    setCertUrl(cert.credentialUrl);
    setCertSkills(cert.skills.join(', '));
    setActiveModal('certification');
  }, []);

  const openAddAchievementModal = useCallback(() => {
    setEditingAchievement(null);
    setAchTitle('');
    setAchIssuer('');
    setAchDate('');
    setAchDescription('');
    setActiveModal('achievement');
  }, []);

  const openEditAchievementModal = useCallback((ach: Achievement) => {
    setEditingAchievement(ach);
    setAchTitle(ach.title);
    setAchIssuer(ach.issuer);
    setAchDate(ach.date);
    setAchDescription(ach.description ?? '');
    setActiveModal('achievement');
  }, []);

  const openCoverLetterModal = useCallback(() => {
    setCoverLetter(user.coverLetter || '');
    setActiveModal('coverletter');
  }, [user.coverLetter]);

  const openJobRequirementsModal = useCallback(() => {
    setWorkAuthStatus(user.workAuthorizationStatus || '');
    setJobReqs(user.jobRequirements?.join(', ') || '');
    setActiveModal('jobrequirements');
  }, [user.workAuthorizationStatus, user.jobRequirements]);

  const openDesiredRolesModal = useCallback(() => {
    setRoleQuery('');
    setActiveModal('desiredroles');
  }, []);

  const openPreferredCitiesModal = useCallback(() => {
    setCityQuery('');
    setActiveModal('preferredcities');
  }, []);

  const openWorkdayCredentialsModal = useCallback(() => {
    setWorkdayEmail(user.workdayEmail || '');
    setWorkdayPassword(user.workdayPassword || '');
    setShowWorkdayPassword(false);
    setJobleverEmail(user.jobleverEmail || '');
    setJobleverPassword(user.jobleverPassword || '');
    setShowJobleverPassword(false);
    setGreenhouseEmail(user.greenhouseEmail || '');
    setGreenhousePassword(user.greenhousePassword || '');
    setShowGreenhousePassword(false);
    setTaleoEmail(user.taleoEmail || '');
    setTaleoPassword(user.taleoPassword || '');
    setShowTaleoPassword(false);
    setActiveModal('workdaycredentials');
  }, [user.workdayEmail, user.workdayPassword, user.jobleverEmail, user.jobleverPassword, user.greenhouseEmail, user.greenhousePassword, user.taleoEmail, user.taleoPassword]);

  const openVeteranStatusModal = useCallback(() => {
    setSelectedVeteranStatus(user.veteranStatus || '');
    setActiveModal('veteranstatus');
  }, [user.veteranStatus]);

  const openDisabilityStatusModal = useCallback(() => {
    setSelectedDisabilityStatus(user.disabilityStatus || '');
    setActiveModal('disabilitystatus');
  }, [user.disabilityStatus]);

  const openEthnicityModal = useCallback(() => {
    setSelectedEthnicity(user.ethnicity || '');
    setActiveModal('ethnicity');
  }, [user.ethnicity]);

  const openRaceModal = useCallback(() => {
    setSelectedRace(user.race || '');
    setActiveModal('race');
  }, [user.race]);

  const handleSaveSkill = useCallback(() => {
    if (!newSkill.trim()) return;
    if (user.skills.length >= 30) {
      Alert.alert('Limit Reached', 'You can add up to 30 skills.');
      return;
    }
    setUser((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill.trim()],
    }));
    setNewSkill('');
    setSkillQuery('');
    setActiveModal(null);
  }, [newSkill, user.skills.length]);

  const handleRemoveSkill = useCallback((idx: number) => {
    setUser((prev) => {
      const skillToRemove = prev.skills[idx];
      return {
        ...prev,
        skills: prev.skills.filter((_, i) => i !== idx),
        topSkills: prev.topSkills.filter((s) => s !== skillToRemove),
      };
    });
  }, []);

  const handleToggleTopSkill = useCallback((skill: string) => {
    setUser((prev) => {
      if (prev.topSkills.includes(skill)) {
        return { ...prev, topSkills: prev.topSkills.filter((s) => s !== skill) };
      }
      if (prev.topSkills.length >= 5) {
        Alert.alert('Limit Reached', 'You can select up to 5 top skills. Remove one first.');
        return prev;
      }
      return { ...prev, topSkills: [...prev.topSkills, skill] };
    });
  }, []);

  const handleSaveBio = useCallback(() => {
    setUser((prev) => ({ ...prev, bio: bioText }));
    setActiveModal(null);
  }, [bioText]);

  const handleSaveHeadline = useCallback(() => {
    if (!headlineText.trim()) return;
    setUser((prev) => ({ ...prev, headline: headlineText.trim() }));
    setActiveModal(null);
  }, [headlineText]);

  const handleSaveLocation = useCallback(() => {
    if (!locationText.trim()) return;
    setUser((prev) => ({ ...prev, location: locationText.trim() }));
    setActiveModal(null);
  }, [locationText]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  }, []);

  const uploadAvatar = async (uri: string) => {
    if (!supabaseUserId) {
      Alert.alert('Error', 'You must be logged in to upload a profile picture.');
      return;
    }
    
    setIsUploadingAvatar(true);
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${supabaseUserId}/${fileName}`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const formData = new FormData();
      formData.append('', {
        uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      const uploadUrl = getStorageUploadUrl('profile-pictures', filePath);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      await supabase.from('profiles').upsert({
        id: supabaseUserId,
        avatar_url: filePath,
        updated_at: new Date().toISOString(),
      });

      const publicUrl = getProfilePictureUrl(filePath);
      setUser((prev) => ({ ...prev, avatar: publicUrl }));
      setAvatarUrl(publicUrl);
      await refetchProfile();
      Alert.alert('Success', 'Profile picture updated!');
      setActiveModal(null);
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      Alert.alert('Upload Failed', `Could not upload profile picture: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAvatar = useCallback(() => {
    if (!avatarUrl.trim()) return;
    setUser((prev) => ({ ...prev, avatar: avatarUrl.trim() }));
    setActiveModal(null);
  }, [avatarUrl]);

  const handleSaveContact = useCallback(() => {
    setUser((prev) => ({
      ...prev,
      phone: contactPhone.trim(),
      linkedinUrl: contactLinkedin.trim() || undefined,
      githubUrl: contactGithub.trim() || undefined,
    }));
    setActiveModal(null);
  }, [contactPhone, contactLinkedin, contactGithub]);

  const handleSaveExperience = useCallback(() => {
    if (!expTitle.trim() || !expCompany.trim()) {
      Alert.alert('Required', 'Please fill in title and company');
      return;
    }
    const exp: WorkExperience = {
      id: editingExperience?.id ?? `e${Date.now()}`,
      title: expTitle.trim(),
      company: expCompany.trim(),
      startDate: expStartDate.trim(),
      endDate: expIsCurrent ? null : expEndDate.trim(),
      isCurrent: expIsCurrent,
      description: expDescription.trim(),
      skills: expSkills.split(',').map((s) => s.trim()).filter(Boolean),
      employmentType: expType,
      workMode: expMode,
      jobLocation: expMode === 'Remote' ? 'Remote' : expLocation.trim(),
    };
    setUser((prev) => {
      if (editingExperience) {
        return {
          ...prev,
          experience: prev.experience.map((e) => (e.id === editingExperience.id ? exp : e)),
        };
      }
      return { ...prev, experience: [...prev.experience, exp] };
    });
    setActiveModal(null);
  }, [expTitle, expCompany, expStartDate, expEndDate, expDescription, expIsCurrent, editingExperience, expSkills, expType, expMode, expLocation]);

  const handleSaveEducation = useCallback(() => {
    if (!eduInstitution.trim() || !eduDegree.trim()) {
      Alert.alert('Required', 'Please fill in institution and degree');
      return;
    }
    const edu: Education = {
      id: editingEducation?.id ?? `ed${Date.now()}`,
      institution: eduInstitution.trim(),
      degree: eduDegree.trim(),
      field: eduField.trim(),
      startDate: eduStartDate.trim(),
      endDate: eduEndDate.trim(),
      description: eduDescription.trim() || undefined,
      achievements: eduAchievements.trim() || undefined,
      extracurriculars: eduExtracurriculars.trim() || undefined,
    };
    setUser((prev) => {
      if (editingEducation) {
        return {
          ...prev,
          education: prev.education.map((e) => (e.id === editingEducation.id ? edu : e)),
        };
      }
      return { ...prev, education: [...prev.education, edu] };
    });
    setActiveModal(null);
  }, [eduInstitution, eduDegree, eduField, eduStartDate, eduEndDate, eduDescription, eduAchievements, eduExtracurriculars, editingEducation]);

  const handleSaveCertification = useCallback(() => {
    if (!certName.trim() || !certOrg.trim()) {
      Alert.alert('Required', 'Please fill in the certification name and organization');
      return;
    }
    const cert: Certification = {
      id: editingCertification?.id ?? `c${Date.now()}`,
      name: certName.trim(),
      issuingOrganization: certOrg.trim(),
      credentialUrl: certUrl.trim(),
      skills: certSkills.split(',').map((s) => s.trim()).filter(Boolean),
    };
    setUser((prev) => {
      if (editingCertification) {
        return {
          ...prev,
          certifications: prev.certifications.map((c) => (c.id === editingCertification.id ? cert : c)),
        };
      }
      return { ...prev, certifications: [...prev.certifications, cert] };
    });
    setActiveModal(null);
  }, [certName, certOrg, certUrl, certSkills, editingCertification]);

  const handleSaveAchievement = useCallback(() => {
    if (!achTitle.trim() || !achIssuer.trim()) {
      Alert.alert('Required', 'Please fill in the title and issuer');
      return;
    }
    const ach: Achievement = {
      id: editingAchievement?.id ?? `ach${Date.now()}`,
      title: achTitle.trim(),
      issuer: achIssuer.trim(),
      date: achDate.trim(),
      description: achDescription.trim() || undefined,
    };
    setUser((prev) => {
      if (editingAchievement) {
        return {
          ...prev,
          achievements: prev.achievements.map((a) => (a.id === editingAchievement.id ? ach : a)),
        };
      }
      return { ...prev, achievements: [...prev.achievements, ach] };
    });
    setActiveModal(null);
  }, [achTitle, achIssuer, achDate, achDescription, editingAchievement]);

  const handleSaveCoverLetter = useCallback(() => {
    setUser((prev) => ({ ...prev, coverLetter: coverLetter }));
    setActiveModal(null);
  }, [coverLetter]);

  const handleSaveJobRequirements = useCallback(() => {
    setUser((prev) => ({
      ...prev,
      workAuthorizationStatus: workAuthStatus.trim() || undefined,
      jobRequirements: jobReqs.split(',').map(r => r.trim()).filter(Boolean),
    }));
    setActiveModal(null);
  }, [workAuthStatus, jobReqs]);

  const handleSaveVeteranStatus = useCallback(() => {
    setUser((prev) => ({ ...prev, veteranStatus: selectedVeteranStatus || undefined }));
    setActiveModal(null);
  }, [selectedVeteranStatus]);

  const handleSaveDisabilityStatus = useCallback(() => {
    setUser((prev) => ({ ...prev, disabilityStatus: selectedDisabilityStatus || undefined }));
    setActiveModal(null);
  }, [selectedDisabilityStatus]);

  const handleSaveEthnicity = useCallback(() => {
    setUser((prev) => ({ ...prev, ethnicity: selectedEthnicity || undefined }));
    setActiveModal(null);
  }, [selectedEthnicity]);

  const handleSaveRace = useCallback(() => {
    setUser((prev) => ({ ...prev, race: selectedRace || undefined }));
    setActiveModal(null);
  }, [selectedRace]);

  const handleSaveWorkdayCredentials = useCallback(() => {
    setUser((prev) => ({ 
      ...prev, 
      workdayEmail: workdayEmail.trim() || undefined, 
      workdayPassword: workdayPassword.trim() || undefined,
      jobleverEmail: jobleverEmail.trim() || undefined,
      jobleverPassword: jobleverPassword.trim() || undefined,
      greenhouseEmail: greenhouseEmail.trim() || undefined,
      greenhousePassword: greenhousePassword.trim() || undefined,
      taleoEmail: taleoEmail.trim() || undefined,
      taleoPassword: taleoPassword.trim() || undefined,
    }));
    setActiveModal(null);
  }, [workdayEmail, workdayPassword, jobleverEmail, jobleverPassword, greenhouseEmail, greenhousePassword, taleoEmail, taleoPassword]);

  const handleToggleDesiredRole = useCallback((role: string) => {
    setUser((prev) => {
      const roles = prev.desiredRoles || [];
      if (roles.includes(role)) {
        return { ...prev, desiredRoles: roles.filter(r => r !== role) };
      }
      return { ...prev, desiredRoles: [...roles, role] };
    });
  }, []);

  const handleTogglePreferredCity = useCallback((city: string) => {
    setUser((prev) => {
      const cities = prev.preferredCities || [];
      if (cities.includes(city)) {
        return { ...prev, preferredCities: cities.filter(c => c !== city) };
      }
      return { ...prev, preferredCities: [...cities, city] };
    });
  }, []);

  const handleToggleJobPref = useCallback((pref: string) => {
    setUser((prev) => {
      if (prev.jobPreferences.includes(pref)) {
        return { ...prev, jobPreferences: prev.jobPreferences.filter((p) => p !== pref) };
      }
      return { ...prev, jobPreferences: [...prev.jobPreferences, pref] };
    });
  }, []);

  const handleToggleWorkMode = useCallback((mode: string) => {
    setUser((prev) => {
      if (prev.workModePreferences.includes(mode)) {
        return { ...prev, workModePreferences: prev.workModePreferences.filter((m) => m !== mode) };
      }
      return { ...prev, workModePreferences: [...prev.workModePreferences, mode] };
    });
  }, []);

  const handleSalaryChange = useCallback((low: number, high: number) => {
    setUser((prev) => ({ ...prev, salaryMinPref: low, salaryMaxPref: high }));
  }, []);

  const handleCurrencyChange = useCallback((code: string) => {
    const config = getSalaryConfig(code);
    setUser((prev) => ({
      ...prev,
      salaryCurrency: code,
      salaryMinPref: config.min,
      salaryMaxPref: config.max,
    }));
    setShowCurrencyPicker(false);
  }, []);

  const handleToggleFavoriteCompany = useCallback((companyName: string) => {
    setUser((prev) => {
      const favs = prev.favoriteCompanies || [];
      if (favs.includes(companyName)) {
        return { ...prev, favoriteCompanies: favs.filter(c => c !== companyName) };
      }
      return { ...prev, favoriteCompanies: [...favs, companyName] };
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          console.log('User signed out, redirecting to welcome');
        },
      },
    ]);
  }, [logout]);

  const incompleteSteps = useMemo((): ProfileWizardStep[] => {
    const steps: ProfileWizardStep[] = [];
    if (user.topSkills.length === 0) steps.push('topskills');
    if (user.education.length === 0) steps.push('education');
    if (user.experience.length === 0) steps.push('experience');
    if (user.achievements.length === 0) steps.push('achievements');
    if (user.certifications.length === 0) steps.push('certifications');
    return steps;
  }, [user.topSkills, user.education, user.experience, user.achievements, user.certifications]);

  const initWizardStep = useCallback((step: ProfileWizardStep) => {
    if (step === 'topskills') {
      setSkillQuery('');
    } else if (step === 'education') {
      setEditingEducation(null);
      setEduInstitution(''); setEduDegree(''); setEduField('');
      setEduStartDate(''); setEduEndDate('');
      setEduDescription('• '); setEduAchievements('• '); setEduExtracurriculars('• ');
      setUniversitySearch(''); setShowUniversityDropdown(false);
    } else if (step === 'experience') {
      setEditingExperience(null);
      setExpTitle(''); setExpCompany(''); setExpStartDate(''); setExpEndDate('');
      setExpDescription('• '); setExpIsCurrent(false); setExpSkills('');
      setExpType('Full-time'); setExpMode('Onsite'); setExpLocation('');
    } else if (step === 'achievements') {
      setEditingAchievement(null);
      setAchTitle(''); setAchIssuer(''); setAchDate(''); setAchDescription('');
    } else if (step === 'certifications') {
      setEditingCertification(null);
      setCertName(''); setCertOrg(''); setCertUrl(''); setCertSkills('');
    }
  }, []);

  const openCompleteProfileWizard = useCallback(() => {
    if (incompleteSteps.length === 0) return;
    setWizardStepIndex(0);
    initWizardStep(incompleteSteps[0]);
    setActiveModal('completeprofile');
  }, [incompleteSteps, initWizardStep]);

  const handleWizardNext = useCallback(() => {
    const currentStep = incompleteSteps[wizardStepIndex];
    // Save current step inline (without closing modal)
    if (currentStep === 'education') {
      if (!eduInstitution.trim() || !eduDegree.trim()) {
        Alert.alert('Required', 'Please fill in institution and degree');
        return;
      }
      const edu: Education = {
        id: `ed${Date.now()}`, institution: eduInstitution.trim(), degree: eduDegree.trim(),
        field: eduField.trim(), startDate: eduStartDate.trim(), endDate: eduEndDate.trim(),
        description: eduDescription.trim() || undefined, achievements: eduAchievements.trim() || undefined,
        extracurriculars: eduExtracurriculars.trim() || undefined,
      };
      setUser(prev => ({ ...prev, education: [...prev.education, edu] }));
    } else if (currentStep === 'experience') {
      if (!expTitle.trim() || !expCompany.trim()) {
        Alert.alert('Required', 'Please fill in title and company');
        return;
      }
      const exp: WorkExperience = {
        id: `e${Date.now()}`, title: expTitle.trim(), company: expCompany.trim(),
        startDate: expStartDate.trim(), endDate: expIsCurrent ? null : expEndDate.trim(),
        isCurrent: expIsCurrent, description: expDescription.trim(),
        skills: expSkills.split(',').map(s => s.trim()).filter(Boolean),
        employmentType: expType, workMode: expMode,
        jobLocation: expMode === 'Remote' ? 'Remote' : expLocation.trim(),
      };
      setUser(prev => ({ ...prev, experience: [...prev.experience, exp] }));
    } else if (currentStep === 'achievements') {
      if (!achTitle.trim() || !achIssuer.trim()) {
        Alert.alert('Required', 'Please fill in the title and issuer');
        return;
      }
      const ach: Achievement = {
        id: `ach${Date.now()}`, title: achTitle.trim(), issuer: achIssuer.trim(),
        date: achDate.trim(), description: achDescription.trim() || undefined,
      };
      setUser(prev => ({ ...prev, achievements: [...prev.achievements, ach] }));
    } else if (currentStep === 'certifications') {
      if (!certName.trim() || !certOrg.trim()) {
        Alert.alert('Required', 'Please fill in the certification name and organization');
        return;
      }
      const cert: Certification = {
        id: `c${Date.now()}`, name: certName.trim(), issuingOrganization: certOrg.trim(),
        credentialUrl: certUrl.trim(), skills: certSkills.split(',').map(s => s.trim()).filter(Boolean),
      };
      setUser(prev => ({ ...prev, certifications: [...prev.certifications, cert] }));
    }
    // topskills are saved inline via toggles, no extra save needed

    if (wizardStepIndex < incompleteSteps.length - 1) {
      const nextIdx = wizardStepIndex + 1;
      setWizardStepIndex(nextIdx);
      initWizardStep(incompleteSteps[nextIdx]);
    } else {
      setActiveModal(null);
    }
  }, [wizardStepIndex, incompleteSteps, initWizardStep,
    eduInstitution, eduDegree, eduField, eduStartDate, eduEndDate, eduDescription, eduAchievements, eduExtracurriculars,
    expTitle, expCompany, expStartDate, expEndDate, expDescription, expIsCurrent, expSkills, expType, expMode, expLocation,
    achTitle, achIssuer, achDate, achDescription,
    certName, certOrg, certUrl, certSkills,
  ]);

  const handleWizardSkip = useCallback(() => {
    if (wizardStepIndex < incompleteSteps.length - 1) {
      const nextIdx = wizardStepIndex + 1;
      setWizardStepIndex(nextIdx);
      initWizardStep(incompleteSteps[nextIdx]);
    } else {
      setActiveModal(null);
    }
  }, [wizardStepIndex, incompleteSteps]);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setEditingExperience(null);
    setEditingEducation(null);
    setEditingCertification(null);
    setEditingAchievement(null);
    setShowUniversityDropdown(false);
    setUniversitySearch('');
  }, []);

  return (
    <TabTransitionWrapper routeName="profile">
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.brandHeader}>
        <Image source={require('@/assets/images/header.png')} style={styles.brandLogo} resizeMode="contain" />
      </View>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.secondary }]}>Profile</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.settingsButton, { backgroundColor: colors.surface }]}
            onPress={toggleTheme}
            testID="theme-toggle-btn"
          >
            {theme === 'dark' ? (
              <Sun size={22} color={colors.textSecondary} />
            ) : (
              <Moon size={22} color={colors.textSecondary} />
            )}
          </Pressable>
          <Pressable
            style={[styles.settingsButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/resume-management' as any)}
            testID="resume-btn"
          >
            <FileText size={22} color={colors.textSecondary} />
            {!supabaseProfile?.resumeUrl && (
              <View style={styles.resumeExclamation}>
                <Text style={styles.resumeExclamationText}>!</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.settingsButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/profile-preview' as any)}
            testID="profile-preview-btn"
          >
            <Eye size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.settingsButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/settings' as any)}
            testID="settings-btn"
          >
            <Settings size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={false} onRefresh={refetchProfile} tintColor={colors.primary} />}>
        <View style={[styles.profileCard, { backgroundColor: theme === 'dark' ? '#1E1E1E' : '#111111' }]}>
          <View style={styles.profileTop}>
            <Pressable onPress={openAvatarModal} style={styles.avatarWrapper}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
              <View style={styles.cameraOverlay}>
                <Camera size={14} color="#111111" />
              </View>
            </Pressable>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Pressable onPress={openHeadlineModal} style={styles.editableRow}>
                {user.headline ? (
                  <Text style={styles.profileHeadline} numberOfLines={1}>{user.headline}</Text>
                ) : (
                  <Text style={[styles.profileHeadline, { color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }]} numberOfLines={1}>Add a headline</Text>
                )}
                <Pencil size={12} color="rgba(255,255,255,0.4)" />
              </Pressable>
              <Pressable onPress={openLocationModal} style={styles.editableRow}>
                <MapPin size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.profileLocation}>{user.location}</Text>
                <Pencil size={12} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.bioSection} onPress={(e) => { e.stopPropagation(); openBioModal(); }}>
            {user.bio ? (
              <Text style={styles.bioText} numberOfLines={2}>{user.bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>Add a bio or one-liner...</Text>
            )}
            <Pencil size={14} color="rgba(255,255,255,0.4)" />
          </Pressable>

          <View style={styles.completionSection}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Profile Strength</Text>
              <Text style={styles.completionPercent}>{user.profileCompletion}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)' }]}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.completionHint}>Add a portfolio to reach 100%</Text>
          </View>
        </View>

        {incompleteSteps.length > 0 && (
          <Pressable
            style={[styles.completionPromptCard, { backgroundColor: theme === 'dark' ? '#FFFFFF' : colors.surface, borderColor: theme === 'dark' ? '#FFFFFF' : colors.borderLight }]}
            onPress={openCompleteProfileWizard}
          >
            <View style={styles.completionPromptHeader}>
              <Zap size={18} color={theme === 'dark' ? '#000000' : '#111111'} />
              <Text style={[styles.completionPromptTitle, { color: theme === 'dark' ? '#000000' : colors.textPrimary }]}>Complete Your Profile</Text>
              <ChevronRight size={18} color={theme === 'dark' ? '#666666' : colors.textTertiary} style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={[styles.completionPromptText, { color: theme === 'dark' ? '#444444' : colors.textSecondary }]}>
              {incompleteSteps.length} section{incompleteSteps.length > 1 ? 's' : ''} left — tap to finish up real quick ⚡
            </Text>
          </Pressable>
        )}

        {subscriptionData?.subscription_type === 'free' ? (
          <Pressable
            style={styles.premiumCard}
            onPress={() => router.push('/premium' as any)}
          >
            <View style={styles.premiumIcon}>
              <Crown size={22} color="#FFD700" />
            </View>
            <View style={styles.premiumContent}>
              <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumSubtext}>Get more matches and priority visibility</Text>
            </View>
            <ChevronRight size={18} color="#FFD700" />
          </Pressable>
        ) : (
          <Pressable 
            style={[
              styles.subscriptionBadge,
              { backgroundColor: subscriptionData?.subscription_type === 'pro' ? '#FF9800' : '#9C27B0' }
            ]}
            onPress={() => router.push('/premium' as any)}
          >
            <Crown size={20} color="#FFFFFF" />
            <View style={styles.subscriptionBadgeContent}>
              <Text style={styles.subscriptionBadgeTitle}>
                You are a {subscriptionData?.subscription_type === 'pro' ? 'Pro' : 'Premium'} User
              </Text>
              <Text style={styles.subscriptionBadgeSubtext}>
                {subscriptionData?.applications_remaining || 0} applications remaining this month
              </Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" />
          </Pressable>
        )}

        <Pressable
          style={styles.shareCard}
          onPress={async () => {
            if (!referralStats?.referralCode && supabaseUserId) {
              const code = await createReferralCode(supabaseUserId, user.name);
              if (code) {
                await refetchReferralStats();
                setActiveModal('referral');
              }
            } else {
              setActiveModal('referral');
            }
          }}
        >
          <View style={styles.shareGradient}>
            <Share2 size={20} color="#FFFFFF" />
          </View>
          <View style={styles.shareContent}>
            <Text style={styles.shareTitle}>Share & Earn Free Swipes</Text>
            <Text style={styles.shareSubtext}>Invite friends and get 5 free swipes per registration</Text>
          </View>
          <View style={styles.shareBadge}>
            <Text style={styles.shareBadgeText}>FREE</Text>
          </View>
        </Pressable>

        <View style={[styles.statsGrid, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>{totalApplications}</Text>
            <Text style={[styles.statTitle, { color: colors.textTertiary }]}>Applied</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>{interviewsScheduled}</Text>
            <Text style={[styles.statTitle, { color: colors.textTertiary }]}>Interviews</Text>
          </View>
        </View>



        <Pressable style={[styles.contactCard, { backgroundColor: colors.surface }]} onPress={openContactModal}>
          <View style={styles.contactCardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Contact Information</Text>
            <Pencil size={14} color={colors.textTertiary} />
          </View>
          <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.contactIconBox, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#F5F5F5' }]}>
              <Phone size={16} color={theme === 'dark' ? colors.textPrimary : '#111111'} />
            </View>
            <Text style={[styles.contactText, { color: colors.textPrimary }]}>{user.phone}</Text>
          </View>
          <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.contactIconBox, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#F5F5F5' }]}>
              <Mail size={16} color={theme === 'dark' ? colors.textPrimary : '#111111'} />
            </View>
            <Text style={[styles.contactText, { color: colors.textPrimary }]}>{user.email}</Text>
          </View>
          {user.linkedinUrl ? (
            <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.contactIconBox, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#F5F5F5' }]}>
                <Linkedin size={16} color={theme === 'dark' ? colors.textPrimary : '#111111'} />
              </View>
              <Text style={[styles.contactText, { color: colors.textPrimary }]} numberOfLines={1}>{user.linkedinUrl}</Text>
            </View>
          ) : null}
          {user.githubUrl ? (
            <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.contactIconBox, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#F5F5F5' }]}>
                <Github size={16} color={theme === 'dark' ? colors.textPrimary : '#111111'} />
              </View>
              <Text style={[styles.contactText, { color: colors.textPrimary }]} numberOfLines={1}>{user.githubUrl}</Text>
            </View>
          ) : null}
        </Pressable>

        <View
          style={[styles.contactCard, { backgroundColor: colors.surface }]}
          onLayout={(e) => { favoriteCompaniesY.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Favourite Companies</Text>
            <Pressable style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={() => setActiveModal('favoritecompanies')}>
              <Plus size={16} color={colors.surface} />
            </Pressable>
          </View>
          {(user.favoriteCompanies && user.favoriteCompanies.length > 0) ? (
            <View style={styles.favoriteCompaniesWrap}>
              {user.favoriteCompanies.map((company, idx) => {
                const companyData = allCompaniesData.find((c: { name: string; logo_url: string | null }) => c.name === company);
                const logoUrl = companyData?.logo_url 
                  ? getCompanyLogoStorageUrl(companyData.logo_url)
                  : null;
                return (
                  <View key={idx} style={[styles.favoriteCompanyChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                    {logoUrl && <Image source={{ uri: logoUrl }} style={styles.favoriteCompanyLogo} />}
                    <Text style={[styles.favoriteCompanyText, { color: colors.textPrimary }]}>{company}</Text>
                    <Pressable onPress={() => handleToggleFavoriteCompany(company)}>
                      <X size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyFavoriteText, { color: colors.textTertiary }]}>No favorite companies added yet</Text>
          )}
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, marginTop: 20 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Desired Roles</Text>
            <Pressable style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={openDesiredRolesModal}>
              <Plus size={16} color={colors.surface} />
            </Pressable>
          </View>
          {(user.desiredRoles && user.desiredRoles.length > 0) ? (
            <View style={styles.chipGrid}>
              {user.desiredRoles.map((role, idx) => (
                <View key={idx} style={[styles.prefChip, styles.prefChipActive, { backgroundColor: colors.secondary, borderColor: colors.secondary }]}>
                  <Text style={[styles.prefChipText, styles.prefChipTextActive, { color: colors.surface }]}>{role}</Text>
                  <Pressable onPress={() => handleToggleDesiredRole(role)}>
                    <X size={12} color={colors.surface} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyFavoriteText, { color: colors.textTertiary }]}>No desired roles added yet</Text>
          )}
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Preferred Cities to Work</Text>
            <Pressable style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={openPreferredCitiesModal}>
              <Plus size={16} color={colors.surface} />
            </Pressable>
          </View>
          {(user.preferredCities && user.preferredCities.length > 0) ? (
            <View style={styles.chipGrid}>
              {user.preferredCities.map((city, idx) => (
                <View key={idx} style={[styles.prefChip, styles.prefChipActive, { backgroundColor: colors.secondary, borderColor: colors.secondary }]}>
                  <MapPin size={12} color={colors.surface} />
                  <Text style={[styles.prefChipText, styles.prefChipTextActive, { color: colors.surface }]}>{city}</Text>
                  <Pressable onPress={() => handleTogglePreferredCity(city)}>
                    <X size={12} color={colors.surface} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyFavoriteText, { color: colors.textTertiary }]}>No preferred cities added yet</Text>
          )}
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Job Type Preferences</Text>
          </View>
          <View style={styles.chipGrid}>
            {JOB_TYPE_OPTIONS.map((pref) => {
              const selected = user.jobPreferences.includes(pref);
              return (
                <Pressable
                  key={pref}
                  style={[styles.prefChip, { backgroundColor: selected ? colors.secondary : colors.background, borderColor: selected ? colors.secondary : colors.borderLight }]}
                  onPress={() => handleToggleJobPref(pref)}
                >
                  {selected && <Check size={14} color={colors.surface} />}
                  <Text style={[styles.prefChipText, { color: selected ? colors.surface : colors.textPrimary }]}>{pref}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Work Mode Preferences</Text>
          </View>
          <View style={styles.chipGrid}>
            {WORK_MODE_OPTIONS.map((mode) => {
              const selected = user.workModePreferences.includes(mode);
              return (
                <Pressable
                  key={mode}
                  style={[styles.prefChip, { backgroundColor: selected ? colors.secondary : colors.background, borderColor: selected ? colors.secondary : colors.borderLight }]}
                  onPress={() => handleToggleWorkMode(mode)}
                >
                  {selected && <Check size={14} color={colors.surface} />}
                  <Text style={[styles.prefChipText, { color: selected ? colors.surface : colors.textPrimary }]}>{mode}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Salary Preferences</Text>
            <Pressable style={[styles.currencyBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => setShowCurrencyPicker(true)}>
              <Text style={[styles.currencyBtnText, { color: colors.textPrimary }]}>{user.salaryCurrency}</Text>
              <ChevronDown size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={[styles.salarySliderContainer, { backgroundColor: colors.surface }]}>
            <RangeSlider
              min={salaryConfig.min}
              max={salaryConfig.max}
              step={salaryConfig.step}
              low={user.salaryMinPref}
              high={user.salaryMaxPref}
              onChange={handleSalaryChange}
              formatLabel={formatSalary}
            />
          </View>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Top Skills</Text>
            <Text style={[styles.topSkillHint, { color: colors.textTertiary }]}>{user.topSkills.length}/5</Text>
          </View>
          <Text style={[styles.topSkillSubtext, { color: colors.textTertiary }]}>Tap to toggle top skill status</Text>
          <View style={styles.skillsWrap}>
            {user.skills.map((skill, idx) => {
              const isTop = user.topSkills.includes(skill);
              return (
                <Pressable
                  key={idx}
                  style={[styles.skillTag, { backgroundColor: isTop ? (theme === 'dark' ? '#3A2F1B' : '#FFF8E1') : colors.secondary }, isTop && { borderWidth: 2, borderColor: '#D4A017' }]}
                  onPress={() => handleToggleTopSkill(skill)}
                  onLongPress={() => handleRemoveSkill(idx)}
                >
                  {isTop && <Star size={12} color="#D4A017" />}
                  <Text style={[styles.skillTagText, { color: isTop ? '#8B6914' : colors.textInverse }]}>{skill}</Text>
                </Pressable>
              );
            })}
            <Pressable style={[styles.addSkillBtn, { backgroundColor: colors.secondary }]} onPress={openAddSkillModal} testID="add-skill-btn">
              <Plus size={16} color={colors.surface} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Experience</Text>
            <Pressable style={[styles.addButton, { backgroundColor: theme === 'dark' ? colors.secondary : '#FFFFFF' }]} onPress={openAddExperienceModal} testID="add-experience-btn">
              <Plus size={16} color={theme === 'dark' ? colors.surface : '#111111'} />
            </Pressable>
          </View>
          {user.experience.map((exp) => (
            <Pressable key={exp.id} style={styles.experienceItem} onPress={() => openEditExperienceModal(exp)}>
              <View style={[styles.expIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Briefcase size={18} color="#FFFFFF" />
              </View>
              <View style={styles.expContent}>
                <Text style={[styles.expTitle, { color: '#FFFFFF' }]}>{exp.title}</Text>
                <Text style={[styles.expCompany, { color: 'rgba(255,255,255,0.6)' }]}>{exp.company}</Text>
                <Text style={[styles.expDate, { color: 'rgba(255,255,255,0.4)' }]}>
                  {exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}
                </Text>
                {exp.employmentType || exp.workMode ? (
                  <View style={styles.expTagsRow}>
                    {exp.employmentType ? (
                      <View style={[styles.expTagChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}><Text style={[styles.expTagText, { color: 'rgba(255,255,255,0.7)' }]}>{exp.employmentType}</Text></View>
                    ) : null}
                    {exp.workMode ? (
                      <View style={[styles.expTagChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}><Text style={[styles.expTagText, { color: 'rgba(255,255,255,0.7)' }]}>{exp.workMode}</Text></View>
                    ) : null}
                  </View>
                ) : null}
                {exp.jobLocation ? (
                  <View style={styles.expLocationRow}>
                    <MapPin size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={[styles.expDate, { color: 'rgba(255,255,255,0.5)' }]}>{exp.jobLocation}</Text>
                  </View>
                ) : null}
                {exp.description ? <Text style={[styles.expDesc, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={3}>{exp.description}</Text> : null}
                {exp.skills && exp.skills.length > 0 ? (
                  <View style={styles.expSkillsRow}>
                    {exp.skills.map((skill, idx) => (
                      <View key={idx} style={[styles.expTagChip, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={[styles.expTagText, { color: 'rgba(255,255,255,0.8)' }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <Pencil size={14} color="rgba(255,255,255,0.4)" />
            </Pressable>
          ))}
        </View>

        <View style={[styles.section, styles.borderedSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Education</Text>
            <Pressable style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={openAddEducationModal} testID="add-education-btn">
              <Plus size={16} color={colors.surface} />
            </Pressable>
          </View>
          {user.education.map((edu) => (
            <Pressable key={edu.id} style={styles.experienceItem} onPress={() => openEditEducationModal(edu)}>
              <View style={[styles.expIcon, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#EEEEEE' }]}>
                <GraduationCap size={18} color={colors.accent} />
              </View>
              <View style={styles.expContent}>
                <Text style={[styles.expTitle, { color: colors.secondary }]}>{edu.degree} in {edu.field}</Text>
                <Text style={[styles.expCompany, { color: colors.textSecondary }]}>{edu.institution}</Text>
                <Text style={[styles.expDate, { color: colors.textTertiary }]}>{edu.startDate} — {edu.endDate}</Text>
                {edu.description ? <Text style={[styles.expDesc, { color: colors.textTertiary }]} numberOfLines={3}>{edu.description}</Text> : null}
                {edu.achievements ? (
                  <View style={styles.eduDetailRow}>
                    <Text style={[styles.eduDetailLabel, { color: colors.textSecondary }]}>Achievements: </Text>
                    <Text style={[styles.eduDetailText, { color: colors.textSecondary }]} numberOfLines={2}>{edu.achievements}</Text>
                  </View>
                ) : null}
                {edu.extracurriculars ? (
                  <View style={styles.eduDetailRow}>
                    <Text style={[styles.eduDetailLabel, { color: colors.textSecondary }]}>Extracurriculars: </Text>
                    <Text style={[styles.eduDetailText, { color: colors.textSecondary }]} numberOfLines={2}>{edu.extracurriculars}</Text>
                  </View>
                ) : null}
              </View>
              <Pencil size={14} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Achievements & Honors</Text>
            <Pressable style={[styles.addButton, { backgroundColor: theme === 'dark' ? colors.secondary : '#FFFFFF' }]} onPress={openAddAchievementModal} testID="add-achievement-btn">
              <Plus size={16} color={theme === 'dark' ? colors.surface : '#111111'} />
            </Pressable>
          </View>
          {user.achievements.map((ach) => (
            <Pressable key={ach.id} style={styles.experienceItem} onPress={() => openEditAchievementModal(ach)}>
              <View style={[styles.expIcon, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                <Trophy size={18} color="#FFD700" />
              </View>
              <View style={styles.expContent}>
                <Text style={[styles.expTitle, { color: '#FFFFFF' }]}>{ach.title}</Text>
                <Text style={[styles.expCompany, { color: 'rgba(255,255,255,0.6)' }]}>{ach.issuer}</Text>
                <Text style={[styles.expDate, { color: 'rgba(255,255,255,0.4)' }]}>{ach.date}</Text>
                {ach.description ? <Text style={[styles.expDesc, { color: 'rgba(255,255,255,0.5)' }]} numberOfLines={2}>{ach.description}</Text> : null}
              </View>
              <Pencil size={14} color="rgba(255,255,255,0.4)" />
            </Pressable>
          ))}
        </View>

        <View style={[styles.section, styles.borderedSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Licenses & Certifications</Text>
            <Pressable style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={openAddCertificationModal} testID="add-cert-btn">
              <Plus size={16} color={colors.surface} />
            </Pressable>
          </View>
          {user.certifications.map((cert) => (
            <Pressable key={cert.id} style={styles.experienceItem} onPress={() => openEditCertificationModal(cert)}>
              <View style={[styles.expIcon, { backgroundColor: theme === 'dark' ? colors.warningSoft : '#FFF3E0' }]}>
                <Award size={18} color={colors.warning} />
              </View>
              <View style={styles.expContent}>
                <Text style={[styles.expTitle, { color: colors.secondary }]}>{cert.name}</Text>
                <Text style={[styles.expCompany, { color: colors.textSecondary }]}>{cert.issuingOrganization}</Text>
                {cert.credentialUrl ? (
                  <View style={styles.credUrlRow}>
                    <Link2 size={11} color={colors.accent} />
                    <Text style={[styles.credUrlText, { color: colors.accent }]} numberOfLines={1}>{cert.credentialUrl}</Text>
                  </View>
                ) : null}
                {cert.skills.length > 0 && (
                  <View style={styles.certSkillsRow}>
                    {cert.skills.map((s, i) => (
                      <View key={i} style={[styles.certSkillChip, { backgroundColor: colors.accentSoft }]}>
                        <Text style={[styles.certSkillChipText, { color: colors.accent }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Pencil size={14} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          {[
            { icon: Star, label: 'Saved Jobs', color: colors.warning, onPress: () => router.push('/saved-jobs' as any) },
            { icon: FileText, label: 'Resume', color: colors.accent, onPress: () => router.push('/resume-management' as any) },
          ].map((item, idx) => (
            <Pressable key={idx} style={({ pressed }) => [styles.menuItem, { borderBottomColor: colors.borderLight }, pressed && { backgroundColor: colors.background }]} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <item.icon size={20} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <ChevronRight size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.demoSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.demoHeader}>
            <FileText size={16} color={colors.textSecondary} />
            <Text style={[styles.demoHeaderTitle, { color: colors.secondary }]}>Cover Letter</Text>
            <Pressable onPress={openCoverLetterModal} style={{ marginLeft: 'auto' }}>
              <Pencil size={14} color={colors.textTertiary} />
            </Pressable>
          </View>
          {user.coverLetter ? (
            <Text style={[styles.coverLetterText, { color: colors.textSecondary }]} numberOfLines={4}>{user.coverLetter}</Text>
          ) : (
            <Text style={[styles.coverLetterPlaceholder, { color: colors.textTertiary }]}>Add a cover letter to personalize your applications...</Text>
          )}
        </View>

        <Pressable style={[styles.demoSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={openJobRequirementsModal}>
          <View style={styles.demoHeader}>
            <ShieldCheck size={16} color={colors.textSecondary} />
            <Text style={[styles.demoHeaderTitle, { color: colors.secondary }]}>Job Requirements</Text>
            <Pressable onPress={openJobRequirementsModal} style={{ marginLeft: 'auto' }}>
              <Pencil size={14} color={colors.textTertiary} />
            </Pressable>
          </View>
          <Text style={[styles.demoNote, { color: colors.textTertiary }]}>Your work authorization and visa status</Text>
          {user.workAuthorizationStatus ? (
            <View style={[styles.demoItem, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>Work Authorization</Text>
              <Text style={[styles.demoValue, { color: colors.textPrimary }]}>{user.workAuthorizationStatus}</Text>
            </View>
          ) : (
            <Text style={[styles.coverLetterPlaceholder, { color: colors.textTertiary }]}>Add work authorization status...</Text>
          )}
          {user.jobRequirements && user.jobRequirements.length > 0 ? (
            <View style={[styles.demoItem, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>Requirements</Text>
              <View style={styles.chipGrid}>
                {user.jobRequirements.map((req, idx) => (
                  <View key={idx} style={[styles.prefChip, { backgroundColor: '#FFF9C4', borderColor: '#F57F17' }]}>
                    <Text style={[styles.prefChipText, { color: '#F57F17' }]}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Pressable>



        <View style={[styles.demoSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.demoHeader}>
            <Lock size={16} color={colors.textTertiary} />
            <Text style={[styles.demoHeaderTitle, { color: colors.secondary }]}>Equal Opportunity Information</Text>
          </View>
          <Text style={[styles.demoNote, { color: colors.textTertiary }]}>This information is confidential and voluntary</Text>
          
          <Pressable style={[styles.demoItem, { borderBottomColor: colors.borderLight }]} onPress={openVeteranStatusModal}>
            <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>Veteran Status</Text>
            <View style={styles.demoValueRow}>
              <Text style={[styles.demoValue, { color: colors.textPrimary }]}>{user.veteranStatus || 'Not specified'}</Text>
              <Pencil size={14} color={colors.textTertiary} />
            </View>
          </Pressable>

          <Pressable style={[styles.demoItem, { borderBottomColor: colors.borderLight }]} onPress={openDisabilityStatusModal}>
            <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>Disability Status</Text>
            <View style={styles.demoValueRow}>
              <Text style={[styles.demoValue, { color: colors.textPrimary }]}>{user.disabilityStatus || 'Not specified'}</Text>
              <Pencil size={14} color={colors.textTertiary} />
            </View>
          </Pressable>

          <Pressable style={[styles.demoItem, { borderBottomColor: colors.borderLight }]} onPress={openEthnicityModal}>
            <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>Ethnicity</Text>
            <View style={styles.demoValueRow}>
              <Text style={[styles.demoValue, { color: colors.textPrimary }]}>{user.ethnicity || 'Not specified'}</Text>
              <Pencil size={14} color={colors.textTertiary} />
            </View>
          </Pressable>

          <Pressable style={[styles.demoItem, { borderBottomColor: colors.borderLight }]} onPress={openRaceModal}>
            <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>Race</Text>
            <View style={styles.demoValueRow}>
              <Text style={[styles.demoValue, { color: colors.textPrimary }]}>{user.race || 'Not specified'}</Text>
              <Pencil size={14} color={colors.textTertiary} />
            </View>
          </Pressable>

          {user.gender ? (
            <View style={[styles.demoItem, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>Gender</Text>
              <Text style={[styles.demoValue, { color: colors.textPrimary }]}>{user.gender === 'prefer_not_to_say' ? 'Prefer not to say' : user.gender === 'male' ? 'Male' : 'Female'}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={activeModal === 'completeprofile'} animationType="fade" transparent>
        <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <View style={[wizStyles.overlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[wizStyles.card, { backgroundColor: colors.surface }]}>
              <View style={wizStyles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[wizStyles.stepCounter, { color: colors.textTertiary }]}>
                    {wizardStepIndex + 1} of {incompleteSteps.length}
                  </Text>
                  <Text style={[wizStyles.title, { color: colors.secondary }]}>
                    {incompleteSteps[wizardStepIndex] === 'topskills' && 'Top Skills'}
                    {incompleteSteps[wizardStepIndex] === 'education' && 'Education'}
                    {incompleteSteps[wizardStepIndex] === 'experience' && 'Work Experience'}
                    {incompleteSteps[wizardStepIndex] === 'achievements' && 'Achievements & Honors'}
                    {incompleteSteps[wizardStepIndex] === 'certifications' && 'Certifications'}
                  </Text>
                </View>
                <Pressable onPress={closeModal} style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}>
                  <X size={22} color={colors.textPrimary} />
                </Pressable>
              </View>
              <Text style={[wizStyles.helperText, { color: colors.textSecondary }]}>
                {WIZARD_HELPER_TEXT[incompleteSteps[wizardStepIndex]]}
              </Text>
              <View style={[wizStyles.progressTrack, { backgroundColor: colors.borderLight }]}>
                <View style={[wizStyles.progressFill, { width: `${((wizardStepIndex + 1) / incompleteSteps.length) * 100}%` }]} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={wizStyles.body} keyboardShouldPersistTaps="handled">
                {/* Top Skills Step */}
                {incompleteSteps[wizardStepIndex] === 'topskills' && (
                  <View>
                    <Text style={[styles.topSkillSubtext, { color: colors.textTertiary }]}>Tap to toggle top skill (max 5). Long-press to remove.</Text>
                    <View style={styles.skillsWrap}>
                      {user.skills.map((skill, idx) => {
                        const isTop = user.topSkills.includes(skill);
                        return (
                          <Pressable
                            key={idx}
                            style={[styles.skillTag, { backgroundColor: isTop ? (theme === 'dark' ? '#3A2F1B' : '#FFF8E1') : colors.secondary }, isTop && { borderWidth: 2, borderColor: '#D4A017' }]}
                            onPress={() => handleToggleTopSkill(skill)}
                            onLongPress={() => handleRemoveSkill(idx)}
                          >
                            {isTop && <Star size={12} color="#D4A017" />}
                            <Text style={[styles.skillTagText, { color: isTop ? '#8B6914' : colors.textInverse }]}>{skill}</Text>
                          </Pressable>
                        );
                      })}
                      <Pressable style={[styles.addSkillBtn, { backgroundColor: colors.secondary }]} onPress={openAddSkillModal}>
                        <Plus size={16} color={colors.surface} />
                      </Pressable>
                    </View>
                    <Text style={[wizStyles.selectionCount, { color: colors.textTertiary }]}>{user.topSkills.length}/5 selected</Text>
                  </View>
                )}
                {/* Education Step */}
                {incompleteSteps[wizardStepIndex] === 'education' && (
                  <View>
                    <Text style={styles.fieldLabel}>Institution *</Text>
                    <View style={styles.universityInputContainer}>
                      <TextInput style={styles.universityInput} placeholder="Select or type university" placeholderTextColor={Colors.textTertiary} value={universitySearch} onChangeText={(text) => { setUniversitySearch(text); setEduInstitution(text); setShowUniversityDropdown(true); }} onFocus={() => setShowUniversityDropdown(true)} />
                      <ChevronDown size={14} color={Colors.textTertiary} />
                    </View>
                    {showUniversityDropdown && (
                      <View style={styles.universityDropdown}>
                        <ScrollView style={styles.universityDropdownScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                          {universitySearch && !universities.some(u => u.toLowerCase() === universitySearch.toLowerCase()) && (
                            <Pressable style={styles.universityDropdownItem} onPress={() => { setEduInstitution(universitySearch); setShowUniversityDropdown(false); }}>
                              <Plus size={16} color={Colors.primary} />
                              <Text style={styles.universityDropdownItemTextAdd}>Add "{universitySearch}"</Text>
                            </Pressable>
                          )}
                          {universities.filter(u => !universitySearch || u.toLowerCase().includes(universitySearch.toLowerCase())).slice(0, 50).map(uni => (
                            <Pressable key={uni} style={styles.universityDropdownItem} onPress={() => { setEduInstitution(uni); setUniversitySearch(uni); setShowUniversityDropdown(false); }}>
                              <Text style={styles.universityDropdownItemText}>{uni}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    <Text style={styles.fieldLabel}>Degree *</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. Bachelor's" placeholderTextColor={Colors.textTertiary} value={eduDegree} onChangeText={setEduDegree} />
                    <Text style={styles.fieldLabel}>Field of Study</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. Computer Science" placeholderTextColor={Colors.textTertiary} value={eduField} onChangeText={setEduField} />
                    <View style={styles.dateRow}>
                      <View style={styles.dateField}><Text style={styles.fieldLabel}>Start Year</Text><TextInput style={styles.modalInput} placeholder="e.g. 2016" placeholderTextColor={Colors.textTertiary} value={eduStartDate} onChangeText={setEduStartDate} /></View>
                      <View style={styles.dateField}><Text style={styles.fieldLabel}>End Year</Text><TextInput style={styles.modalInput} placeholder="e.g. 2020" placeholderTextColor={Colors.textTertiary} value={eduEndDate} onChangeText={setEduEndDate} /></View>
                    </View>
                  </View>
                )}
                {/* Experience Step */}
                {incompleteSteps[wizardStepIndex] === 'experience' && (
                  <View>
                    <Text style={styles.fieldLabel}>Job Title *</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. Software Engineer" placeholderTextColor={Colors.textTertiary} value={expTitle} onChangeText={setExpTitle} />
                    <Text style={styles.fieldLabel}>Company *</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. Google" placeholderTextColor={Colors.textTertiary} value={expCompany} onChangeText={setExpCompany} />
                    <Text style={styles.fieldLabel}>Employment Type</Text>
                    <View style={styles.chipGrid}>
                      {EXP_TYPE_OPTIONS.map((t) => (
                        <Pressable key={t} style={[styles.prefChip, expType === t && styles.prefChipActive]} onPress={() => setExpType(t)}>
                          {expType === t && <Check size={12} color={Colors.surface} />}
                          <Text style={[styles.prefChipText, expType === t && styles.prefChipTextActive]}>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.dateRow}>
                      <View style={styles.dateField}><Text style={styles.fieldLabel}>Start Date</Text><TextInput style={styles.modalInput} placeholder="e.g. Jan 2023" placeholderTextColor={Colors.textTertiary} value={expStartDate} onChangeText={setExpStartDate} /></View>
                      <View style={styles.dateField}><Text style={styles.fieldLabel}>End Date</Text><TextInput style={[styles.modalInput, expIsCurrent && styles.inputDisabled]} placeholder="e.g. Dec 2024" placeholderTextColor={Colors.textTertiary} value={expIsCurrent ? 'Present' : expEndDate} onChangeText={setExpEndDate} editable={!expIsCurrent} /></View>
                    </View>
                    <Pressable style={styles.checkboxRow} onPress={() => setExpIsCurrent(!expIsCurrent)}>
                      <View style={[styles.checkbox, expIsCurrent && styles.checkboxActive]}>{expIsCurrent && <Check size={12} color={Colors.surface} />}</View>
                      <Text style={styles.checkboxLabel}>I currently work here</Text>
                    </Pressable>
                  </View>
                )}
                {/* Achievements Step */}
                {incompleteSteps[wizardStepIndex] === 'achievements' && (
                  <View>
                    <Text style={styles.fieldLabel}>Title *</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. Best Innovation Award" placeholderTextColor={Colors.textTertiary} value={achTitle} onChangeText={setAchTitle} />
                    <Text style={styles.fieldLabel}>Issuer/Organization *</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. TechCorp Hackathon" placeholderTextColor={Colors.textTertiary} value={achIssuer} onChangeText={setAchIssuer} />
                    <Text style={styles.fieldLabel}>Date</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. 2024" placeholderTextColor={Colors.textTertiary} value={achDate} onChangeText={setAchDate} />
                    <Text style={styles.fieldLabel}>Description</Text>
                    <TextInput style={[styles.modalInput, styles.modalTextArea]} placeholder="Describe this achievement..." placeholderTextColor={Colors.textTertiary} value={achDescription} onChangeText={setAchDescription} multiline numberOfLines={3} />
                  </View>
                )}
                {/* Certifications Step */}
                {incompleteSteps[wizardStepIndex] === 'certifications' && (
                  <View>
                    <Text style={styles.fieldLabel}>Certification Name *</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. AWS Solutions Architect" placeholderTextColor={Colors.textTertiary} value={certName} onChangeText={setCertName} />
                    <Text style={styles.fieldLabel}>Issuing Organization *</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. Amazon Web Services" placeholderTextColor={Colors.textTertiary} value={certOrg} onChangeText={setCertOrg} />
                    <Text style={styles.fieldLabel}>Credential URL</Text>
                    <TextInput style={styles.modalInput} placeholder="https://..." placeholderTextColor={Colors.textTertiary} value={certUrl} onChangeText={setCertUrl} autoCapitalize="none" />
                    <Text style={styles.fieldLabel}>Skills (comma-separated)</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. AWS, Cloud Architecture" placeholderTextColor={Colors.textTertiary} value={certSkills} onChangeText={setCertSkills} />
                  </View>
                )}
              </ScrollView>
              <View style={wizStyles.footer}>
                <Pressable style={[wizStyles.skipBtn, { borderColor: colors.borderLight }]} onPress={handleWizardSkip}>
                  <Text style={[wizStyles.skipBtnText, { color: colors.textSecondary }]}>Skip</Text>
                </Pressable>
                <Pressable style={wizStyles.nextBtn} onPress={handleWizardNext}>
                  <Text style={wizStyles.nextBtnText}>
                    {wizardStepIndex === incompleteSteps.length - 1 ? 'Done' : 'Next'}
                  </Text>
                  {wizardStepIndex < incompleteSteps.length - 1 && <ChevronRight size={16} color="#FFFFFF" />}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </BlurView>
      </Modal>

      <Modal visible={activeModal === 'skill'} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.secondary }]}>Add Skill</Text>
              <Pressable onPress={closeModal} style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}><X size={22} color={colors.textPrimary} /></Pressable>
            </View>
            <View style={[styles.roleSearchContainer, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
              <Search size={16} color={colors.textTertiary} />
              <TextInput
                style={[styles.roleSearchInput, { color: colors.textPrimary }]}
                placeholder="Search skills..."
                placeholderTextColor={colors.textTertiary}
                value={skillQuery}
                onChangeText={setSkillQuery}
                autoFocus
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.chipGrid}>
                {suggestedSkills
                  .filter((s) => !skillQuery || s.toLowerCase().includes(skillQuery.toLowerCase()))
                  .filter((s) => !user.skills.includes(s))
                  .slice(0, 20)
                  .map((skill) => (
                    <Pressable 
                      key={skill} 
                      style={styles.companySelectChip}
                      onPress={() => {
                        setUser((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
                        setSkillQuery('');
                      }}
                    >
                      <Text style={styles.companySelectText}>{skill}</Text>
                      <Plus size={14} color={Colors.textPrimary} />
                    </Pressable>
                  ))}
              </View>
              {skillQuery && !suggestedSkills.some(s => s.toLowerCase() === skillQuery.toLowerCase()) && (
                <Pressable 
                  style={[styles.companySelectChip, { marginTop: 12 }]}
                  onPress={() => {
                    setNewSkill(skillQuery);
                    handleSaveSkill();
                  }}
                >
                  <Plus size={14} color={Colors.textPrimary} />
                  <Text style={styles.companySelectText}>Add "{skillQuery}"</Text>
                </Pressable>
              )}
            </ScrollView>
            <Pressable style={styles.cityDoneBtn} onPress={closeModal}>
              <Text style={styles.cityDoneBtnText}>Done</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'bio'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Bio</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Write a short bio or one-liner..."
              placeholderTextColor={Colors.textTertiary}
              value={bioText}
              onChangeText={(t) => { if (t.length <= 500) setBioText(t); }}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <Text style={styles.charCount}>{bioText.length}/500</Text>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveBio}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>Save Bio</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'headline'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Headline</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Senior Software Engineer"
              placeholderTextColor={Colors.textTertiary}
              value={headlineText}
              onChangeText={(t) => { if (t.length <= 100) setHeadlineText(t); }}
              autoFocus
            />
            <Text style={styles.charCount}>{headlineText.length}/100</Text>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveHeadline}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>Save Headline</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'location'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Location</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <TextInput style={styles.modalInput} placeholder="e.g. New York, NY" placeholderTextColor={Colors.textTertiary} value={locationText} onChangeText={setLocationText} autoFocus />
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveLocation}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>Save Location</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'avatar'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Photo</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <View style={styles.avatarPreviewRow}><Image source={{ uri: avatarUrl }} style={styles.avatarPreview} /></View>
            <Pressable 
              style={[styles.modalSaveBtn, { backgroundColor: Colors.accent, marginBottom: 12 }]} 
              onPress={handlePickImage}
              disabled={isUploadingAvatar}
            >
              <Camera size={18} color={Colors.surface} />
              <Text style={styles.modalSaveBtnText}>
                {isUploadingAvatar ? 'Uploading...' : 'Choose from Gallery'}
              </Text>
            </Pressable>
            <Text style={styles.fieldLabel}>Or enter Photo URL</Text>
            <TextInput style={styles.modalInput} placeholder="https://..." placeholderTextColor={Colors.textTertiary} value={avatarUrl} onChangeText={setAvatarUrl} autoCapitalize="none" />
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveAvatar}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>Save Photo</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'contact'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Info</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput style={styles.modalInput} placeholder="+1 (555) 123-4567" placeholderTextColor={Colors.textTertiary} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={[styles.modalInput, { backgroundColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <Lock size={14} color={Colors.textTertiary} />
                <Text style={{ fontSize: 15, color: Colors.textSecondary, flex: 1 }} numberOfLines={1}>{user.email}</Text>
              </View>
              <Text style={{ fontSize: 11, color: Colors.textTertiary, marginTop: -8, marginBottom: 12 }}>Email is auto-generated and cannot be changed</Text>
              <Text style={styles.fieldLabel}>LinkedIn Profile</Text>
              <TextInput style={styles.modalInput} placeholder="https://linkedin.com/in/..." placeholderTextColor={Colors.textTertiary} value={contactLinkedin} onChangeText={setContactLinkedin} autoCapitalize="none" />
              <Text style={styles.fieldLabel}>GitHub Profile</Text>
              <TextInput style={styles.modalInput} placeholder="https://github.com/..." placeholderTextColor={Colors.textTertiary} value={contactGithub} onChangeText={setContactGithub} autoCapitalize="none" />
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveContact}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>Save Contact Info</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'experience'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingExperience ? 'Edit Experience' : 'Add Experience'}</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Job Title *</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Software Engineer" placeholderTextColor={Colors.textTertiary} value={expTitle} onChangeText={setExpTitle} />
              <Text style={styles.fieldLabel}>Company *</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Google" placeholderTextColor={Colors.textTertiary} value={expCompany} onChangeText={setExpCompany} />
              <Text style={styles.fieldLabel}>Employment Type</Text>
              <View style={styles.chipGrid}>
                {EXP_TYPE_OPTIONS.map((t) => (
                  <Pressable key={t} style={[styles.prefChip, expType === t && styles.prefChipActive]} onPress={() => setExpType(t)}>
                    {expType === t && <Check size={12} color={Colors.surface} />}
                    <Text style={[styles.prefChipText, expType === t && styles.prefChipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Work Mode</Text>
              <View style={styles.chipGrid}>
                {EXP_MODE_OPTIONS.map((m) => (
                  <Pressable key={m} style={[styles.prefChip, expMode === m && styles.prefChipActive]} onPress={() => setExpMode(m)}>
                    {expMode === m && <Check size={12} color={Colors.surface} />}
                    <Text style={[styles.prefChipText, expMode === m && styles.prefChipTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
              {expMode !== 'Remote' && (
                <>
                  <Text style={styles.fieldLabel}>Job Location</Text>
                  <TextInput style={styles.modalInput} placeholder="e.g. San Francisco, CA" placeholderTextColor={Colors.textTertiary} value={expLocation} onChangeText={setExpLocation} />
                </>
              )}
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <TextInput style={styles.modalInput} placeholder="e.g. Jan 2023" placeholderTextColor={Colors.textTertiary} value={expStartDate} onChangeText={setExpStartDate} />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>End Date</Text>
                  <TextInput style={[styles.modalInput, expIsCurrent && styles.inputDisabled]} placeholder="e.g. Dec 2024" placeholderTextColor={Colors.textTertiary} value={expIsCurrent ? 'Present' : expEndDate} onChangeText={setExpEndDate} editable={!expIsCurrent} />
                </View>
              </View>
              <Pressable style={styles.checkboxRow} onPress={() => setExpIsCurrent(!expIsCurrent)}>
                <View style={[styles.checkbox, expIsCurrent && styles.checkboxActive]}>
                  {expIsCurrent && <Check size={12} color={Colors.surface} />}
                </View>
                <Text style={styles.checkboxLabel}>I currently work here</Text>
              </Pressable>
              <Text style={styles.fieldLabel}>Skills (comma-separated)</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. React, TypeScript, GraphQL" placeholderTextColor={Colors.textTertiary} value={expSkills} onChangeText={setExpSkills} />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.modalInput, styles.modalTextArea]} placeholder="Describe your role and achievements..." placeholderTextColor={Colors.textTertiary} value={expDescription} onChangeText={handleExpDescriptionChange} multiline numberOfLines={3} />
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveExperience}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>{editingExperience ? 'Update' : 'Add Experience'}</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'education'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEducation ? 'Edit Education' : 'Add Education'}</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Institution *</Text>
              <View style={styles.universityInputContainer}>
                <TextInput
                  style={styles.universityInput}
                  placeholder="Select or type university"
                  placeholderTextColor={Colors.textTertiary}
                  value={universitySearch}
                  onChangeText={(text) => {
                    setUniversitySearch(text);
                    setEduInstitution(text);
                    setShowUniversityDropdown(true);
                  }}
                  onFocus={() => setShowUniversityDropdown(true)}
                />
                <ChevronDown size={14} color={Colors.textTertiary} />
              </View>
              {showUniversityDropdown && (
                <View style={styles.universityDropdown}>
                  <ScrollView style={styles.universityDropdownScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {universitySearch && !universities.some(u => u.toLowerCase() === universitySearch.toLowerCase()) && (
                      <Pressable
                        style={styles.universityDropdownItem}
                        onPress={() => {
                          setEduInstitution(universitySearch);
                          setShowUniversityDropdown(false);
                        }}
                      >
                        <Plus size={16} color={Colors.primary} />
                        <Text style={styles.universityDropdownItemTextAdd}>Add "{universitySearch}"</Text>
                      </Pressable>
                    )}
                    {universities
                      .filter(u => !universitySearch || u.toLowerCase().includes(universitySearch.toLowerCase()))
                      .slice(0, 50)
                      .map(uni => (
                        <Pressable
                          key={uni}
                          style={styles.universityDropdownItem}
                          onPress={() => {
                            setEduInstitution(uni);
                            setUniversitySearch(uni);
                            setShowUniversityDropdown(false);
                          }}
                        >
                          <Text style={styles.universityDropdownItemText}>{uni}</Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                </View>
              )}
              <Text style={styles.fieldLabel}>Degree *</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Bachelor's" placeholderTextColor={Colors.textTertiary} value={eduDegree} onChangeText={setEduDegree} />
              <Text style={styles.fieldLabel}>Field of Study</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Computer Science" placeholderTextColor={Colors.textTertiary} value={eduField} onChangeText={setEduField} />
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Start Year</Text>
                  <TextInput style={styles.modalInput} placeholder="e.g. 2016" placeholderTextColor={Colors.textTertiary} value={eduStartDate} onChangeText={setEduStartDate} />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>End Year</Text>
                  <TextInput style={styles.modalInput} placeholder="e.g. 2020" placeholderTextColor={Colors.textTertiary} value={eduEndDate} onChangeText={setEduEndDate} />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.modalInput, styles.modalTextArea]} placeholder="Describe your time at this institution..." placeholderTextColor={Colors.textTertiary} value={eduDescription} onChangeText={handleEduDescriptionChange} multiline numberOfLines={3} />
              <Text style={styles.fieldLabel}>Achievements</Text>
              <TextInput style={[styles.modalInput, styles.modalTextArea]} placeholder="Dean's List, Awards, Publications..." placeholderTextColor={Colors.textTertiary} value={eduAchievements} onChangeText={handleEduAchievementsChange} multiline numberOfLines={2} />
              <Text style={styles.fieldLabel}>Extracurriculars</Text>
              <TextInput style={[styles.modalInput, styles.modalTextArea]} placeholder="Clubs, Sports, Volunteer work..." placeholderTextColor={Colors.textTertiary} value={eduExtracurriculars} onChangeText={handleEduExtracurricularsChange} multiline numberOfLines={2} />
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveEducation}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>{editingEducation ? 'Update' : 'Add Education'}</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'certification'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCertification ? 'Edit Certification' : 'Add Certification'}</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Certification Name *</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. AWS Solutions Architect" placeholderTextColor={Colors.textTertiary} value={certName} onChangeText={setCertName} />
              <Text style={styles.fieldLabel}>Issuing Organization *</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Amazon Web Services" placeholderTextColor={Colors.textTertiary} value={certOrg} onChangeText={setCertOrg} />
              <Text style={styles.fieldLabel}>Credential URL</Text>
              <TextInput style={styles.modalInput} placeholder="https://..." placeholderTextColor={Colors.textTertiary} value={certUrl} onChangeText={setCertUrl} autoCapitalize="none" />
              <Text style={styles.fieldLabel}>Skills (comma-separated)</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. AWS, Cloud Architecture" placeholderTextColor={Colors.textTertiary} value={certSkills} onChangeText={setCertSkills} />
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveCertification}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>{editingCertification ? 'Update' : 'Add Certification'}</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'achievement'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAchievement ? 'Edit Achievement' : 'Add Achievement'}</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Best Innovation Award" placeholderTextColor={Colors.textTertiary} value={achTitle} onChangeText={setAchTitle} />
              <Text style={styles.fieldLabel}>Issuer/Organization *</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. TechCorp Hackathon" placeholderTextColor={Colors.textTertiary} value={achIssuer} onChangeText={setAchIssuer} />
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. 2024" placeholderTextColor={Colors.textTertiary} value={achDate} onChangeText={setAchDate} />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.modalInput, styles.modalTextArea]} placeholder="Describe this achievement..." placeholderTextColor={Colors.textTertiary} value={achDescription} onChangeText={setAchDescription} multiline numberOfLines={3} />
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveAchievement}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>{editingAchievement ? 'Update' : 'Add Achievement'}</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'coverletter'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cover Letter</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { minHeight: 200 }]}
              placeholder="Write your cover letter here (up to 1000 words)..."
              placeholderTextColor={Colors.textTertiary}
              value={coverLetter}
              onChangeText={(t) => { if (t.split(/\s+/).length <= 1000) setCoverLetter(t); }}
              multiline
              numberOfLines={10}
              autoFocus
            />
            <Text style={styles.charCount}>{coverLetter.split(/\s+/).filter(w => w).length}/1000 words</Text>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveCoverLetter}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>Save Cover Letter</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'jobrequirements'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Job Requirements</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Work Authorization Status</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. US Citizen, Green Card, H1B, etc."
                placeholderTextColor={Colors.textTertiary}
                value={workAuthStatus}
                onChangeText={setWorkAuthStatus}
              />
              <Text style={styles.fieldLabel}>Job Requirements (comma-separated)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="e.g. Security Clearance, Driver's License, etc."
                placeholderTextColor={Colors.textTertiary}
                value={jobReqs}
                onChangeText={setJobReqs}
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveJobRequirements}>
              <Check size={18} color={Colors.surface} /><Text style={styles.modalSaveBtnText}>Save Requirements</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showCurrencyPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <Pressable onPress={() => setShowCurrencyPicker(false)} style={styles.modalCloseBtn}><X size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {CURRENCIES.map((c) => (
                <Pressable key={c.code} style={[styles.currencyOption, user.salaryCurrency === c.code && styles.currencyOptionActive]} onPress={() => handleCurrencyChange(c.code)}>
                  <Text style={[styles.currencyOptionText, user.salaryCurrency === c.code && styles.currencyOptionTextActive]}>{c.label}</Text>
                  {user.salaryCurrency === c.code && <Check size={18} color={Colors.surface} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'referral'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share & Earn</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.referralCodeBox}>
              <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
              <Text style={styles.referralCodeText}>{referralStats?.referralCode || 'Loading...'}</Text>
              <Pressable
                style={styles.copyCodeBtn}
                onPress={() => {
                  if (referralStats?.referralCode) {
                    Clipboard.setString(referralStats.referralCode);
                    Alert.alert('Copied!', 'Referral code copied to clipboard');
                  }
                }}
              >
                <Text style={styles.copyCodeBtnText}>Copy Code</Text>
              </Pressable>
            </View>
            <View style={styles.referralStatsBox}>
              <View style={styles.referralStatItem}>
                <Text style={styles.referralStatValue}>{referralStats?.totalReferrals || 0}</Text>
                <Text style={styles.referralStatLabel}>Friends Joined</Text>
              </View>
              <View style={styles.referralStatDivider} />
              <View style={styles.referralStatItem}>
                <Text style={styles.referralStatValue}>{referralStats?.totalSwipesEarned || 0}</Text>
                <Text style={styles.referralStatLabel}>Swipes Earned</Text>
              </View>
            </View>
            <View style={styles.referralInfoBox}>
              <Text style={styles.referralInfoTitle}>How it works:</Text>
              <Text style={styles.referralInfoText}>• Share your code with friends</Text>
              <Text style={styles.referralInfoText}>• They enter it during sign-up</Text>
              <Text style={styles.referralInfoText}>• You both get 5 free swipes!</Text>
            </View>
            <Pressable
              style={styles.shareNowBtn}
              onPress={async () => {
                if (referralStats?.referralCode) {
                  try {
                    await Share.share({
                      message: `Hey! Have you heard about NextQuark? It's Tinder for jobs - swipe right to apply for your dream job! Join with my referral code ${referralStats.referralCode} and get 5 free application swipes to get started. Download now!`,
                    });
                  } catch (error) {
                    console.error('Error sharing:', error);
                  }
                }
              }}
            >
              <Share2 size={18} color="#FFFFFF" />
              <Text style={styles.shareNowBtnText}>Share Now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'veteranstatus'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Veteran Status</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {VETERAN_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.currencyOption, selectedVeteranStatus === option && styles.currencyOptionActive]}
                  onPress={() => setSelectedVeteranStatus(option)}
                >
                  <Text style={[styles.currencyOptionText, selectedVeteranStatus === option && styles.currencyOptionTextActive]}>{option}</Text>
                  {selectedVeteranStatus === option && <Check size={18} color={Colors.surface} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveVeteranStatus}>
              <Check size={18} color={Colors.surface} />
              <Text style={styles.modalSaveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'disabilitystatus'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Disability Status</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {DISABILITY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.currencyOption, selectedDisabilityStatus === option && styles.currencyOptionActive]}
                  onPress={() => setSelectedDisabilityStatus(option)}
                >
                  <Text style={[styles.currencyOptionText, selectedDisabilityStatus === option && styles.currencyOptionTextActive]}>{option}</Text>
                  {selectedDisabilityStatus === option && <Check size={18} color={Colors.surface} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveDisabilityStatus}>
              <Check size={18} color={Colors.surface} />
              <Text style={styles.modalSaveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'ethnicity'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ethnicity</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {ETHNICITY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.currencyOption, selectedEthnicity === option && styles.currencyOptionActive]}
                  onPress={() => setSelectedEthnicity(option)}
                >
                  <Text style={[styles.currencyOptionText, selectedEthnicity === option && styles.currencyOptionTextActive]}>{option}</Text>
                  {selectedEthnicity === option && <Check size={18} color={Colors.surface} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveEthnicity}>
              <Check size={18} color={Colors.surface} />
              <Text style={styles.modalSaveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'race'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Race</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {RACE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.currencyOption, selectedRace === option && styles.currencyOptionActive]}
                  onPress={() => setSelectedRace(option)}
                >
                  <Text style={[styles.currencyOptionText, selectedRace === option && styles.currencyOptionTextActive]}>{option}</Text>
                  {selectedRace === option && <Check size={18} color={Colors.surface} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalSaveBtn} onPress={handleSaveRace}>
              <Check size={18} color={Colors.surface} />
              <Text style={styles.modalSaveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>


      <Modal visible={activeModal === 'desiredroles'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Desired Roles</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.roleSearchContainer}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.roleSearchInput}
                placeholder="Search roles..."
                placeholderTextColor={Colors.textTertiary}
                value={roleQuery}
                onChangeText={setRoleQuery}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.chipGrid}>
                {suggestedRoles
                  .filter((r) => !roleQuery || r.toLowerCase().includes(roleQuery.toLowerCase()))
                  .map((role, idx) => {
                    const selected = (user.desiredRoles || []).includes(role);
                    return (
                      <Pressable 
                        key={`${role}-${idx}`} 
                        style={[styles.companySelectChip, selected && styles.companySelectChipActive]} 
                        onPress={() => handleToggleDesiredRole(role)}
                      >
                        <Text style={[styles.companySelectText, selected && styles.companySelectTextActive]}>{role}</Text>
                        {selected && <Check size={14} color={Colors.surface} />}
                      </Pressable>
                    );
                  })}
              </View>
            </ScrollView>
            <Pressable style={styles.cityDoneBtn} onPress={closeModal}>
              <Text style={styles.cityDoneBtnText}>Done ({(user.desiredRoles || []).length} selected)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'preferredcities'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preferred Cities to Work</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.roleSearchContainer}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.roleSearchInput}
                placeholder="Search cities..."
                placeholderTextColor={Colors.textTertiary}
                value={cityQuery}
                onChangeText={setCityQuery}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.chipGrid}>
                {majorCities
                  .filter((c) => !cityQuery || c.toLowerCase().includes(cityQuery.toLowerCase()))
                  .map((city) => {
                    const selected = (user.preferredCities || []).includes(city);
                    return (
                      <Pressable 
                        key={city} 
                        style={[styles.companySelectChip, selected && styles.companySelectChipActive]} 
                        onPress={() => handleTogglePreferredCity(city)}
                      >
                        <MapPin size={14} color={selected ? Colors.surface : Colors.textPrimary} />
                        <Text style={[styles.companySelectText, selected && styles.companySelectTextActive]}>{city}</Text>
                        {selected && <Check size={14} color={Colors.surface} />}
                      </Pressable>
                    );
                  })}
              </View>
            </ScrollView>
            <Pressable style={styles.cityDoneBtn} onPress={closeModal}>
              <Text style={styles.cityDoneBtnText}>Done ({(user.preferredCities || []).length} selected)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>



      <Modal visible={activeModal === 'favoritecompanies'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Favorite Companies</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.roleSearchContainer}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.roleSearchInput}
                placeholder="Search companies..."
                placeholderTextColor={Colors.textTertiary}
                value={companySearch}
                onChangeText={setCompanySearch}
              />
            </View>
            {isLoadingCompanies ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ marginTop: 12, fontSize: 13, color: Colors.textSecondary }}>Loading companies...</Text>
              </View>
            ) : companiesError ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: Colors.error, marginBottom: 8 }}>Error loading companies</Text>
                <Text style={{ fontSize: 12, color: Colors.textTertiary, textAlign: 'center' }}>Check console for details</Text>
              </View>
            ) : allCompaniesData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 8 }}>No companies found</Text>
                <Text style={{ fontSize: 12, color: Colors.textTertiary, textAlign: 'center' }}>Check Supabase RLS policies</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                <View style={styles.chipGrid}>
                  {allCompaniesData
                    .filter((c: { name: string; logo_url: string | null }) => !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase()))
                    .map((company: { name: string; logo_url: string | null }) => {
                      const selected = (user.favoriteCompanies || []).includes(company.name);
                      const logoUrl = company.logo_url 
                        ? getCompanyLogoStorageUrl(company.logo_url)
                        : null;
                      return (
                        <Pressable 
                          key={company.name} 
                          style={[styles.companySelectChip, selected && styles.companySelectChipActive]} 
                          onPress={() => handleToggleFavoriteCompany(company.name)}
                        >
                          {logoUrl && <Image source={{ uri: logoUrl }} style={styles.companySelectLogo} />}
                          <Text style={[styles.companySelectText, selected && styles.companySelectTextActive]}>{company.name}</Text>
                          {selected && <Check size={14} color={Colors.surface} />}
                        </Pressable>
                      );
                    })}
                </View>
              </ScrollView>
            )}
            <Pressable style={styles.cityDoneBtn} onPress={closeModal}>
              <Text style={styles.cityDoneBtnText}>Done ({(user.favoriteCompanies || []).length} selected)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </TabTransitionWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  brandHeader: { alignItems: 'center' as const, paddingTop: 4, paddingBottom: 2 },
  brandLogo: { height: 32, width: 240 },
  brandName: { fontSize: 12, fontWeight: '800' as const, color: Colors.textTertiary, letterSpacing: 2, textTransform: 'uppercase' as const },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.secondary },
  headerActions: { flexDirection: 'row', gap: 8 },
  settingsButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', position: 'relative' as const },
  resumeExclamation: { position: 'absolute' as const, top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  resumeExclamationText: { fontSize: 10, fontWeight: '800' as const, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16 },
  profileCard: { backgroundColor: '#111111', borderRadius: 20, padding: 20, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarWrapper: { position: 'relative' as const },
  avatar: { width: 68, height: 68, borderRadius: 22, backgroundColor: Colors.borderLight },
  cameraOverlay: { position: 'absolute' as const, bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#111111' },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF' },
  editableRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  contactIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  profileHeadline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' as const, flex: 1 },
  profileLocation: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  bioSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 14, gap: 8 },
  bioText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 19 },
  bioPlaceholder: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' as const },
  completionSection: { marginTop: 2 },
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  completionLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' as const },
  completionPercent: { fontSize: 14, color: '#10B981', fontWeight: '800' as const },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' as const },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  completionHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 },
  verifyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: Colors.borderLight },
  verifyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center' },
  verifyContent: { flex: 1, marginLeft: 12 },
  verifyTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  verifySubtext: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  statsGrid: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 12, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary },
  statTitle: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, fontWeight: '500' as const },
  statDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },
  aiCard: { backgroundColor: Colors.accentSoft, borderRadius: 16, padding: 18, marginTop: 12, borderWidth: 1, borderColor: `${Colors.accent}20` },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiCardTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  aiCardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  aiOptimizeButton: { marginTop: 12, paddingVertical: 10, backgroundColor: Colors.secondary, borderRadius: 10, alignItems: 'center' },
  aiOptimizeText: { fontSize: 14, fontWeight: '700' as const, color: Colors.textInverse },
  contactCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 12 },
  contactCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  contactText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' as const, flex: 1 },
  section: { marginTop: 20 },
  borderedSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  darkSection: { backgroundColor: '#111111', borderRadius: 16, padding: 16, borderWidth: 0, borderColor: 'transparent' },
  darkSectionTitle: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  addButton: { width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  prefChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  prefChipText: { fontSize: 12, fontWeight: '500' as const, color: Colors.textPrimary },
  prefChipTextActive: { color: Colors.surface },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  currencyBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary },
  salarySliderContainer: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16 },
  topSkillHint: { fontSize: 13, fontWeight: '600' as const, color: Colors.textTertiary },
  topSkillSubtext: { fontSize: 12, color: Colors.textTertiary, marginBottom: 10, marginTop: -4 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  skillTagTop: { backgroundColor: '#FFF8E1', borderWidth: 2, borderColor: '#D4A017' },
  skillTagText: { fontSize: 12, color: Colors.textInverse, fontWeight: '500' as const },
  skillTagTextTop: { color: '#8B6914' },
  addSkillBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  experienceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  expIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center' },
  expContent: { flex: 1, marginLeft: 14 },
  expTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  expCompany: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  expDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  expDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, lineHeight: 17 },
  expLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  expSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  expTagsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  expTagChip: { backgroundColor: Colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  expTagText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const },
  credUrlRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  credUrlText: { fontSize: 12, color: Colors.accent, flex: 1 },
  certSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  certSkillChip: { backgroundColor: Colors.accentSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  certSkillChipText: { fontSize: 11, color: Colors.accent, fontWeight: '600' as const },
  eduDetailRow: { marginTop: 4 },
  eduDetailLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textSecondary },
  eduDetailText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 2 },
  menuSection: { marginTop: 16, backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden' as const },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuItemPressed: { backgroundColor: Colors.background },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary, marginLeft: 12 },
  premiumCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 18, marginTop: 16 },
  premiumIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,215,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  premiumContent: { flex: 1, marginLeft: 14 },
  premiumTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFD700' },
  premiumSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  subscriptionBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginTop: 16 },
  subscriptionBadgeContent: { flex: 1, marginLeft: 14 },
  subscriptionBadgeTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  subscriptionBadgeSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 14, backgroundColor: Colors.errorSoft, borderRadius: 14 },
  logoutText: { fontSize: 15, fontWeight: '700' as const, color: Colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  modalScroll: { maxHeight: 400, marginBottom: 12 },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' as const },
  modalSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  modalSaveBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.textInverse },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  checkboxLabel: { fontSize: 14, color: Colors.textSecondary },
  inputDisabled: { opacity: 0.5 },
  avatarPreviewRow: { alignItems: 'center', marginBottom: 16 },
  avatarPreview: { width: 80, height: 80, borderRadius: 26, backgroundColor: Colors.borderLight },
  charCount: { fontSize: 12, color: Colors.textTertiary, textAlign: 'right' as const, marginTop: -8, marginBottom: 8 },
  currencyOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 6, backgroundColor: Colors.background },
  currencyOptionActive: { backgroundColor: Colors.secondary },
  currencyOptionText: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  currencyOptionTextActive: { color: Colors.surface },
  shareCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1.5, borderColor: '#81C784', borderStyle: 'dashed' as const },
  shareGradient: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#43A047', justifyContent: 'center', alignItems: 'center' },
  shareContent: { flex: 1, marginLeft: 14 },
  shareTitle: { fontSize: 15, fontWeight: '700' as const, color: '#2E7D32' },
  shareSubtext: { fontSize: 12, color: '#558B2F', marginTop: 2 },
  shareBadge: { backgroundColor: '#43A047', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  shareBadgeText: { fontSize: 11, fontWeight: '800' as const, color: '#FFFFFF' },
  demoSection: { marginTop: 20, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  demoHeaderTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  demoNote: { fontSize: 11, color: Colors.textTertiary, marginBottom: 12 },
  demoItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  demoLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 2 },
  demoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' as const },
  demoValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  coverLetterText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
  coverLetterPlaceholder: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' as const, marginTop: 8 },
  completionPromptCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: Colors.borderLight },
  completionPromptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  completionPromptTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary },
  completionPromptText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  missingFieldsList: { gap: 4 },
  missingFieldItem: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  favoriteCompaniesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  favoriteCompanyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight },
  favoriteCompanyLogo: { width: 20, height: 20, borderRadius: 4 },
  favoriteCompanyText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' as const },
  emptyFavoriteText: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' as const },
  companySelectChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight },
  companySelectChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  companySelectLogo: { width: 18, height: 18, borderRadius: 4 },
  companySelectText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' as const },
  companySelectTextActive: { color: Colors.surface },
  roleSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: Colors.borderLight },
  roleSearchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  cityDoneBtn: { backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  cityDoneBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.surface },
  referralCodeBox: { backgroundColor: '#F5F5F5', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  referralCodeLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, fontWeight: '600' as const },
  referralCodeText: { fontSize: 32, fontWeight: '800' as const, color: Colors.secondary, letterSpacing: 4, marginBottom: 12 },
  copyCodeBtn: { backgroundColor: Colors.secondary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  copyCodeBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.surface },
  referralStatsBox: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 14, padding: 16, marginBottom: 16 },
  referralStatItem: { flex: 1, alignItems: 'center' },
  referralStatValue: { fontSize: 24, fontWeight: '800' as const, color: Colors.secondary },
  referralStatLabel: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  referralStatDivider: { width: 1, backgroundColor: Colors.borderLight, marginHorizontal: 16 },
  referralInfoBox: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, marginBottom: 16 },
  referralInfoTitle: { fontSize: 14, fontWeight: '700' as const, color: '#2E7D32', marginBottom: 8 },
  referralInfoText: { fontSize: 13, color: '#558B2F', marginBottom: 4 },
  shareNowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#43A047', borderRadius: 14, paddingVertical: 14 },
  shareNowBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  universityInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  universityInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  universityDropdown: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 12, maxHeight: 250 },
  universityDropdownScroll: { maxHeight: 240 },
  universityDropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  universityDropdownItemText: { fontSize: 15, color: Colors.textPrimary },
  universityDropdownItemTextAdd: { fontSize: 15, color: Colors.primary, fontWeight: '600' as const },
});

const wizStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: { borderRadius: 24, padding: 20, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  stepCounter: { fontSize: 12, fontWeight: '600' as const, marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '800' as const },
  helperText: { fontSize: 14, fontStyle: 'italic' as const, lineHeight: 20, marginBottom: 12 },
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 16, overflow: 'hidden' as const },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 2 },
  body: { maxHeight: 360, marginBottom: 12 },
  selectionCount: { fontSize: 12, fontWeight: '600' as const, marginTop: 12, textAlign: 'right' as const },
  footer: { flexDirection: 'row', gap: 12 },
  skipBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  skipBtnText: { fontSize: 15, fontWeight: '700' as const },
  nextBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', gap: 4 },
  nextBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10, marginBottom: 16 },
  securityNoteText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' as const, flex: 1 },
  credentialsInfo: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 16, paddingHorizontal: 4 },
  portalSectionTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary, marginTop: 16, marginBottom: 8 },
  passwordInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 12 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  eyeIcon: { paddingHorizontal: 12 },
});
