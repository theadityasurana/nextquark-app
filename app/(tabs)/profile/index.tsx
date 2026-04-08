import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { startWizardFlow, getIncompleteSteps as getWizardIncompleteSteps } from '@/components/WizardFooter';
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
  Gift,
  FileCheck,
  Search,
  Moon,
  Sun,
  Contact,
  Heart,
  Target,
  Building2,
  Laptop,
  Sparkles,
  ScrollText,
  BadgeCheck,
  Scale,
  Rocket,
  TrendingUp,
  Bookmark,
  FolderOpen,
  Upload,
  ExternalLink,
  Trash2,
} from '@/components/ProfileIcons';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import Colors, { lightColors, darkColors } from '@/constants/colors';
import { UserProfile, WorkExperience, Education, Certification, Achievement, Project, UserDocument } from '@/types';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { AnimatedHeaderScrollView, AnimatedHeaderScrollViewRef } from '@/components/AnimatedHeader';
import { fetchUserApplications } from '@/lib/jobs';
import { getSubscriptionStatus, type SubscriptionData, getSubscriptionDisplayName, getSubscriptionBadgeColor } from '@/lib/subscription';
import { supabase, SUPABASE_URL, getProfilePictureUrl, getCompanyLogoStorageUrl, getStorageUploadUrl } from '@/lib/supabase';
import { getReferralStats, createReferralCode } from '@/lib/referral';
import { Share, Clipboard } from 'react-native';
import { suggestedSkills, suggestedRoles, majorCities } from '@/constants/onboarding';
import { getRolesGroupedByCategory } from '@/constants/roles';
import { universities } from '@/constants/universities';
import { SkeletonProfile } from '@/components/Skeleton';

type ModalType = 'skill' | 'experience' | 'education' | 'bio' | 'headline' | 'location' | 'certification' | 'avatar' | 'achievement' | 'contact' | 'coverletter' | 'jobrequirements' | 'favoritecompanies' | 'referral' | 'veteranstatus' | 'disabilitystatus' | 'ethnicity' | 'race' | 'desiredroles' | 'preferredcities' | 'workdaycredentials' | null;

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
    certifications: (data.certifications || []).map(c => ({
      id: c.id,
      name: c.name,
      issuingOrganization: c.issuingOrganization,
      credentialUrl: c.credentialUrl,
      skills: c.skills,
    })),
    achievements: (data.achievements || []).map(a => ({
      id: a.id,
      title: a.title,
      issuer: a.issuer,
      date: a.date,
      description: a.description,
    })),
    jobPreferences: [],
    workModePreferences: data.workPreferences,
    linkedinUrl: data.linkedInUrl || undefined,
    githubUrl: undefined,
    isProfileVerified: false,
    veteranStatus: data.veteranStatus || undefined,
    disabilityStatus: data.disabilityStatus || undefined,
    ethnicity: data.ethnicity || undefined,
    gender: data.gender || undefined,
    favoriteCompanies: [],
    projects: (data.projects || []).map(p => ({
      id: p.id,
      title: p.title,
      organization: p.organization,
      date: p.date,
      exposure: p.exposure,
      bullets: p.bullets,
      link: p.link,
    })),
    documents: [],
    salaryCurrency: 'USD',
    salaryMinPref: 0,
    salaryMaxPref: 0,
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
  const animatedScrollRef = useRef<AnimatedHeaderScrollViewRef>(null);
  // Create a fake scrollable ref for useScrollToTop
  const scrollToTopRef = useRef({ scrollToOffset: ({ offset }: { offset: number; animated?: boolean }) => { animatedScrollRef.current?.scrollToTop(); } });
  useScrollToTop(scrollToTopRef as any);
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      refetchProfile();
    }, [refetchProfile])
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


  const [profileTab, setProfileTab] = useState<'personal' | 'preferences' | 'coverletter' | 'projects' | 'documents' | 'education' | 'workexperience'>('personal');
  const [docSubTab, setDocSubTab] = useState<'resumes' | 'transcript' | 'others'>('resumes');

  const [showTabArrow, setShowTabArrow] = useState(true);

  // Documents state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [previewingDocId, setPreviewingDocId] = useState<string | null>(null);
  const [pendingDocFile, setPendingDocFile] = useState<{ uri: string; mimeType: string; originalName: string } | null>(null);
  const [docRenameText, setDocRenameText] = useState('');
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

    console.log('[PROFILE] ===== useEffect triggered =====');
    console.log('[PROFILE] supabaseUserId:', supabaseUserId);
    console.log('[PROFILE] supabaseProfile:', supabaseProfile ? { id: supabaseProfile.id, name: supabaseProfile.name, email: supabaseProfile.email, headline: supabaseProfile.headline } : 'null');
    console.log('[PROFILE] current user state:', { name: user.name, email: user.email, headline: user.headline });

    // Only update when we have actual profile data from Supabase
    if (supabaseProfile && supabaseProfile.id === supabaseUserId) {
      console.log('[PROFILE] ✅ Setting user from supabaseProfile:', { name: supabaseProfile.name, email: supabaseProfile.email });
      setUser(prev => {
        const merged = { ...prev, ...supabaseProfile, favoriteCompanies: supabaseProfile.favoriteCompanies || [] };
        console.log('[PROFILE] Merged user state:', { name: merged.name, email: merged.email, headline: merged.headline });
        return merged;
      });
    } else {
      console.log('[PROFILE] ⏳ supabaseProfile not ready yet, keeping current user state');
    }
    // Don't fall back to onboarding data when supabaseProfile is temporarily null during refetch
  }, [supabaseProfile, supabaseUserId]);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedProfileRef = useRef(false);
  
  // Track when real profile data has been loaded to avoid syncing defaults back to Supabase
  useEffect(() => {
    if (supabaseProfile && supabaseProfile.id === supabaseUserId) {
      hasLoadedProfileRef.current = true;
    }
  }, [supabaseProfile, supabaseUserId]);

  useEffect(() => {
    // Don't auto-sync until real profile data has loaded at least once
    if (!hasLoadedProfileRef.current) {
      if (__DEV__) console.log('[PROFILE] ⏸️ Auto-sync skipped - profile not loaded yet');
      return;
    }
    // Never write back obviously-default/corrupted data
    if (!user.name || user.name === 'User' || !user.email) {
      if (__DEV__) console.log('[PROFILE] ⏸️ Auto-sync skipped - data looks like defaults:', { name: user.name, email: user.email });
      return;
    }
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (__DEV__) console.log('[PROFILE] 🔄 Auto-syncing profile to Supabase');
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

  const incompleteSteps = useMemo(() => {
    const steps: string[] = [];
    if (user.topSkills.length === 0) steps.push('topskills');
    if (user.education.length === 0) steps.push('education');
    if (user.experience.length === 0) steps.push('experience');
    if (user.achievements.length === 0) steps.push('achievements');
    if (user.certifications.length === 0) steps.push('certifications');
    return steps;
  }, [user.topSkills, user.education, user.experience, user.achievements, user.certifications]);


  const openCompleteProfileWizard = useCallback(() => {
    if (incompleteSteps.length === 0) return;
    const wizardSteps = getWizardIncompleteSteps(supabaseProfile);
    if (wizardSteps.length === 0) return;
    startWizardFlow(router, wizardSteps);
  }, [incompleteSteps, supabaseProfile, router]);


  const closeModal = useCallback(() => {
    setActiveModal(null);
    setEditingExperience(null);
    setEditingEducation(null);
    setEditingCertification(null);
    setEditingAchievement(null);
    setShowUniversityDropdown(false);
    setUniversitySearch('');
  }, []);

  if (!supabaseProfile || !hasLoadedProfileRef.current) {
    return (
      <TabTransitionWrapper routeName="profile">
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 50 }]}>
          <SkeletonProfile />
        </View>
      </TabTransitionWrapper>
    );
  }

  return (
    <TabTransitionWrapper routeName="profile">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedHeaderScrollView
        scrollRef={animatedScrollRef}
        largeTitle="Profile"
        backgroundColor={colors.background}
        largeTitleColor={colors.secondary}
        largeHeaderTitleStyle={{ fontSize: 34, fontWeight: '800' }}
        rightComponent={
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
              onPress={() => router.push('/saved-jobs' as any)}
              testID="saved-jobs-btn"
            >
              <Bookmark size={22} color={colors.textSecondary} />
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
        }
      >
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

        <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsRow}
        >
          <Pressable
            style={styles.quickActionBox}
            onPress={() => router.push('/premium' as any)}
          >
            <LinearGradient
              colors={subscriptionData?.subscription_type === 'premium' ? ['#BA68C8', '#8E24AA', '#6A1B9A'] : subscriptionData?.subscription_type === 'pro' ? ['#FF9D2F', '#E67E22', '#C0601A'] : ['#2D2B55', '#1B1A3E', '#0F0E2A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            >
              <Text style={styles.quickActionImpact}>
                {subscriptionData?.applications_remaining ?? 0}
              </Text>
              <Text style={[styles.quickActionLabel, { color: 'rgba(255,255,255,0.9)' }]}>apps left</Text>
              <Text style={[styles.quickActionSub, { color: subscriptionData?.subscription_type === 'free' ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.6)' }]}>
                {subscriptionData?.subscription_type === 'premium' ? '✦ Premium' : subscriptionData?.subscription_type === 'pro' ? '✦ Pro · Tap to upgrade' : '⚡ Tap to upgrade plan'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.quickActionBox}
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
            <LinearGradient colors={['#43E97B', '#38B866', '#1B8A4A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionGradient}>
              <Gift size={32} color="#FFFFFF" strokeWidth={1.2} style={{ marginBottom: 6 }} />
              <Text style={[styles.quickActionLabel, { color: 'rgba(255,255,255,0.95)' }]}>Share & Earn</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.quickActionBox}
            onPress={() => router.push('/(tabs)/applications' as any)}
          >
            <LinearGradient colors={['#42A5F5', '#1E88E5', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionGradient}>
              <Text style={styles.quickActionImpact}>{totalApplications}</Text>
              <Text style={[styles.quickActionLabel, { color: 'rgba(255,255,255,0.9)' }]}>Jobs Applied</Text>
            </LinearGradient>
          </Pressable>

        </ScrollView>
        </View>

        <Pressable
          style={styles.resumeBanner}
          onPress={() => router.push('/resume-management' as any)}
        >
          <View style={styles.resumeBannerIcon}>
            <FileText size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resumeBannerTitle}>Resume</Text>
            <Text style={styles.resumeBannerSub}>Upload & manage your resume</Text>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
        </Pressable>

        <View style={{ position: 'relative' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            contentContainerStyle={{ paddingHorizontal: 4, gap: 4 }}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
              setShowTabArrow(contentOffset.x + layoutMeasurement.width < contentSize.width - 10);
            }}
            scrollEventThrottle={16}
          >
            {([['personal', 'Personal Info'], ['documents', 'Documents'], ['preferences', 'Preferences'], ['workexperience', 'Experience'], ['education', 'Education'], ['projects', 'Projects'], ['coverletter', 'Cover Letter']] as const).map(([tab, label]) => {
              const active = profileTab === tab;
              return (
                <Pressable key={tab} style={[styles.tabItem, active && { backgroundColor: colors.secondary }]} onPress={() => setProfileTab(tab as any)}>
                  <Text style={[styles.tabItemText, { color: active ? colors.surface : colors.textSecondary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {showTabArrow && (
            <View style={[styles.tabScrollHint, { backgroundColor: colors.surface }]} pointerEvents="none">
              <ChevronRight size={16} color={colors.textTertiary} />
            </View>
          )}
        </View>

        {profileTab === 'personal' && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {[user.phone, user.email, user.linkedinUrl, user.githubUrl, user.workAuthorizationStatus, user.veteranStatus].filter(Boolean).length}/6 fields complete
              {user.workAuthorizationStatus ? '' : '  ·  Add work authorization'}
            </Text>
          </View>
        )}

        {profileTab === 'preferences' && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {user.jobPreferences.length} job type{user.jobPreferences.length !== 1 ? 's' : ''}
              {' · '}
              {user.workModePreferences.length} work mode{user.workModePreferences.length !== 1 ? 's' : ''}
              {' · '}
              {(user.preferredCities || []).length} cit{(user.preferredCities || []).length !== 1 ? 'ies' : 'y'}
              {' · '}
              {(user.desiredRoles || []).length} role{(user.desiredRoles || []).length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {profileTab === 'workexperience' && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {user.experience.length} role{user.experience.length !== 1 ? 's' : ''}
              {' · '}
              {user.topSkills.length} skill{user.topSkills.length !== 1 ? 's' : ''} highlighted
              {' · '}
              {user.certifications.length} cert{user.certifications.length !== 1 ? 's' : ''}
              {' · '}
              {user.achievements.length} achievement{user.achievements.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {profileTab === 'education' && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {user.education.length} degree{user.education.length !== 1 ? 's' : ''}
              {user.education.length > 0 ? ` · ${user.education[0].institution}` : ''}
            </Text>
          </View>
        )}

        {profileTab === 'projects' && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {(user.projects || []).length} project{(user.projects || []).length !== 1 ? 's' : ''}
              {(user.projects || []).length > 0 ? ` · ${(user.projects || []).reduce((acc, p) => acc + p.exposure.length, 0)} technologies` : ''}
            </Text>
          </View>
        )}

        {profileTab === 'documents' && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {user.resumeUrl ? '1 resume' : 'No resume'}
              {' · '}
              {(user.documents || []).length} document{(user.documents || []).length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {profileTab === 'coverletter' && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {user.coverLetter ? `${user.coverLetter.split(/\s+/).filter(w => w).length} words` : 'Not written yet'}
            </Text>
          </View>
        )}

        {profileTab === 'preferences' && (
        <Pressable style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111', borderLeftColor: '#7C4DFF60' }]} onPress={() => router.push('/(tabs)/profile/edit-experience-level' as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={16} color={theme === 'dark' ? colors.textSecondary : 'rgba(255,255,255,0.6)'} strokeWidth={2.5} />
              <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Experience Level</Text>
            </View>
            <ChevronRight size={18} color={theme === 'dark' ? colors.textTertiary : 'rgba(255,255,255,0.4)'} />
          </View>
          {user.experienceLevel ? (
            <View style={[styles.prefChip, { backgroundColor: 'rgba(124,77,255,0.15)', borderColor: 'rgba(124,77,255,0.3)', alignSelf: 'flex-start' }]}>
              <Text style={[styles.prefChipText, { color: '#FFFFFF' }]}>
                {user.experienceLevel === 'internship' ? 'Internship' : user.experienceLevel === 'entry_level' ? 'Entry Level & Graduate' : user.experienceLevel === 'junior' ? 'Junior (1-2 years)' : user.experienceLevel === 'mid' ? 'Mid Level (3-5 years)' : user.experienceLevel === 'senior' ? 'Senior (6-9 years)' : user.experienceLevel === 'expert' ? 'Expert & Leadership (10+ years)' : user.experienceLevel}
              </Text>
            </View>
          ) : (
            <Text style={[styles.emptyFavoriteText, { color: 'rgba(255,255,255,0.35)' }]}>No experience level set</Text>
          )}
        </Pressable>

        )}

        {profileTab === 'personal' && (
        <Pressable style={[styles.contactCard, { backgroundColor: colors.surface, borderLeftColor: '#1E88E5' }]} onPress={openContactModal}>
          <View style={styles.contactCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Contact size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Contact Information</Text>
            </View>
            <Pencil size={14} color={colors.textTertiary} />
          </View>
          <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.phone}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.contactIconBox, { backgroundColor: '#10B98118' }]}>
                  <Phone size={14} color="#10B981" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Phone</Text>
              </View>
            </View>
          </View>
          <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.email}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.contactIconBox, { backgroundColor: '#3B82F618' }]}>
                  <Mail size={14} color="#3B82F6" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Email</Text>
              </View>
            </View>
          </View>
          {user.linkedinUrl ? (
            <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{user.linkedinUrl}</Text>
                <View style={styles.infoLabelRow}>
                  <View style={[styles.contactIconBox, { backgroundColor: '#0A66C218' }]}>
                    <Linkedin size={14} color="#0A66C2" />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>LinkedIn</Text>
                </View>
              </View>
            </View>
          ) : null}
          {user.githubUrl ? (
            <View style={[styles.contactItem, { borderBottomColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{user.githubUrl}</Text>
                <View style={styles.infoLabelRow}>
                  <View style={[styles.contactIconBox, { backgroundColor: '#8B5CF618' }]}>
                    <Github size={14} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>GitHub</Text>
                </View>
              </View>
            </View>
          ) : null}
        </Pressable>

        )}

        {profileTab === 'preferences' && (
        <Pressable style={[styles.contactCard, { backgroundColor: colors.surface, borderLeftColor: '#E91E63' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'desiredroles' } } as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Target size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Desired Roles</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          {(user.desiredRoles && user.desiredRoles.length > 0) ? (
            <View style={{ gap: 14 }}>
              {getRolesGroupedByCategory(user.desiredRoles).map((group) => (
                <View key={group.key}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Text style={{ fontSize: 16 }}>{group.emoji}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>{group.label}</Text>
                  </View>
                  <View style={styles.chipGrid}>
                    {group.roles.map((role, idx) => (
                      <View key={idx} style={[styles.prefChip, { backgroundColor: `${group.color}28`, borderColor: `${group.color}50` }]}>
                        <Text style={[styles.prefChipText, { color: colors.textPrimary }]}>{role}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyFavoriteText, { color: colors.textTertiary }]}>No desired roles added yet</Text>
          )}
        </Pressable>

        )}

        {profileTab === 'preferences' && (
        <Pressable style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111', borderLeftColor: '#00897B60' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'preferredcities' } } as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MapPin size={16} color={theme === 'dark' ? colors.textSecondary : 'rgba(255,255,255,0.6)'} strokeWidth={2.5} />
              <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Preferred Cities to Work</Text>
            </View>
            <ChevronRight size={18} color={theme === 'dark' ? colors.textTertiary : 'rgba(255,255,255,0.4)'} />
          </View>
          {(user.preferredCities && user.preferredCities.length > 0) ? (
            <View style={styles.chipGrid}>
              {user.preferredCities.map((city, idx) => (
                <View key={idx} style={[styles.prefChip, { backgroundColor: 'rgba(0,137,123,0.15)', borderColor: 'rgba(0,137,123,0.3)' }]}>
                  <MapPin size={12} color="#00897B" />
                  <Text style={[styles.prefChipText, { color: '#FFFFFF' }]}>{city}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyFavoriteText, { color: 'rgba(255,255,255,0.35)' }]}>No preferred cities added yet</Text>
          )}
        </Pressable>

        )}

        {profileTab === 'preferences' && (
        <Pressable style={[styles.contactCard, { backgroundColor: colors.surface, borderLeftColor: '#1E88E5' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'jobtypeprefs' } } as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Briefcase size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Job Type Preferences</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          <View style={styles.chipGrid}>
            {JOB_TYPE_OPTIONS.filter((pref) => user.jobPreferences.includes(pref)).map((pref) => (
              <View
                key={pref}
                style={[styles.prefChip, { backgroundColor: '#1E88E528', borderColor: '#1E88E550' }]}
              >
                <Text style={[styles.prefChipText, { color: colors.textPrimary }]}>{pref}</Text>
              </View>
            ))}
            {JOB_TYPE_OPTIONS.filter((pref) => !user.jobPreferences.includes(pref)).map((pref) => (
              <View
                key={pref}
                style={[styles.prefChip, { backgroundColor: colors.background, borderColor: colors.borderLight }]}
              >
                <Text style={[styles.prefChipText, { color: colors.textTertiary }]}>{pref}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        )}

        {profileTab === 'preferences' && (
        <Pressable style={[styles.contactCard, { backgroundColor: colors.surface, borderLeftColor: '#F4511E' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'workmodeprefs' } } as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Laptop size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Work Mode Preferences</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          <View style={styles.chipGrid}>
            {WORK_MODE_OPTIONS.filter((mode) => user.workModePreferences.includes(mode)).map((mode) => (
              <View
                key={mode}
                style={[styles.prefChip, { backgroundColor: '#F4511E28', borderColor: '#F4511E50' }]}
              >
                <Text style={[styles.prefChipText, { color: colors.textPrimary }]}>{mode}</Text>
              </View>
            ))}
            {WORK_MODE_OPTIONS.filter((mode) => !user.workModePreferences.includes(mode)).map((mode) => (
              <View
                key={mode}
                style={[styles.prefChip, { backgroundColor: colors.background, borderColor: colors.borderLight }]}
              >
                <Text style={[styles.prefChipText, { color: colors.textTertiary }]}>{mode}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        )}

        {profileTab === 'workexperience' && (
        <Pressable style={[styles.contactCard, { backgroundColor: colors.surface, borderLeftColor: '#D4A017' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'topskills' } } as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Sparkles size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Top Skills</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          <View style={styles.chipGrid}>
            {user.skills.map((skill, idx) => {
              const isTop = user.topSkills.includes(skill);
              return (
                <View
                  key={idx}
                  style={[styles.prefChip, isTop ? { backgroundColor: '#D4A01728', borderColor: '#D4A01750' } : { backgroundColor: '#9E9E9E18', borderColor: '#9E9E9E35' }]}
                >
                  {isTop && <Star size={12} color="#D4A017" />}
                  <Text style={[styles.prefChipText, { color: colors.textPrimary }]}>{skill}</Text>
                </View>
              );
            })}
          </View>
        </Pressable>

        )}

        {profileTab === 'workexperience' && (
        <Pressable style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111', borderLeftColor: '#FFFFFF30' }]} onPress={() => router.push('/(tabs)/profile/edit-experience' as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Briefcase size={16} color={theme === 'dark' ? colors.textSecondary : 'rgba(255,255,255,0.6)'} strokeWidth={2.5} />
              <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Experience</Text>
            </View>
            <ChevronRight size={18} color={theme === 'dark' ? colors.textTertiary : 'rgba(255,255,255,0.4)'} />
          </View>
          {user.experience.map((exp, idx) => (
            <View key={exp.id} style={styles.timelineRow}>
              <View style={styles.timelineTrack}>
                {exp.isCurrent ? (
                  <View style={styles.timelineDotCurrentOuter}>
                    <View style={styles.timelineDotCurrentInner} />
                  </View>
                ) : (
                  <View style={[styles.timelineDot, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
                )}
                {idx < user.experience.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.infoValue, { color: '#FFFFFF' }]}>{exp.title}</Text>
                <View style={styles.infoLabelRow}>
                  <Briefcase size={12} color="rgba(255,255,255,0.5)" />
                  <Text style={[styles.infoLabel, { color: 'rgba(255,255,255,0.6)' }]}>{exp.company}</Text>
                </View>
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
              </View>
            </View>
          ))}
        </Pressable>

        )}

        {profileTab === 'education' && (
        <Pressable style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111', borderLeftColor: '#10B98160' }]} onPress={() => router.push('/(tabs)/profile/edit-education' as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <GraduationCap size={16} color={theme === 'dark' ? colors.textSecondary : 'rgba(255,255,255,0.6)'} strokeWidth={2.5} />
              <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Education</Text>
            </View>
            <ChevronRight size={18} color={theme === 'dark' ? colors.textTertiary : 'rgba(255,255,255,0.4)'} />
          </View>
          {user.education.map((edu, idx) => (
            <View key={edu.id} style={styles.timelineRow}>
              <View style={styles.timelineTrack}>
                <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                {idx < user.education.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.infoValue, { color: '#FFFFFF' }]}>{edu.degree} in {edu.field}</Text>
                <View style={styles.infoLabelRow}>
                  <GraduationCap size={12} color="rgba(255,255,255,0.5)" />
                  <Text style={[styles.infoLabel, { color: 'rgba(255,255,255,0.6)' }]}>{edu.institution}</Text>
                </View>
                <Text style={[styles.expDate, { color: 'rgba(255,255,255,0.4)' }]}>{edu.startDate} — {edu.endDate}</Text>
              </View>
            </View>
          ))}
        </Pressable>

        )}

        {profileTab === 'projects' && (
        <Pressable style={[styles.section, styles.borderedSection, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderLeftColor: '#F59E0B' }]} onPress={() => router.push('/(tabs)/profile/edit-projects' as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <FolderOpen size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Projects</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          {(user.projects || []).length === 0 && (
            <Text style={[styles.emptyFavoriteText, { color: colors.textTertiary }]}>No projects added yet. Tap to add one.</Text>
          )}
          {(user.projects || []).map((proj) => (
            <View key={proj.id} style={[styles.experienceItem, { marginBottom: 16 }]}>
              <View style={[styles.expIcon, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#EEEEEE' }]}>
                <FolderOpen size={18} color={colors.accent} />
              </View>
              <View style={styles.expContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.infoValue, { color: colors.secondary, flex: 1 }]}>{proj.title}</Text>
                  {proj.link ? (
                    <Pressable onPress={() => Linking.openURL(proj.link!)}>
                      <ExternalLink size={14} color={colors.accent} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.infoLabelRow}>
                  <FolderOpen size={12} color={colors.textTertiary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{proj.organization}</Text>
                </View>
                <Text style={[styles.expDate, { color: colors.textTertiary }]}>{proj.date}</Text>
                {proj.exposure.length > 0 && (
                  <View style={[styles.expTagsRow, { flexWrap: 'wrap' }]}>
                    {proj.exposure.map((tag, i) => (
                      <View key={i} style={[styles.expTagChip, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#F0F0F0' }]}>
                        <Text style={[styles.expTagText, { color: colors.textSecondary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {proj.bullets.map((b, i) => (
                  <Text key={i} style={[styles.expDesc, { color: colors.textSecondary, marginTop: i === 0 ? 6 : 2 }]}>• {b}</Text>
                ))}
              </View>
            </View>
          ))}
        </Pressable>
        )}

        {profileTab === 'documents' && (
          <View style={[styles.section, styles.borderedSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <FileText size={16} color={colors.textSecondary} strokeWidth={2.5} />
                <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Documents</Text>
              </View>
            </View>
            <View style={styles.docSubTabs}>
              {(['resumes', 'transcript', 'others'] as const).map((sub) => (
                <Pressable
                  key={sub}
                  style={[styles.docSubTab, docSubTab === sub && styles.docSubTabActive]}
                  onPress={() => setDocSubTab(sub)}
                >
                  <Text style={[styles.docSubTabText, { color: docSubTab === sub ? '#10B981' : colors.textSecondary }]}>
                    {sub === 'resumes' ? 'Resumes' : sub === 'transcript' ? 'Transcript' : 'Others'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {docSubTab === 'resumes' && (
              <View style={{ marginTop: 12 }}>
                {user.resumeUrl ? (
                  <View>
                    <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }} onPress={() => router.push('/resume-management' as any)}>
                      <Pencil size={14} color={colors.textTertiary} />
                      <Text style={{ fontSize: 12, color: colors.textTertiary, marginLeft: 4 }}>Manage</Text>
                    </Pressable>
                    <View style={[styles.docPreview, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                      <WebView
                        source={{ uri: user.resumeUrl.toLowerCase().endsWith('.pdf') ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(user.resumeUrl)}` : user.resumeUrl }}
                        style={styles.docPreviewWebview}
                        startInLoadingState
                        renderLoading={() => <ActivityIndicator style={{ flex: 1 }} />}
                      />
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => router.push('/resume-management' as any)}>
                    <Text style={[styles.emptyFavoriteText, { color: colors.textTertiary }]}>No resume uploaded yet. Tap to upload one.</Text>
                  </Pressable>
                )}
              </View>
            )}

            {(docSubTab === 'transcript' || docSubTab === 'others') && (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Pressable style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={async () => {
                if (!supabaseUserId) { Alert.alert('Error', 'You must be logged in.'); return; }
                try {
                  const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
                  if (result.canceled || !result.assets?.[0]) return;
                  const file = result.assets[0];
                  const originalName = file.name || `doc_${Date.now()}`;
                  setPendingDocFile({ uri: file.uri, mimeType: file.mimeType || 'application/octet-stream', originalName });
                  setDocRenameText(originalName);
                } catch (err: any) {
                  Alert.alert('Error', err?.message || 'Could not pick file');
                }
              }}>
                {isUploadingDoc ? <ActivityIndicator size="small" color={colors.surface} /> : <Upload size={16} color={colors.surface} />}
              </Pressable>
                </View>
            {(user.documents || []).filter(doc => {
              const name = (doc.name || '').toLowerCase();
              if (docSubTab === 'transcript') return name.includes('transcript');
              return !name.includes('transcript');
            }).length === 0 && (
              <Text style={[styles.emptyFavoriteText, { color: colors.textTertiary }]}>
                {docSubTab === 'transcript' ? 'No transcripts uploaded yet.' : 'No documents uploaded yet.'}
              </Text>
            )}
            {(user.documents || []).filter(doc => {
              const name = (doc.name || '').toLowerCase();
              if (docSubTab === 'transcript') return name.includes('transcript');
              return !name.includes('transcript');
            }).map((doc) => {
              const isPreviewing = previewingDocId === doc.id;
              const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf');
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.fileName || '');
              return (
                <View key={doc.id} style={{ marginBottom: 12 }}>
                  <View style={styles.experienceItem}>
                    <View style={[styles.expIcon, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#EEEEEE' }]}>
                      <FileText size={18} color={colors.accent} />
                    </View>
                    <View style={[styles.expContent, { flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.infoValue, { color: colors.secondary, fontSize: 14 }]}>{doc.name}</Text>
                        <Text style={[styles.expDate, { color: colors.textTertiary }]}>{new Date(doc.uploadedAt).toLocaleDateString()}</Text>
                      </View>
                      <Pressable onPress={() => setPreviewingDocId(isPreviewing ? null : doc.id)} style={{ marginRight: 12 }}>
                        <Eye size={18} color={isPreviewing ? colors.accent : colors.textTertiary} />
                      </Pressable>
                      <Pressable onPress={() => {
                        Alert.alert('Delete', `Remove ${doc.name}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => {
                            if (isPreviewing) setPreviewingDocId(null);
                            const updatedDocs = (user.documents || []).filter(d => d.id !== doc.id);
                            setUser(prev => ({ ...prev, documents: updatedDocs }));
                            saveProfile({ ...user, documents: updatedDocs });
                          }},
                        ]);
                      }}>
                        <Trash2 size={18} color={colors.error || '#EF4444'} />
                      </Pressable>
                    </View>
                  </View>
                  {isPreviewing && (
                    <View style={[styles.docPreview, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                      {isImage ? (
                        <Image source={{ uri: doc.fileUrl }} style={styles.docPreviewImage} contentFit="contain" />
                      ) : (
                        <WebView
                          source={{ uri: isPdf ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(doc.fileUrl)}` : doc.fileUrl }}
                          style={styles.docPreviewWebview}
                          startInLoadingState
                          renderLoading={() => <ActivityIndicator style={{ flex: 1 }} />}
                        />
                      )}
                    </View>
                  )}
                </View>
              );
            })}
              </View>
            )}
          </View>
        )}

        {profileTab === 'workexperience' && (
        <Pressable style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111', borderLeftColor: '#FFD70060' }]} onPress={() => router.push('/(tabs)/profile/edit-achievements' as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Trophy size={16} color={theme === 'dark' ? colors.textSecondary : 'rgba(255,215,0,0.8)'} strokeWidth={2.5} />
              <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Achievements & Honors</Text>
            </View>
            <ChevronRight size={18} color={theme === 'dark' ? colors.textTertiary : 'rgba(255,255,255,0.4)'} />
          </View>
          {user.achievements.map((ach) => (
            <View key={ach.id} style={{ marginBottom: 16 }}>
              <Text style={[styles.infoValue, { color: '#FFFFFF' }]}>{ach.title}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.expIcon, { backgroundColor: 'rgba(255,215,0,0.15)', width: 28, height: 28, borderRadius: 8 }]}>
                  <Trophy size={14} color="#FFD700" />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: 'rgba(255,255,255,0.6)' }]}>{ach.issuer}</Text>
                  <Text style={[styles.expDate, { color: 'rgba(255,255,255,0.4)' }]}>{ach.date}</Text>
                </View>
              </View>
            </View>
          ))}
        </Pressable>

        )}

        {profileTab === 'workexperience' && (
        <Pressable style={[styles.section, styles.borderedSection, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderLeftColor: '#F4511E' }]} onPress={() => router.push('/(tabs)/profile/edit-certifications' as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <BadgeCheck size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Licenses & Certifications</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          {user.certifications.map((cert) => (
            <View key={cert.id} style={{ marginBottom: 16 }}>
              <Text style={[styles.infoValue, { color: colors.secondary }]}>{cert.name}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.expIcon, { backgroundColor: theme === 'dark' ? colors.warningSoft : '#FFF3E0', width: 28, height: 28, borderRadius: 8 }]}>
                  <Award size={14} color={colors.warning} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{cert.issuingOrganization}</Text>
              </View>
            </View>
          ))}
        </Pressable>


        )}

        {profileTab === 'coverletter' && (
        <Pressable style={[styles.section, styles.darkSection, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#111111', borderLeftColor: '#7C4DFF60' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'coverletter' } } as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ScrollText size={16} color={theme === 'dark' ? colors.textSecondary : 'rgba(255,255,255,0.6)'} strokeWidth={2.5} />
              <Text style={[styles.darkSectionTitle, { color: theme === 'dark' ? colors.textPrimary : '#FFFFFF' }]}>Cover Letter</Text>
            </View>
            <ChevronRight size={18} color={theme === 'dark' ? colors.textTertiary : 'rgba(255,255,255,0.4)'} />
          </View>
          {user.coverLetter ? (
            <Text style={[styles.coverLetterText, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={4}>{user.coverLetter}</Text>
          ) : (
            <Text style={[styles.coverLetterPlaceholder, { color: 'rgba(255,255,255,0.35)' }]}>Add a cover letter to personalize your applications...</Text>
          )}
        </Pressable>

        )}

        {profileTab === 'personal' && (
        <Pressable style={[styles.demoSection, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderLeftColor: '#00897B' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'jobrequirements' } } as any)}>
          <View style={styles.demoHeader}>
            <ShieldCheck size={16} color={colors.textSecondary} strokeWidth={2.5} />
            <Text style={[styles.demoHeaderTitle, { color: colors.secondary }]}>Job Requirements</Text>
            <ChevronRight size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
          </View>
          <Text style={[styles.demoNote, { color: colors.textSecondary }]}>Your work authorization and visa status</Text>
          {user.workAuthorizationStatus ? (
            <View style={[styles.demoItem, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.workAuthorizationStatus}</Text>
              <View style={styles.infoLabelRow}>
                <ShieldCheck size={14} color={colors.textTertiary} />
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Work Authorization</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.coverLetterPlaceholder, { color: colors.textTertiary }]}>Add work authorization status...</Text>
          )}
        </Pressable>



        )}

        {profileTab === 'personal' && (
        <Pressable style={[styles.demoSection, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderLeftColor: '#8B5CF6' }]} onPress={() => router.push({ pathname: '/(tabs)/profile/edit-section', params: { section: 'equalopportunity' } } as any)}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Scale size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Equal Opportunity Information</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
          <Text style={[styles.demoNote, { color: colors.textSecondary }]}>This information is confidential and voluntary</Text>
          
          <View style={[styles.eeoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={user.veteranStatus ? [styles.infoValue, { color: colors.textPrimary }] : [styles.infoValueEmpty, { color: colors.textTertiary }]}>{user.veteranStatus || 'Not specified'}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.eeoIconWrap, { backgroundColor: '#8B5CF620' }]}>
                  <ShieldCheck size={14} color="#8B5CF6" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Veteran Status</Text>
              </View>
            </View>
          </View>

          <View style={[styles.eeoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={user.disabilityStatus ? [styles.infoValue, { color: colors.textPrimary }] : [styles.infoValueEmpty, { color: colors.textTertiary }]}>{user.disabilityStatus || 'Not specified'}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.eeoIconWrap, { backgroundColor: '#EF444420' }]}>
                  <Heart size={14} color="#EF4444" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Disability Status</Text>
              </View>
            </View>
          </View>

          <View style={[styles.eeoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={user.ethnicity ? [styles.infoValue, { color: colors.textPrimary }] : [styles.infoValueEmpty, { color: colors.textTertiary }]}>{user.ethnicity || 'Not specified'}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.eeoIconWrap, { backgroundColor: '#3B82F620' }]}>
                  <Laptop size={14} color="#3B82F6" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Ethnicity</Text>
              </View>
            </View>
          </View>

          <View style={[styles.eeoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={user.race ? [styles.infoValue, { color: colors.textPrimary }] : [styles.infoValueEmpty, { color: colors.textTertiary }]}>{user.race || 'Not specified'}</Text>
              <View style={styles.infoLabelRow}>
                <View style={[styles.eeoIconWrap, { backgroundColor: '#10B98120' }]}>
                  <Target size={14} color="#10B981" />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Race</Text>
              </View>
            </View>
          </View>

          {user.gender ? (
            <View style={[styles.eeoRow, { borderBottomColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.gender === 'prefer_not_to_say' ? 'Prefer not to say' : user.gender === 'male' ? 'Male' : 'Female'}</Text>
                <View style={styles.infoLabelRow}>
                  <View style={[styles.eeoIconWrap, { backgroundColor: '#F59E0B20' }]}>
                    <Star size={14} color="#F59E0B" />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Gender</Text>
                </View>
              </View>
            </View>
          ) : null}
        </Pressable>
        )}

        <View style={{ height: 40 }} />
      </AnimatedHeaderScrollView>

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
        <View style={styles.iosSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal}>
            <BlurView intensity={40} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Pressable>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.iosSheetContainer, { backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.iosSheetHandle} />
            <View style={styles.iosSheetNav}>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Text style={styles.iosNavCancel}>Cancel</Text>
              </Pressable>
              <Text style={[styles.iosNavTitle, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}>Contact Info</Text>
              <Pressable onPress={handleSaveContact} hitSlop={8}>
                <Text style={styles.iosNavSave}>Save</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.iosSheetScroll} contentContainerStyle={{ paddingBottom: 30 }}>
              <Text style={[styles.iosGroupLabel, { color: theme === 'dark' ? '#8E8E93' : '#6D6D72' }]}>PHONE</Text>
              <View style={[styles.iosFormGroup, { backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.iosFormRow}>
                  <Phone size={18} color="#10B981" style={{ marginRight: 12 }} />
                  <TextInput
                    style={[styles.iosFormInput, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}
                    placeholder="+1 (555) 123-4567"
                    placeholderTextColor="#C7C7CC"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Text style={[styles.iosGroupLabel, { color: theme === 'dark' ? '#8E8E93' : '#6D6D72' }]}>EMAIL</Text>
              <View style={[styles.iosFormGroup, { backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.iosFormRow}>
                  <Mail size={18} color="#3B82F6" style={{ marginRight: 12 }} />
                  <Text style={[styles.iosFormInputDisabled, { color: theme === 'dark' ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>{user.email}</Text>
                  <Lock size={14} color="#C7C7CC" />
                </View>
              </View>
              <Text style={[styles.iosGroupFooter, { color: theme === 'dark' ? '#8E8E93' : '#6D6D72' }]}>Email is auto-generated and cannot be changed.</Text>

              <Text style={[styles.iosGroupLabel, { color: theme === 'dark' ? '#8E8E93' : '#6D6D72' }]}>SOCIAL PROFILES</Text>
              <View style={[styles.iosFormGroup, { backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={[styles.iosFormRow, styles.iosFormRowBorder]}>
                  <Linkedin size={18} color="#0A66C2" style={{ marginRight: 12 }} />
                  <TextInput
                    style={[styles.iosFormInput, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}
                    placeholder="linkedin.com/in/..."
                    placeholderTextColor="#C7C7CC"
                    value={contactLinkedin}
                    onChangeText={setContactLinkedin}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.iosFormRow}>
                  <Github size={18} color={theme === 'dark' ? '#FFFFFF' : '#333333'} style={{ marginRight: 12 }} />
                  <TextInput
                    style={[styles.iosFormInput, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}
                    placeholder="github.com/..."
                    placeholderTextColor="#C7C7CC"
                    value={contactGithub}
                    onChangeText={setContactGithub}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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

      <Modal visible={!!pendingDocFile} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.secondary }]}>Name Your Document</Text>
              <Pressable onPress={() => setPendingDocFile(null)} style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}><X size={22} color={colors.textPrimary} /></Pressable>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>File name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.borderLight }]}
              value={docRenameText}
              onChangeText={setDocRenameText}
              autoFocus
              selectTextOnFocus
            />
            <Pressable
              style={[styles.modalSaveBtn, { backgroundColor: colors.secondary }]}
              disabled={isUploadingDoc}
              onPress={async () => {
                if (!pendingDocFile || !supabaseUserId || !docRenameText.trim()) return;
                setIsUploadingDoc(true);
                try {
                  const fileName = docRenameText.trim();
                  const filePath = `${supabaseUserId}/docs/${Date.now()}_${fileName}`;
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error('No session');
                  const formData = new FormData();
                  formData.append('', { uri: pendingDocFile.uri, type: pendingDocFile.mimeType, name: fileName } as any);
                  const uploadUrl = getStorageUploadUrl('documents', filePath);
                  const uploadRes = await fetch(uploadUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData });
                  if (!uploadRes.ok) throw new Error('Upload failed');
                  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/documents/${filePath}`;
                  const newDoc: UserDocument = { id: `doc${Date.now()}`, name: fileName, type: 'other', fileUrl: publicUrl, fileName, uploadedAt: new Date().toISOString() };
                  const updatedDocs = [...(user.documents || []), newDoc];
                  setUser(prev => ({ ...prev, documents: updatedDocs }));
                  saveProfile({ ...user, documents: updatedDocs });
                  setPendingDocFile(null);
                  Alert.alert('Success', 'Document uploaded!');
                } catch (err: any) {
                  Alert.alert('Upload Failed', err?.message || 'Unknown error');
                } finally {
                  setIsUploadingDoc(false);
                }
              }}
            >
              {isUploadingDoc ? <ActivityIndicator size="small" color={colors.surface} /> : <Check size={18} color={colors.surface} />}
              <Text style={styles.modalSaveBtnText}>{isUploadingDoc ? 'Uploading...' : 'Upload'}</Text>
            </Pressable>
          </KeyboardAvoidingView>
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
  contactItem: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  contactIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  infoValue: { fontSize: 19, fontFamily: 'Lora_600SemiBold', marginBottom: 4 },
  infoValueEmpty: { fontSize: 14, fontStyle: 'italic' as const, opacity: 0.5, marginBottom: 4 },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  infoLabel: { fontSize: 12, fontWeight: '500' as const },
  eeoRowVertical: { paddingVertical: 10, borderBottomWidth: 1 },
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
  squareRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  quickActionsRow: { gap: 8, marginTop: 4, paddingRight: 32 },
  quickActionBox: { width: 110, height: 110, borderRadius: 18, overflow: 'hidden' as const, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  quickActionGradient: { flex: 1, borderRadius: 18, padding: 12, alignItems: 'center', justifyContent: 'center' },
  quickActionImpact: { fontSize: 30, fontWeight: '900' as const, fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-black', textAlign: 'center' as const, color: '#FFFFFF' },
  quickActionLabel: { fontSize: 13, fontWeight: '700' as const, textAlign: 'center' as const, marginTop: 2 },
  quickActionSub: { fontSize: 9, fontWeight: '700' as const, textAlign: 'center' as const, marginTop: 3 },
  resumeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginTop: 8, backgroundColor: '#F4511E' },
  resumeBannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  resumeBannerTitle: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  resumeBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  eeoRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  eeoIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1565C0', borderRadius: 16, padding: 16, marginTop: 4, gap: 12 },
  statsIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800' as const, color: '#FFFFFF' },
  statSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statTitle: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, fontWeight: '500' as const },
  statDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },
  aiCard: { backgroundColor: Colors.accentSoft, borderRadius: 16, padding: 18, marginTop: 6, borderWidth: 1, borderColor: `${Colors.accent}20` },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiCardTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  aiCardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  aiOptimizeButton: { marginTop: 12, paddingVertical: 10, backgroundColor: Colors.secondary, borderRadius: 10, alignItems: 'center' },
  aiOptimizeText: { fontSize: 14, fontWeight: '700' as const, color: Colors.textInverse },
  contactCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 4, borderLeftWidth: 4, borderLeftColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  contactCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  contactText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' as const, flex: 1 },
  section: { marginTop: 4 },
  borderedSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, borderLeftWidth: 4, borderLeftColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  darkSection: { backgroundColor: '#111111', borderRadius: 16, padding: 16, borderWidth: 0, borderColor: 'transparent', borderLeftWidth: 4, borderLeftColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3 },
  darkSectionTitle: { fontSize: 15, fontFamily: 'Lora_700Bold', color: '#FFFFFF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: 'Lora_700Bold', color: Colors.secondary },
  addButton: { width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  prefChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  prefChipText: { fontSize: 12, fontWeight: '500' as const, color: Colors.textPrimary },
  prefChipTextActive: { color: Colors.surface },

  topSkillHint: { fontSize: 13, fontWeight: '600' as const, color: Colors.textTertiary },
  topSkillSubtext: { fontSize: 12, color: Colors.textTertiary, marginBottom: 10, marginTop: -4 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  skillTagTop: { backgroundColor: '#FFF8E1', borderWidth: 2, borderColor: '#D4A017' },
  skillTagText: { fontSize: 12, color: Colors.textInverse, fontWeight: '500' as const },
  skillTagTextTop: { color: '#8B6914' },
  addSkillBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  experienceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timelineRow: { flexDirection: 'row' as const },
  timelineTrack: { width: 24, alignItems: 'center' as const, paddingTop: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineDotCurrentOuter: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.25)', alignItems: 'center' as const, justifyContent: 'center' as const },
  timelineDotCurrentInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -4, borderRadius: 1 },
  timelineContent: { flex: 1, marginLeft: 12, paddingBottom: 20 },
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
  menuSection: { marginTop: 4, backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden' as const },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuItemPressed: { backgroundColor: Colors.background },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary, marginLeft: 12 },
  resumeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E65100', borderRadius: 16, padding: 16, marginTop: 4, gap: 12 },
  resumeCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  resumeCardText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  resumeCardSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  premiumCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 18, marginTop: 4 },
  premiumIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,215,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  premiumContent: { flex: 1, marginLeft: 14 },
  premiumTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFD700' },
  premiumSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  subscriptionBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginTop: 4 },
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
  shareCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E7D32', borderRadius: 16, padding: 16, marginTop: 4 },
  shareGradient: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  shareContent: { flex: 1, marginLeft: 14 },
  shareTitle: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  shareSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  shareBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  shareBadgeText: { fontSize: 11, fontWeight: '800' as const, color: '#FFFFFF' },
  demoSection: { marginTop: 4, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, borderLeftWidth: 4, borderLeftColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  demoHeaderTitle: { fontSize: 15, fontFamily: 'Lora_700Bold', color: Colors.secondary },
  demoNote: { fontSize: 13, fontWeight: '500' as const, marginBottom: 12 },
  demoItem: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  demoLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 2 },
  demoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' as const },
  demoValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  coverLetterText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
  coverLetterPlaceholder: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' as const, marginTop: 8 },
  completionPromptCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 4, borderWidth: 1, borderColor: Colors.borderLight },
  completionPromptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  completionPromptTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary },
  completionPromptText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  missingFieldsList: { gap: 4 },
  missingFieldItem: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  favoriteCompaniesCard: { backgroundColor: '#C62828', borderRadius: 16, padding: 16, marginTop: 4 },
  favoriteCompaniesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  favoriteCompanyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight },
  favoriteCompanyLogo: { width: 20, height: 20, borderRadius: 4 },
  favoriteCompanyText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' as const },
  emptyFavoriteText: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' as const },
  tabBar: { flexDirection: 'row', borderRadius: 14, padding: 4, marginTop: 4, borderWidth: 1 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabItemText: { fontSize: 13, fontWeight: '700' as const },
  tabScrollHint: { position: 'absolute' as const, right: 0, top: 0, bottom: 0, width: 32, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 14, borderBottomRightRadius: 14 },
  summaryStrip: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginTop: 4, borderWidth: 1 },
  summaryText: { fontSize: 12, fontWeight: '600' as const },
  docSubTabs: { flexDirection: 'row', gap: 6, marginTop: 4 },
  docSubTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'transparent' },
  docSubTabActive: { borderColor: '#10B981' },
  docSubTabText: { fontSize: 13, fontWeight: '600' as const },
  docPreview: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' as const, height: 360 },
  docPreviewImage: { width: '100%', height: '100%' },
  docPreviewWebview: { flex: 1 },
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
  iosSheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  iosSheetContainer: { borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '80%', paddingBottom: 34 },
  iosSheetHandle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC', alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  iosSheetNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  iosNavCancel: { fontSize: 17, fontWeight: '400' as const, color: '#007AFF' },
  iosNavTitle: { fontSize: 17, fontWeight: '600' as const },
  iosNavSave: { fontSize: 17, fontWeight: '600' as const, color: '#007AFF' },
  iosSheetScroll: { paddingHorizontal: 16 },
  iosGroupLabel: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08, marginTop: 20, marginBottom: 6, marginLeft: 16 },
  iosFormGroup: { borderRadius: 10, overflow: 'hidden' as const },
  iosFormRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
  iosFormRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8' },
  iosFormInput: { flex: 1, fontSize: 17, padding: 0 },
  iosFormInputDisabled: { flex: 1, fontSize: 17 },
  iosGroupFooter: { fontSize: 13, fontWeight: '400' as const, marginTop: 6, marginLeft: 16, marginBottom: 4 },
});

