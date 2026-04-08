import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  Image,
  BackHandler,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Heart, MapPin, Check, ChevronDown, Search, Globe, Clock, Wifi, Briefcase, ShieldCheck, Building2, FileText, Plus, Crown, Gift, Pencil, Upload } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import Colors, { darkColors } from '@/constants/colors';
import { mockJobs } from '@/mocks/jobs';
import { Job } from '@/types';
import JobCard from '@/components/JobCard';
import { MAJOR_CITIES } from '@/constants/cities';
import { mockUser } from '@/mocks/user';
import { fetchJobsFromSupabase, fetchRemainingJobs, incrementRightSwipe, addToLiveApplicationQueue, fetchAllCompanies, fetchUniqueJobTitles, fetchUniqueLocations, saveJob } from '@/lib/jobs';
import { computeMatchScores } from '@/lib/match-scoring';
import { supabase, getStorageUploadUrl } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { getSubscriptionStatus, decrementApplicationCount, getSubscriptionDisplayName } from '@/lib/subscription';
import { Resume } from '@/types';
import { WebView } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendWelcomeNotification, scheduleAllNotifications } from '@/lib/notifications';
import { getReferralStats, createReferralCode } from '@/lib/referral';
import FreeSwipesModal from '@/components/FreeSwipesModal';
import { Share as RNShare, Clipboard } from 'react-native';

const SEARCH_TAGS_KEY = 'nextquark_search_tags';
const WELCOME_NOTIF_SENT_KEY = 'nextquark_welcome_notif_sent';

// CARD_COLORS moved inside component to support dark mode

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function EmptyState({ colors, emptyFadeAnim, emptySlideAnim }: { colors: any; emptyFadeAnim: Animated.Value; emptySlideAnim: Animated.Value }) {
  useEffect(() => {
    emptyFadeAnim.setValue(0);
    emptySlideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(emptyFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(emptySlideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.emptyState}>
      <Animated.View style={{ opacity: emptyFadeAnim, transform: [{ translateY: emptySlideAnim }], alignItems: 'center' }}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All caught up!</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You've reviewed all available jobs. Check back later or adjust your filters for more matches.</Text>
      </Animated.View>
    </View>
  );
}
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODES = ['Remote', 'Onsite', 'Hybrid'];
const JOB_LEVELS = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Principal', 'Director', 'VP', 'C-Level'];
const JOB_REQUIREMENTS = ['H1B Sponsorship', 'Security Clearance', 'No Degree Required', 'Remote Only', 'Relocation Assistance'];
const POSTED_OPTIONS = [
  { label: 'Last 24 hours', value: '1d' },
  { label: 'Last 2 days', value: '2d' },
  { label: 'Last week', value: '1w' },
  { label: 'Last month', value: '1m' },
  { label: 'Last 3 months', value: '3m' },
];





interface Filters {
  cities: string[];
  jobTypes: string[];
  workModes: string[];
  postedWithin: string[];
  roles: string[];
  companies: string[];
  locations: string[];
  searchKeyword: string;
  searchTags: string[];
  jobLevels: string[];
  jobRequirements: string[];
}

const DEFAULT_FILTERS: Filters = {
  cities: [],
  jobTypes: [],
  workModes: [],
  postedWithin: [],
  roles: [],
  companies: [],
  locations: [],
  searchKeyword: '',
  searchTags: [],
  jobLevels: [],
  jobRequirements: [],
};

function getGreeting(): string {
  const hour = new Date().getHours();
  const name = mockUser.name.split(' ')[0];
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userName, swipedJobIds, addSwipedJobId, supabaseUserId, userProfile, isOnboardingComplete, refetchProfile } = useAuth();
  const colors = useColors();
  const isDark = colors.background === darkColors.background;
  const CARD_COLORS = [colors.surfaceElevated];
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  // Snapshot of swipedJobIds at deck-build time, so swiping doesn't recompute the deck
  const [deckSwipedSnapshot, setDeckSwipedSnapshot] = useState<Set<string>>(new Set(swipedJobIds));
  const [showFilters, setShowFilters] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [tempFilters, setTempFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [roleSearch, setRoleSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [feedMode, setFeedMode] = useState<'discover' | 'india' | 'foryou' | 'remote'>('india');
  const [notification, setNotification] = useState<{ visible: boolean; job?: Job } | null>(null);
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true);
  const [activeSearchTags, setActiveSearchTags] = useState<string[]>([]);
  const [loadingWordIndex, setLoadingWordIndex] = useState(0);
  const [showResumeSheet, setShowResumeSheet] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeSignedUrls, setResumeSignedUrls] = useState<Record<string, string>>({});
  const [loadingResumes, setLoadingResumes] = useState(false);
  const resumeSheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [resumePendingFile, setResumePendingFile] = useState<{ uri: string; mimeType: string; ext: string; originalName: string } | null>(null);
  const [resumeRenameText, setResumeRenameText] = useState('');
  const [resumeRenamingResume, setResumeRenamingResume] = useState<Resume | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [showOutOfSwipes, setShowOutOfSwipes] = useState(false);
  const [showFreeSwipes, setShowFreeSwipes] = useState(false);
  const outOfSwipesAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const filterSlideAnim = useRef(new Animated.Value(300)).current;
  // Each card gets a fresh Animated position. We use a ref keyed by currentIndex
  // so the position is always clean {0,0} for a new card and never carries over
  // the off-screen value from the previous swiped card.
  const positionRef = useRef(new Animated.ValueXY()).current;
  const [cardKey, setCardKey] = useState(0);
  const cardMountAnim = useRef(new Animated.Value(1)).current;
  const loadingWordOpacity = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const emptyFadeAnim = useRef(new Animated.Value(0)).current;
  const emptySlideAnim = useRef(new Animated.Value(30)).current;

  // Synced live counter: deterministic from a fixed epoch so all users see the same number
  const COUNTER_EPOCH = 1735689600000; // Jan 1, 2025 UTC
  const COUNTER_BASE = 1347892;
  const COUNTER_RATE = 3.7; // jobs per second
  const [liveJobCount, setLiveJobCount] = useState(() => {
    return Math.floor(COUNTER_BASE + ((Date.now() - COUNTER_EPOCH) / 1000) * COUNTER_RATE);
  });

  useEffect(() => {
    if (!isLoadingJobs) return;
    const interval = setInterval(() => {
      setLiveJobCount(Math.floor(COUNTER_BASE + ((Date.now() - COUNTER_EPOCH) / 1000) * COUNTER_RATE));
    }, 50);
    return () => clearInterval(interval);
  }, [isLoadingJobs]);

  const loadingWords = [
    'Stalking Your Resume 👀',
    'Matching Your Vibe ✨',
    'Finding Fire Roles 🔥',
    'Checking Locations 📍',
    'Filtering Mid Jobs 🚫',
    'Cooking Up Matches 🍳',
    'Rating the Opps 💯',
    'Curating Your Feed 🎯',
    'No Cap, Almost Done 🧢',
    'Slay Mode Loading 💅',
    'Yeeting Bad Fits 🗑️',
    'Rizzing Your Profile 😏',
    'Vibing With Algos 🤖',
    'Lowkey Optimizing 🧠',
    'Manifesting Offers 🔮',
    'Hitting Up Recruiters 📲',
    'Main Character Energy 🌟',
    'Unlocking Hidden Gems 💎',
    'Doing Heavy Lifting 🏋️',
    'Bet, We\'re Ready 🚀',
  ];

  // Send welcome notification once when user first reaches the jobs page after onboarding
  useEffect(() => {
    if (!isOnboardingComplete || !userName) return;
    AsyncStorage.getItem(WELCOME_NOTIF_SENT_KEY).then(sent => {
      if (!sent) {
        const firstName = userName.split(' ')[0] || '';
        sendWelcomeNotification(firstName).catch(() => {});
        scheduleAllNotifications(firstName).catch(() => {});
        AsyncStorage.setItem(WELCOME_NOTIF_SENT_KEY, 'true').catch(() => {});
      }
    });
  }, [isOnboardingComplete, userName]);

  const { data: supabaseJobs, isLoading: isLoadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['supabase-jobs'],
    queryFn: fetchJobsFromSupabase,
    staleTime: 1000 * 60 * 5,
  });

  const { data: remainingJobs } = useQuery({
    queryKey: ['supabase-jobs-remaining'],
    queryFn: fetchRemainingJobs,
    enabled: !!supabaseJobs && supabaseJobs.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Floating bounce + loading word animation
  useEffect(() => {
    if (!isLoadingJobs) {
      setLoadingWordIndex(0);
      loadingWordOpacity.setValue(0);
      floatAnim.setValue(0);
      return;
    }

    let wordTimeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    floatAnimation.start();

    const animateWord = () => {
      if (cancelled) return;
      Animated.timing(loadingWordOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        if (cancelled) return;
        wordTimeout = setTimeout(() => {
          if (cancelled) return;
          Animated.timing(loadingWordOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            if (cancelled) return;
            setLoadingWordIndex((prev) => (prev + 1) % loadingWords.length);
          });
        }, 250);
      });
    };
    animateWord();

    return () => {
      cancelled = true;
      if (wordTimeout) clearTimeout(wordTimeout);
      floatAnimation.stop();
      loadingWordOpacity.stopAnimation();
      loadingWordOpacity.setValue(0);
    };
  }, [isLoadingJobs, loadingWordIndex, loadingWordOpacity, floatAnim, loadingWords.length]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SEARCH_TAGS_KEY).then(data => {
        if (data) {
          const tags = JSON.parse(data) as string[];
          setActiveSearchTags(tags);
        }
      });
    }, [])
  );

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn: fetchAllCompanies,
    staleTime: 1000 * 60 * 10,
  });

  const { data: allCompaniesData = [] } = useQuery({
    queryKey: ['all-companies-data'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('name, logo_url').order('name', { ascending: true });
      if (error) console.log('Error fetching companies:', error);
      console.log('Companies fetched:', data?.length || 0);
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: allJobTitles = [] } = useQuery({
    queryKey: ['all-job-titles'],
    queryFn: fetchUniqueJobTitles,
    staleTime: 1000 * 60 * 10,
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ['all-locations'],
    queryFn: fetchUniqueLocations,
    staleTime: 1000 * 60 * 10,
  });

  const { data: referralStats, refetch: refetchReferralStats } = useQuery({
    queryKey: ['referral-stats-home', supabaseUserId],
    queryFn: () => getReferralStats(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-status', supabaseUserId],
    queryFn: () => getSubscriptionStatus(supabaseUserId!),
    enabled: !!supabaseUserId,
    refetchInterval: 60000,
  });

  const loadResumes = useCallback(async () => {
    if (!supabaseUserId) return;
    setLoadingResumes(true);
    try {
      const { data: files, error } = await supabase.storage.from('resumes').list(supabaseUserId);
      if (error) throw error;
      if (files && files.length > 0) {
        // Read custom name mapping from AsyncStorage
        let namesMap: Record<string, string> = {};
        try {
          const raw = await AsyncStorage.getItem('resume_custom_names');
          if (raw) namesMap = JSON.parse(raw);
        } catch {}
        const loaded: Resume[] = files.map((file, idx) => ({
          id: `r${idx}`,
          name: namesMap[file.name] || file.name.replace(/\.[^/.]+$/, '').replace(/^\d+\./, ''),
          fileName: file.name,
          uploadDate: file.created_at || new Date().toISOString(),
          isActive: idx === 0,
        }));
        // Restore active resume from AsyncStorage
        const savedActiveId = await AsyncStorage.getItem('active_resume_id');
        if (savedActiveId) {
          const hasIt = loaded.some(r => r.id === savedActiveId);
          if (hasIt) loaded.forEach(r => r.isActive = r.id === savedActiveId);
        }
        setResumes(loaded);
        // Load signed URLs
        const urls: Record<string, string> = {};
        for (const resume of loaded) {
          try {
            const { data } = await supabase.storage.from('resumes').createSignedUrl(`${supabaseUserId}/${resume.fileName}`, 3600);
            if (data?.signedUrl) urls[resume.id] = data.signedUrl;
          } catch (e) {}
        }
        setResumeSignedUrls(urls);
      }
    } catch (e) {
      console.log('Error loading resumes:', e);
    } finally {
      setLoadingResumes(false);
    }
  }, [supabaseUserId]);

  const openResumeSheet = useCallback(() => {
    loadResumes();
    resumeSheetAnim.setValue(SCREEN_HEIGHT);
    setShowResumeSheet(true);
    Animated.spring(resumeSheetAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 120 }).start();
  }, [resumeSheetAnim, loadResumes]);

  const closeResumeSheet = useCallback(() => {
    Animated.timing(resumeSheetAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(() => setShowResumeSheet(false));
  }, [resumeSheetAnim]);

  const setActiveResume = useCallback(async (id: string) => {
    setResumes(prev => prev.map(r => ({ ...r, isActive: r.id === id })));
    await AsyncStorage.setItem('active_resume_id', id);
  }, []);

  const getResumeLimit = useCallback(() => {
    if (!subscriptionData) return 1;
    switch (subscriptionData.subscription_type) {
      case 'premium': return 5;
      case 'pro': return 3;
      default: return 1;
    }
  }, [subscriptionData]);

  const handleSheetUpload = useCallback(async () => {
    if (!supabaseUserId) return;
    const limit = getResumeLimit();
    if (resumes.length >= limit) {
      const planType = subscriptionData?.subscription_type || 'free';
      const msg = planType === 'free'
        ? 'Free users can have 1 resume. Upgrade to Pro (3 resumes) or Premium (5 resumes).'
        : planType === 'pro'
        ? 'Pro users can have up to 3 resumes. Upgrade to Premium for 5 resumes.'
        : 'You have reached the maximum of 5 resumes.';
      Alert.alert('Resume Limit Reached', msg,
        planType !== 'premium'
          ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Upgrade', onPress: () => { closeResumeSheet(); router.push('/premium' as any); } }]
          : [{ text: 'OK' }]
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 5MB.');
        return;
      }
      const fileExt = file.name.split('.').pop() || 'pdf';
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      setResumePendingFile({ uri: file.uri, mimeType: file.mimeType || 'application/pdf', ext: fileExt, originalName });
      setResumeRenameText(originalName);
    } catch (error) {
      Alert.alert('Error', 'Failed to pick resume.');
    }
  }, [supabaseUserId, resumes.length, getResumeLimit, subscriptionData, closeResumeSheet, router]);

  const handleSheetConfirmUpload = useCallback(async () => {
    if (!resumePendingFile || !supabaseUserId || !resumeRenameText.trim()) return;
    setResumeUploading(true);
    try {
      const fileName = `${Date.now()}.${resumePendingFile.ext}`;
      const filePath = `${supabaseUserId}/${fileName}`;
      const formData = new FormData();
      formData.append('file', { uri: resumePendingFile.uri, type: resumePendingFile.mimeType, name: fileName } as any);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { Alert.alert('Error', 'Authentication required.'); setResumeUploading(false); return; }
      const uploadUrl = getStorageUploadUrl('resumes', filePath);
      const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      if (!response.ok) { Alert.alert('Upload Failed', 'Could not upload resume.'); setResumeUploading(false); return; }
      const customName = resumeRenameText.trim();
      const namesMap = JSON.parse(await AsyncStorage.getItem('resume_custom_names') || '{}');
      namesMap[fileName] = customName;
      await AsyncStorage.setItem('resume_custom_names', JSON.stringify(namesMap));
      const newResume: Resume = { id: `r${Date.now()}`, name: customName, fileName, uploadDate: new Date().toISOString(), isActive: resumes.length === 0 };
      setResumes(prev => [...prev, newResume]);
      setResumePendingFile(null);
      setResumeRenameText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload resume.');
    } finally {
      setResumeUploading(false);
    }
  }, [resumePendingFile, supabaseUserId, resumeRenameText, resumes.length]);

  const handleSheetRename = useCallback((resume: Resume) => {
    setResumeRenamingResume(resume);
    setResumeRenameText(resume.name);
  }, []);

  const handleSheetConfirmRename = useCallback(async () => {
    if (!resumeRenamingResume || !resumeRenameText.trim()) return;
    const newName = resumeRenameText.trim();
    const namesMap = JSON.parse(await AsyncStorage.getItem('resume_custom_names') || '{}');
    namesMap[resumeRenamingResume.fileName] = newName;
    await AsyncStorage.setItem('resume_custom_names', JSON.stringify(namesMap));
    setResumes(prev => prev.map(r => r.id === resumeRenamingResume.id ? { ...r, name: newName } : r));
    setResumeRenamingResume(null);
    setResumeRenameText('');
  }, [resumeRenamingResume, resumeRenameText]);

  const allJobs: Job[] = useMemo(() => {
    let jobsList: Job[] = [];
    if (supabaseJobs && supabaseJobs.length > 0) {
      jobsList = remainingJobs && remainingJobs.length > 0
        ? [...supabaseJobs, ...remainingJobs]
        : supabaseJobs;
    } else {
      jobsList = mockJobs;
    }

    // Compute real match scores based on user profile
    jobsList = computeMatchScores(userProfile || null, jobsList);
    
    // Shuffle the jobs array using a seeded approach so it's stable
    const shuffled = [...jobsList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, [supabaseJobs, remainingJobs, userProfile]);

  // Calculate For You count separately (constant regardless of active section)
  const forYouCount = useMemo(() => {
    let filtered = allJobs;
    if (swipedJobIds.length > 0) {
      const swipedSet = new Set(swipedJobIds);
      filtered = filtered.filter(job => !swipedSet.has(job.id));
    }
    // Apply India filter
    filtered = filtered.filter(job => {
      const keyword = 'india';
      return job.jobTitle.toLowerCase().includes(keyword) ||
        job.companyName.toLowerCase().includes(keyword) ||
        job.location.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword) ||
        job.skills.some(skill => skill.toLowerCase().includes(keyword));
    });
    // Apply desired roles filter
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

  const indiaCount = useMemo(() => {
    let filtered = allJobs;
    if (swipedJobIds.length > 0) {
      const swipedSet = new Set(swipedJobIds);
      filtered = filtered.filter(job => !swipedSet.has(job.id));
    }
    return filtered.filter(job => {
      const keyword = 'india';
      return job.jobTitle.toLowerCase().includes(keyword) ||
        job.companyName.toLowerCase().includes(keyword) ||
        job.location.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword) ||
        job.skills.some(skill => skill.toLowerCase().includes(keyword));
    }).length;
  }, [allJobs, swipedJobIds]);

  const remoteCount = useMemo(() => {
    let filtered = allJobs;
    if (swipedJobIds.length > 0) {
      const swipedSet = new Set(swipedJobIds);
      filtered = filtered.filter(job => !swipedSet.has(job.id));
    }
    return filtered.filter(job => {
      const keyword = 'remote';
      return job.jobTitle.toLowerCase().includes(keyword) ||
        job.companyName.toLowerCase().includes(keyword) ||
        job.location.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword) ||
        job.employmentType.toLowerCase().includes(keyword) ||
        job.locationType.toLowerCase().includes(keyword) ||
        job.skills.some(skill => skill.toLowerCase().includes(keyword));
    }).length;
  }, [allJobs, swipedJobIds]);

  const jobs: Job[] = useMemo(() => {
    let filtered = allJobs;

    // Use the snapshot taken at deck-build time, NOT the live swipedJobIds.
    // This prevents the deck from shifting when a card is swiped.
    if (deckSwipedSnapshot.size > 0) {
      filtered = filtered.filter(job => !deckSwipedSnapshot.has(job.id));
    }

    // For You mode: filter by India + user's desired roles
    if (feedMode === 'foryou') {
      filtered = filtered.filter(job => {
        const keyword = 'india';
        return job.jobTitle.toLowerCase().includes(keyword) ||
          job.companyName.toLowerCase().includes(keyword) ||
          job.location.toLowerCase().includes(keyword) ||
          job.description.toLowerCase().includes(keyword) ||
          job.employmentType.toLowerCase().includes(keyword) ||
          job.locationType.toLowerCase().includes(keyword) ||
          job.skills.some(skill => skill.toLowerCase().includes(keyword));
      });
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
    }

    // ACTIVE FILTERS (ALL FUNCTIONAL):
    // ✅ Search Tags (from search page)
    // ✅ Search Tags (from filter modal)
    // ✅ Search Keyword
    // ✅ Companies
    // ✅ Roles
    // ✅ Locations
    // ✅ Work Modes (Remote/Onsite/Hybrid)
    // ✅ Job Types (Full-time/Part-time/etc)
    // ✅ Posted Within (Date Range) - NOW WORKING
    // ✅ Job Levels - NOW WORKING (filters by experienceLevel, jobTitle, description)
    // ✅ Job Requirements - NOW WORKING (H1B, Security Clearance, No Degree, Remote Only, Relocation)

    // India mode: filter by India keyword
    if (feedMode === 'india') {
      filtered = filtered.filter(job => {
        const keyword = 'india';
        return job.jobTitle.toLowerCase().includes(keyword) ||
          job.companyName.toLowerCase().includes(keyword) ||
          job.location.toLowerCase().includes(keyword) ||
          job.description.toLowerCase().includes(keyword) ||
          job.employmentType.toLowerCase().includes(keyword) ||
          job.locationType.toLowerCase().includes(keyword) ||
          job.skills.some(skill => skill.toLowerCase().includes(keyword));
      });
    }

    // Remote mode: filter by remote keyword
    if (feedMode === 'remote') {
      filtered = filtered.filter(job => {
        const keyword = 'remote';
        return job.jobTitle.toLowerCase().includes(keyword) ||
          job.companyName.toLowerCase().includes(keyword) ||
          job.location.toLowerCase().includes(keyword) ||
          job.description.toLowerCase().includes(keyword) ||
          job.employmentType.toLowerCase().includes(keyword) ||
          job.locationType.toLowerCase().includes(keyword) ||
          job.skills.some(skill => skill.toLowerCase().includes(keyword));
      });
    }

    // Apply active search tags from search page
    if (activeSearchTags.length > 0) {
      filtered = filtered.filter(job => 
        activeSearchTags.some(tag => {
          const keyword = tag.toLowerCase();
          return job.jobTitle.toLowerCase().includes(keyword) ||
            job.companyName.toLowerCase().includes(keyword) ||
            job.location.toLowerCase().includes(keyword) ||
            job.description.toLowerCase().includes(keyword) ||
            job.employmentType.toLowerCase().includes(keyword) ||
            job.locationType.toLowerCase().includes(keyword) ||
            job.skills.some(skill => skill.toLowerCase().includes(keyword));
        })
      );
    }

    if (filters.searchTags.length > 0) {
      filtered = filtered.filter(job => 
        filters.searchTags.some(tag => {
          const keyword = tag.toLowerCase();
          return job.jobTitle.toLowerCase().includes(keyword) ||
            job.companyName.toLowerCase().includes(keyword) ||
            job.location.toLowerCase().includes(keyword) ||
            job.description.toLowerCase().includes(keyword) ||
            job.employmentType.toLowerCase().includes(keyword) ||
            job.locationType.toLowerCase().includes(keyword) ||
            job.skills.some(skill => skill.toLowerCase().includes(keyword));
        })
      );
    }

    if (filters.searchKeyword.trim()) {
      const keyword = filters.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(job => 
        job.jobTitle.toLowerCase().includes(keyword) ||
        job.companyName.toLowerCase().includes(keyword) ||
        job.location.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword) ||
        job.employmentType.toLowerCase().includes(keyword) ||
        job.locationType.toLowerCase().includes(keyword) ||
        job.skills.some(skill => skill.toLowerCase().includes(keyword))
      );
    }

    if (filters.companies.length > 0) {
      filtered = filtered.filter(job => 
        filters.companies.some(company => 
          job.companyName.toLowerCase().includes(company.toLowerCase())
        )
      );
    }

    if (filters.roles.length > 0) {
      filtered = filtered.filter(job => 
        filters.roles.some(role => 
          job.jobTitle.toLowerCase().includes(role.toLowerCase())
        )
      );
    }

    if (filters.locations.length > 0) {
      filtered = filtered.filter(job => 
        filters.locations.some(location => 
          job.location.toLowerCase().includes(location.toLowerCase())
        )
      );
    }

    if (filters.workModes.length > 0) {
      filtered = filtered.filter(job => 
        filters.workModes.some(mode => 
          job.locationType.toLowerCase() === mode.toLowerCase()
        )
      );
    }

    if (filters.jobTypes.length > 0) {
      filtered = filtered.filter(job => 
        filters.jobTypes.some(type => 
          job.employmentType.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    // Posted Within filter
    if (filters.postedWithin.length > 0) {
      const now = Date.now();
      filtered = filtered.filter(job => {
        // Parse the relative date string (e.g., "2 days ago", "Today", "1 week ago")
        const postedDate = job.postedDate.toLowerCase();
        let jobAgeMs = 0;
        
        if (postedDate.includes('today') || postedDate.includes('just now')) {
          jobAgeMs = 0;
        } else if (postedDate.includes('hour')) {
          const hours = parseInt(postedDate.match(/\d+/)?.[0] || '0');
          jobAgeMs = hours * 60 * 60 * 1000;
        } else if (postedDate.includes('day')) {
          const days = parseInt(postedDate.match(/\d+/)?.[0] || '0');
          jobAgeMs = days * 24 * 60 * 60 * 1000;
        } else if (postedDate.includes('week')) {
          const weeks = parseInt(postedDate.match(/\d+/)?.[0] || '0');
          jobAgeMs = weeks * 7 * 24 * 60 * 60 * 1000;
        } else if (postedDate.includes('month')) {
          const months = parseInt(postedDate.match(/\d+/)?.[0] || '0');
          jobAgeMs = months * 30 * 24 * 60 * 60 * 1000;
        }
        
        return filters.postedWithin.some(range => {
          let maxAgeMs = 0;
          switch (range) {
            case '1d': maxAgeMs = 24 * 60 * 60 * 1000; break;
            case '2d': maxAgeMs = 2 * 24 * 60 * 60 * 1000; break;
            case '1w': maxAgeMs = 7 * 24 * 60 * 60 * 1000; break;
            case '1m': maxAgeMs = 30 * 24 * 60 * 60 * 1000; break;
            case '3m': maxAgeMs = 90 * 24 * 60 * 60 * 1000; break;
          }
          return jobAgeMs <= maxAgeMs;
        });
      });
    }

    // Job Levels filter
    if (filters.jobLevels.length > 0) {
      filtered = filtered.filter(job => {
        const experienceLevel = job.experienceLevel?.toLowerCase() || '';
        return filters.jobLevels.some(level => {
          const levelLower = level.toLowerCase();
          return experienceLevel.includes(levelLower) || 
                 job.jobTitle.toLowerCase().includes(levelLower) ||
                 job.description.toLowerCase().includes(levelLower);
        });
      });
    }

    // Job Requirements filter
    if (filters.jobRequirements.length > 0) {
      filtered = filtered.filter(job => {
        const description = job.description.toLowerCase();
        const requirements = job.requirements?.map(r => r.toLowerCase()).join(' ') || '';
        const detailedReqs = job.detailedRequirements?.toLowerCase() || '';
        const allText = `${description} ${requirements} ${detailedReqs}`;
        
        return filters.jobRequirements.some(req => {
          switch (req) {
            case 'H1B Sponsorship':
              return allText.includes('h1b') || allText.includes('visa sponsor') || allText.includes('sponsorship');
            case 'Security Clearance':
              return allText.includes('security clearance') || allText.includes('clearance required');
            case 'No Degree Required':
              return allText.includes('no degree') || allText.includes('without degree') || !allText.includes('degree required');
            case 'Remote Only':
              return job.locationType === 'remote';
            case 'Relocation Assistance':
              return allText.includes('relocation') || allText.includes('relo');
            default:
              return allText.includes(req.toLowerCase());
          }
        });
      });
    }

    console.log(`Applied filters: ${allJobs.length} -> ${filtered.length} jobs`);
    return filtered;
  }, [allJobs, deckSwipedSnapshot, filters, feedMode, userProfile, activeSearchTags]);



  // Rebuild deck when feed mode, filters, or search tags change.
  // Take a fresh snapshot of swipedJobIds so the new deck excludes already-swiped jobs.
  const prevFeedModeRef = useRef(feedMode);
  const prevFiltersRef = useRef(filters);
  const prevActiveSearchTagsRef = useRef(activeSearchTags);
  useEffect(() => {
    const feedModeChanged = prevFeedModeRef.current !== feedMode;
    const filtersChanged = prevFiltersRef.current !== filters;
    const searchTagsChanged = prevActiveSearchTagsRef.current !== activeSearchTags;
    
    if (feedModeChanged || filtersChanged || searchTagsChanged) {
      prevFeedModeRef.current = feedMode;
      prevFiltersRef.current = filters;
      prevActiveSearchTagsRef.current = activeSearchTags;
      setDeckSwipedSnapshot(new Set(swipedJobIds));
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      positionRef.setValue({ x: 0, y: 0 });
      setCardKey(prev => prev + 1);
    }
  }, [feedMode, filters, activeSearchTags, positionRef, swipedJobIds]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = (userName || mockUser.name).split(' ')[0];
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [userName]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const rotation = positionRef.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = positionRef.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = positionRef.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const saveOpacity = positionRef.y.interpolate({
    inputRange: [-SCREEN_HEIGHT / 6, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = Animated.add(
    positionRef.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [0.08, 0, 0.08],
      extrapolate: 'clamp',
    }),
    positionRef.y.interpolate({
      inputRange: [-SCREEN_HEIGHT / 4, 0],
      outputRange: [0.08, 0],
      extrapolate: 'clamp',
    })
  ).interpolate({
    inputRange: [0, 0.08, 0.16],
    outputRange: [0.92, 1, 1],
    extrapolate: 'clamp',
  });

  const nextCardOpacity = Animated.add(
    positionRef.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [0.4, 0, 0.4],
      extrapolate: 'clamp',
    }),
    positionRef.y.interpolate({
      inputRange: [-SCREEN_HEIGHT / 4, 0],
      outputRange: [0.4, 0],
      extrapolate: 'clamp',
    })
  ).interpolate({
    inputRange: [0, 0.4, 0.8],
    outputRange: [0.6, 1, 1],
    extrapolate: 'clamp',
  });

  const handleSwipeComplete = useCallback(async (direction: string, skipPositionReset?: boolean) => {
    const idx = currentIndexRef.current;
    const currentJob = jobs[idx];
    if (!currentJob) return;

    console.log('🔒 Disabling swipe - handleSwipeComplete started for direction:', direction);
    setIsSwipeEnabled(false);
    triggerHaptic();
    console.log(`Swiped ${direction} on job:`, currentJob.jobTitle, 'at', currentJob.companyName);

    if (direction === 'right') {
      console.log('Right swipe detected, showing notification for:', currentJob.companyName, currentJob.jobTitle);
      console.log('Current job data:', JSON.stringify({ id: currentJob.id, company: currentJob.companyName, title: currentJob.jobTitle, logo: currentJob.companyLogo }));
      addSwipedJobId(currentJob.id);
      
      // Only show notification if we have valid job data
      if (currentJob.companyName && currentJob.jobTitle && currentJob.companyLogo) {
        setNotification({ 
          visible: true, 
          job: currentJob
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        console.warn('Skipping notification - incomplete job data:', { 
          hasCompany: !!currentJob.companyName, 
          hasTitle: !!currentJob.jobTitle, 
          hasLogo: !!currentJob.companyLogo 
        });
      }
      
      console.log('Incrementing right_swipe for job:', currentJob.id);
      incrementRightSwipe(currentJob.id).then(() => {
        console.log('right_swipe incremented successfully');
      });

      // Decrement application count
      if (supabaseUserId) {
        decrementApplicationCount(supabaseUserId).then(() => {
          queryClient.invalidateQueries({ queryKey: ['subscription-status', supabaseUserId] });
        });
      }

      if (supabaseUserId && userProfile) {
        console.log('Creating live_application_queue entry for job:', currentJob.id);
        console.log('Adding to live_application_queue for job:', currentJob.id, 'user:', supabaseUserId);
        addToLiveApplicationQueue(supabaseUserId, currentJob, userProfile).then((success) => {
          if (success) {
            console.log('Successfully added to live_application_queue for job:', currentJob.id);
            console.log('live_application_queue entry created successfully');
          } else {
            console.error('❌ FAILED to create live_application_queue entry for job:', currentJob.id);
            console.error('This means the job will NOT be in your applications queue!');
          }
        }).catch((error) => {
          console.error('❌ EXCEPTION adding to live_application_queue:', error);
        });

        // Send job application confirmation email
        // Note: Expo API routes only work on web, not in native apps
        if (Platform.OS === 'web') {
          try {
            console.log('Sending job application email to:', userProfile.email);
            const response = await fetch('/api/send-job-application-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userEmail: userProfile.email,
                userName: userProfile.name || userName,
                jobTitle: currentJob.jobTitle,
                companyName: currentJob.companyName,
              }),
            });
            
            const contentType = response.headers.get('content-type');
            if (response.ok && contentType?.includes('application/json')) {
              const result = await response.json();
              if (result.success) {
                console.log('Job application email sent successfully');
              } else {
                console.log('Failed to send job application email:', result.error);
              }
            } else {
              const text = await response.text();
              console.log('Email API error - Status:', response.status, 'Response:', text.substring(0, 200));
            }
          } catch (emailError) {
            console.log('Error sending job application email (non-critical):', emailError);
          }
        } else {
          console.log('Email sending skipped: API routes not available in native apps (APK/IPA)');
          console.log('To enable emails in production APK, deploy API routes to a server or use a service like SendGrid/Mailgun');
        }
      } else {
        console.error('❌ SKIPPING live_application_queue: Missing data');
        console.error('supabaseUserId:', supabaseUserId ? 'EXISTS' : 'MISSING');
        console.error('userProfile:', userProfile ? 'EXISTS' : 'MISSING');
        console.log('Skipping live_application_queue: no supabaseUserId or userProfile');
      }
    }

    if (direction === 'left') {
      console.log('Left swipe detected (pass) for job:', currentJob.id);
      addSwipedJobId(currentJob.id);
    }

    if (direction === 'up') {
      console.log('Up swipe detected, saving job:', currentJob.id);
      addSwipedJobId(currentJob.id);
      if (supabaseUserId) {
        saveJob(supabaseUserId, currentJob.id).then((success) => {
          if (success) {
            console.log('Job saved successfully');
          } else {
            console.log('Failed to save job');
          }
        });
      }
    }

    setSwipeDirection(null);
    
    const nextIndex = currentIndexRef.current + 1;
    currentIndexRef.current = nextIndex;
    
    if (!skipPositionReset) {
      positionRef.setValue({ x: 0, y: 0 });
    }
    cardMountAnim.setValue(0);
    
    setCardKey(prev => prev + 1);
    setCurrentIndex(nextIndex);
    
    // Scale-up fade-in: 0.92 scale + 0 opacity -> 1.0 scale + 1 opacity
    Animated.timing(cardMountAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      positionRef.setValue({ x: 0, y: 0 });
      setIsSwipeEnabled(true);
    });
  }, [positionRef, triggerHaptic, jobs, addSwipedJobId, supabaseUserId, userProfile, userName, queryClient]);

  const openOutOfSwipesSheet = useCallback(() => {
    outOfSwipesAnim.setValue(SCREEN_HEIGHT);
    setShowOutOfSwipes(true);
    Animated.spring(outOfSwipesAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 120,
    }).start();
  }, [outOfSwipesAnim]);

  const closeOutOfSwipesSheet = useCallback(() => {
    Animated.timing(outOfSwipesAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowOutOfSwipes(false));
  }, [outOfSwipesAnim]);

  // Handle Android back button for custom overlay pop-ups
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onBack = () => {
      if (showResumeSheet) { closeResumeSheet(); return true; }
      if (showOutOfSwipes) { closeOutOfSwipesSheet(); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [showResumeSheet, showOutOfSwipes, closeResumeSheet, closeOutOfSwipesSheet]);

  const forceSwipe = useCallback((direction: string) => {
    if (!isSwipeEnabled) {
      console.log('🚫 forceSwipe blocked - isSwipeEnabled:', isSwipeEnabled);
      return;
    }
    // Block right swipe (apply) and up swipe (save) when out of swipes
    if ((direction === 'right' || direction === 'up') && subscriptionData && subscriptionData.applications_remaining <= 0) {
      Animated.spring(positionRef, {
        toValue: { x: 0, y: 0 },
        friction: 5,
        useNativeDriver: true,
      }).start();
      setSwipeDirection(null);
      openOutOfSwipesSheet();
      return;
    }
    console.log('✅ forceSwipe allowed - direction:', direction, 'isSwipeEnabled:', isSwipeEnabled);
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : direction === 'left' ? -SCREEN_WIDTH * 1.5 : 0;
    const y = direction === 'up' ? -SCREEN_HEIGHT : 0;
    
    Animated.timing(positionRef, {
      toValue: { x, y },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      handleSwipeComplete(direction, true);
    });
  }, [positionRef, handleSwipeComplete, isSwipeEnabled, subscriptionData, openOutOfSwipesSheet]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!isSwipeEnabled) return false;
        return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        if (!isSwipeEnabled) return;
        positionRef.setValue({ x: gesture.dx, y: gesture.dy });
        if (gesture.dx > 50) setSwipeDirection('right');
        else if (gesture.dx < -50) setSwipeDirection('left');
        else if (gesture.dy < -50) setSwipeDirection('up');
        else setSwipeDirection(null);
      },
      onPanResponderRelease: (_, gesture) => {
        if (!isSwipeEnabled) return;
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          forceSwipe('up');
        } else {
          Animated.spring(positionRef, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
          setSwipeDirection(null);
        }
      },
    }),
    [isSwipeEnabled, positionRef, forceSwipe]
  );



  const toggleJobType = useCallback((type: string) => {
    setTempFilters((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type) ? prev.jobTypes.filter((t) => t !== type) : [...prev.jobTypes, type],
    }));
  }, []);

  const toggleWorkMode = useCallback((mode: string) => {
    setTempFilters((prev) => ({
      ...prev,
      workModes: prev.workModes.includes(mode) ? prev.workModes.filter((m) => m !== mode) : [...prev.workModes, mode],
    }));
  }, []);

  const togglePostedWithin = useCallback((value: string) => {
    setTempFilters((prev) => ({
      ...prev,
      postedWithin: prev.postedWithin.includes(value) ? prev.postedWithin.filter((v) => v !== value) : [...prev.postedWithin, value],
    }));
  }, []);

  const toggleCity = useCallback((city: string) => {
    setTempFilters((prev) => ({
      ...prev,
      cities: prev.cities.includes(city) ? prev.cities.filter((c) => c !== city) : [...prev.cities, city],
    }));
  }, []);

  const toggleRole = useCallback((role: string) => {
    setTempFilters((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  }, []);

  const toggleCompany = useCallback((company: string) => {
    setTempFilters((prev) => ({
      ...prev,
      companies: prev.companies.includes(company) ? prev.companies.filter((c) => c !== company) : [...prev.companies, company],
    }));
  }, []);

  const toggleLocation = useCallback((location: string) => {
    setTempFilters((prev) => ({
      ...prev,
      locations: prev.locations.includes(location) ? prev.locations.filter((l) => l !== location) : [...prev.locations, location],
    }));
  }, []);

  const toggleJobLevel = useCallback((level: string) => {
    setTempFilters((prev) => ({
      ...prev,
      jobLevels: prev.jobLevels.includes(level) ? prev.jobLevels.filter((l) => l !== level) : [...prev.jobLevels, level],
    }));
  }, []);

  const toggleJobRequirement = useCallback((req: string) => {
    setTempFilters((prev) => ({
      ...prev,
      jobRequirements: prev.jobRequirements.includes(req) ? prev.jobRequirements.filter((r) => r !== req) : [...prev.jobRequirements, req],
    }));
  }, []);

  const handleOpenFilters = useCallback(() => {
    setTempFilters({ ...filters });
    setShowFilters(true);
    filterSlideAnim.setValue(300);
    Animated.timing(filterSlideAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [filters, filterSlideAnim]);

  const handleApplyFilters = useCallback(() => {
    setFilters({ ...tempFilters });
    setShowFilters(false);
    console.log('Filters applied:', tempFilters);
  }, [tempFilters]);

  const handleResetFilters = useCallback(() => {
    setTempFilters({ ...DEFAULT_FILTERS });
    setFilters({ ...DEFAULT_FILTERS });
    setShowFilters(false);
  }, []);

  const clearSearchTags = useCallback(async () => {
    setActiveSearchTags([]);
    await AsyncStorage.removeItem(SEARCH_TAGS_KEY);
  }, []);

  const activeFilterCount = [
    filters.cities.length > 0,
    filters.jobTypes.length > 0,
    filters.workModes.length > 0,
    filters.postedWithin.length > 0,
    filters.roles.length > 0,
    filters.companies.length > 0,
    filters.locations.length > 0,
    filters.searchKeyword.trim().length > 0,
    filters.searchTags.length > 0,
    filters.jobLevels.length > 0,
    filters.jobRequirements.length > 0,
    activeSearchTags.length > 0,
  ].filter(Boolean).length;

  const handleKeywordSubmit = useCallback(() => {
    if (tempFilters.searchKeyword.trim()) {
      setTempFilters(prev => ({
        ...prev,
        searchTags: [...prev.searchTags, prev.searchKeyword.trim()],
        searchKeyword: '',
      }));
    }
  }, [tempFilters.searchKeyword]);

  const removeSearchTag = useCallback((tag: string) => {
    setTempFilters(prev => ({
      ...prev,
      searchTags: prev.searchTags.filter(t => t !== tag),
    }));
  }, []);

  const handleRoleSearchSubmit = useCallback(() => {
    if (roleSearch.trim()) {
      const matchingRoles = allJobTitles.filter(role => 
        role.toLowerCase().includes(roleSearch.toLowerCase())
      );
      setTempFilters(prev => ({
        ...prev,
        roles: [...new Set([...prev.roles, ...matchingRoles])],
      }));
      setRoleSearch('');
    }
  }, [roleSearch, allJobTitles]);

  const handleLocationSearchSubmit = useCallback(() => {
    if (locationSearch.trim()) {
      const matchingLocations = allLocations.filter(loc => 
        loc.toLowerCase().includes(locationSearch.toLowerCase())
      );
      setTempFilters(prev => ({
        ...prev,
        locations: [...new Set([...prev.locations, ...matchingLocations])],
      }));
      setLocationSearch('');
    }
  }, [locationSearch, allLocations]);

  const filteredRoles = roleSearch
    ? allJobTitles.filter((r) => r.toLowerCase().includes(roleSearch.toLowerCase()))
    : allJobTitles;

  const filteredCompanies = companySearch
    ? allCompaniesData.filter((c: any) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
    : allCompaniesData;

  const filteredLocations = locationSearch
    ? allLocations.filter((l) => l.toLowerCase().includes(locationSearch.toLowerCase()))
    : allLocations;

  // Mount animation interpolations
  const mountScale = cardMountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const renderCards = () => {
    if (currentIndex >= jobs.length) return null;
    
    const currentJob = jobs[currentIndex];
    const nextJob = currentIndex + 1 < jobs.length ? jobs[currentIndex + 1] : null;
    
    const currentHash = currentJob.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const currentColor = CARD_COLORS[currentHash % CARD_COLORS.length];
    
    return (
      <>
        {nextJob && (
          <Animated.View
            key={`next-${nextJob.id}`}
            style={[
              styles.cardWrapper,
              { transform: [{ scale: nextCardScale }], opacity: nextCardOpacity },
            ]}
          >
            <JobCard job={nextJob} backgroundColor={CARD_COLORS[nextJob.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % CARD_COLORS.length]} showMatchBadge={feedMode === 'foryou'} />
          </Animated.View>
        )}
        <Animated.View
          key={`current-${cardKey}-${currentJob.id}`}
          style={[
            styles.cardWrapper,
            {
              opacity: cardMountAnim,
              transform: [
                { scale: mountScale },
                { translateX: positionRef.x },
                { translateY: positionRef.y },
                { rotate: rotation },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.overlayLabel, styles.likeLabel, { opacity: likeOpacity }]}>
            <Text style={styles.likeLabelText}>APPLY</Text>
          </Animated.View>
          <Animated.View style={[styles.overlayLabel, styles.nopeLabel, { opacity: nopeOpacity }]}>
            <Text style={styles.nopeLabelText}>PASS</Text>
          </Animated.View>
          <Animated.View style={[styles.overlayLabel, styles.saveLabel, { opacity: saveOpacity }]}>
            <Text style={styles.saveLabelText}>SAVE</Text>
          </Animated.View>
          <JobCard job={currentJob} backgroundColor={currentColor} showMatchBadge={feedMode === 'foryou'} />
        </Animated.View>
      </>
    );
  };

  const remainingJobCount = jobs.length - currentIndex;

  return (
    <TabTransitionWrapper routeName="home">
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {notification?.visible && notification.job && (
        <View style={[styles.notificationContainer, { top: insets.top + 10 }]}>
          <View style={styles.notificationCard}>
            <Image source={{ uri: notification.job.companyLogo }} style={styles.notificationLogo} />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Application Submitted</Text>
              <Text style={styles.notificationCompany}>{notification.job.companyName}</Text>
              <Text style={styles.notificationRole}>{notification.job.jobTitle}</Text>
            </View>
          </View>
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoRow}>
            <Image source={require('@/assets/images/header.png')} style={styles.appLogo} resizeMode="contain" />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.headerTitle, { color: colors.secondary }]}>{greeting}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            {isLoadingJobs 
              ? 'Loading jobs...' 
              : subscriptionData 
              ? `${subscriptionData.applications_remaining} applications left this month`
              : `${remainingJobCount} jobs left today`
            }
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerButtonsRow}>
            <Pressable style={[styles.headerButton, { borderColor: colors.textPrimary }]} onPress={() => router.push('/(tabs)/(home)/search' as any)}>
              <Search size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={[styles.headerButton, { borderColor: colors.textPrimary }]} onPress={handleOpenFilters}>
              <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={[styles.headerButton, { borderColor: colors.textPrimary }]} onPress={openResumeSheet}>
              <FileText size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
          {subscriptionData && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[
                styles.subscriptionBadge,
                subscriptionData.subscription_type === 'free' && styles.subscriptionBadgeFree,
                subscriptionData.subscription_type === 'pro' && styles.subscriptionBadgePro,
                subscriptionData.subscription_type === 'premium' && styles.subscriptionBadgePremium,
              ]}>
                <Text style={styles.subscriptionBadgeText}>
                  {subscriptionData.subscription_type.toUpperCase()}
                </Text>
              </View>
              <Pressable
                onPress={async () => {
                  if (!referralStats?.referralCode && supabaseUserId) {
                    await createReferralCode(supabaseUserId, userName || 'User');
                    await refetchReferralStats();
                  }
                  setShowFreeSwipes(true);
                }}
              >
                <Gift size={28} color="#EF4444" />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexShrink: 0 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedToggleRow}>
        <Pressable
          style={[styles.feedToggleBtn, feedMode === 'discover'
            ? { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
            : { backgroundColor: 'transparent', borderColor: isDark ? '#FFFFFF' : '#000000', borderWidth: 1 }]}
          onPress={() => setFeedMode('discover')}
        >
          <Globe size={14} color={feedMode === 'discover' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000')} />
          <Text style={[styles.feedToggleText, { color: feedMode === 'discover' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>Global</Text>
          <View style={[styles.feedToggleBadge, { backgroundColor: feedMode === 'discover' ? (isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)') }]}>
            <Text style={[styles.feedToggleBadgeText, { color: feedMode === 'discover' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>1.3Mn+</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.feedToggleBtn, feedMode === 'india'
            ? { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
            : { backgroundColor: 'transparent', borderColor: isDark ? '#FFFFFF' : '#000000', borderWidth: 1 }]}
          onPress={() => setFeedMode('india')}
        >
          <Text style={{ fontSize: 14 }}>🇮🇳</Text>
          <Text style={[styles.feedToggleText, { color: feedMode === 'india' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>India</Text>
          <View style={[styles.feedToggleBadge, { backgroundColor: feedMode === 'india' ? (isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)') }]}>
            <Text style={[styles.feedToggleBadgeText, { color: feedMode === 'india' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>19k+</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.feedToggleBtn, feedMode === 'foryou'
            ? { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
            : { backgroundColor: 'transparent', borderColor: isDark ? '#FFFFFF' : '#000000', borderWidth: 1 }]}
          onPress={() => setFeedMode('foryou')}
        >
          <Heart size={14} color={feedMode === 'foryou' ? '#EF4444' : (isDark ? '#FFFFFF' : '#000000')} fill={feedMode === 'foryou' ? '#EF4444' : 'transparent'} />
          <Text style={[styles.feedToggleText, { color: feedMode === 'foryou' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>For You</Text>
          <View style={[styles.feedToggleBadge, { backgroundColor: feedMode === 'foryou' ? (isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)') }]}>
            <Text style={[styles.feedToggleBadgeText, { color: feedMode === 'foryou' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>{forYouCount}</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.feedToggleBtn, feedMode === 'remote'
            ? { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
            : { backgroundColor: 'transparent', borderColor: isDark ? '#FFFFFF' : '#000000', borderWidth: 1 }]}
          onPress={() => setFeedMode('remote')}
        >
          <Text style={{ fontSize: 14 }}>🌴</Text>
          <Text style={[styles.feedToggleText, { color: feedMode === 'remote' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>Remote</Text>
          <View style={[styles.feedToggleBadge, { backgroundColor: feedMode === 'remote' ? (isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)') }]}>
            <Text style={[styles.feedToggleBadgeText, { color: feedMode === 'remote' ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000') }]}>{remoteCount}</Text>
          </View>
        </Pressable>
      </ScrollView>
      </View>

      {activeSearchTags.length > 0 && (
        <View style={styles.activeSearchContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeSearchScroll}>
            {activeSearchTags.map((tag, idx) => (
              <View key={idx} style={styles.activeSearchTag}>
                <Text style={styles.activeSearchTagText}>{tag}</Text>
              </View>
            ))}
            {activeSearchTags.length > 0 && (
              <Pressable style={styles.clearSearchButton} onPress={clearSearchTags}>
                <Text style={styles.clearSearchText}>Clear</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.cardsContainer}>
        {isLoadingJobs ? (
          <View style={styles.loadingContainer}>
            <View style={styles.floatWrapper}>
              <Animated.View
                style={[
                  styles.floatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                    transform: [
                      { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
                    ],
                  },
                ]}
              >
                <View style={[styles.floatCardInner, { backgroundColor: colors.background }]}>
                  <View style={styles.floatCardHeader}>
                    <View style={[styles.floatCardLogo, { backgroundColor: '#D5F5E3' }]} />
                    <View style={{ flex: 1 }}>
                      <View style={[styles.floatCardLine, { backgroundColor: colors.borderLight, width: '75%' }]} />
                      <View style={[styles.floatCardLine, { backgroundColor: colors.borderLight, width: '50%', marginTop: 6 }]} />
                    </View>
                  </View>
                  <View style={[styles.floatCardLine, { backgroundColor: colors.borderLight, width: '90%', height: 12, marginTop: 16 }]} />
                  <View style={[styles.floatCardLine, { backgroundColor: colors.borderLight, width: '60%', height: 8, marginTop: 8 }]} />
                  <View style={styles.floatCardChips}>
                    <View style={[styles.floatChip, { backgroundColor: colors.borderLight }]} />
                    <View style={[styles.floatChip, { backgroundColor: colors.borderLight, width: 50 }]} />
                    <View style={[styles.floatChip, { backgroundColor: colors.borderLight, width: 40 }]} />
                  </View>
                </View>
              </Animated.View>
              <Animated.View
                style={[
                  styles.floatShadow,
                  {
                    transform: [
                      { scaleX: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) },
                      { scaleY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) },
                    ],
                    opacity: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.08] }),
                  },
                ]}
              />
            </View>
            <Animated.Text style={[styles.loadingWordText, { color: colors.textPrimary, opacity: loadingWordOpacity }]}>
              {loadingWords[loadingWordIndex]}
            </Animated.Text>
            <Text style={[styles.liveCounterText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {liveJobCount.toLocaleString()} jobs added and counting
            </Text>
          </View>
        ) : currentIndex >= jobs.length ? (
          <EmptyState colors={colors} emptyFadeAnim={emptyFadeAnim} emptySlideAnim={emptySlideAnim} />
        ) : (
          renderCards()
        )}
      </View>


      {showOutOfSwipes && (
        <View style={styles.swipeModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeOutOfSwipesSheet} />
          <Animated.View style={[styles.swipeModalCard, { transform: [{ translateY: outOfSwipesAnim }] }]}>
            <Heart size={28} color="#EF4444" fill="#EF4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.sheetTitle}>You're all out buddy 💔</Text>
            <Text style={styles.sheetSubtitle}>No more free swipes left. Level up your plan or share the vibe to keep swiping!</Text>
            <Pressable style={styles.sheetUpgradeBtn} onPress={() => { closeOutOfSwipesSheet(); router.push('/premium' as any); }}>
              <Text style={styles.sheetUpgradeBtnText}>Upgrade to Pro</Text>
            </Pressable>
            <Pressable
              style={styles.sheetShareBtn}
              onPress={async () => {
                if (supabaseUserId) {
                  const { getReferralStats, createReferralCode } = await import('@/lib/referral');
                  const stats = await getReferralStats(supabaseUserId);
                  if (!stats?.referralCode) {
                    await createReferralCode(supabaseUserId, userName || 'User');
                  }
                  const updatedStats = await getReferralStats(supabaseUserId);
                  if (updatedStats?.referralCode) {
                    try {
                      const { Share } = await import('react-native');
                      await Share.share({
                        message: `Hey! Have you heard about NextQuark? It's Tinder for jobs - swipe right to apply for your dream job! Join with my referral code ${updatedStats.referralCode} and get 5 free application swipes to get started. Download now!`,
                      });
                    } catch (error) {
                      console.error('Error sharing:', error);
                    }
                  }
                }
              }}
            >
              <Text style={styles.sheetShareBtnText}>Share to Earn Free Swipes</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {showResumeSheet && (
        <View style={styles.resumeSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeResumeSheet}>
            <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Pressable>
          <Animated.View style={[styles.resumeSheetContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', transform: [{ translateY: resumeSheetAnim }] }]}>
            <View style={styles.resumeSheetHandle} />
            <View style={[styles.resumeSheetHeader, !isDark && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8' }]}>
              <View style={{ width: 50 }} />
              <Text style={[styles.resumeSheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Resumes</Text>
              <Pressable onPress={closeResumeSheet} hitSlop={8}>
                <Text style={styles.resumeSheetDoneText}>Done</Text>
              </Pressable>
            </View>

            {loadingResumes ? (
              <View style={styles.resumeSheetLoading}>
                <Text style={[styles.resumeSheetLoadingText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>Loading resumes...</Text>
              </View>
            ) : resumes.length === 0 ? (
              <View style={styles.resumeSheetEmpty}>
                <FileText size={36} color="#C7C7CC" />
                <Text style={[styles.resumeSheetEmptyText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>No resumes uploaded yet</Text>
                <Pressable style={styles.resumeSheetUploadBtn} onPress={handleSheetUpload}>
                  <Text style={styles.resumeSheetUploadBtnText}>Upload Resume</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.resumeSheetScroll} contentContainerStyle={{ paddingBottom: 30 }}>
                {(() => {
                  const activeResume = resumes.find(r => r.isActive);
                  const activeUrl = activeResume ? resumeSignedUrls[activeResume.id] : null;
                  if (activeResume && activeUrl && Platform.OS !== 'web') {
                    const previewUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activeUrl)}`;
                    return (
                      <View style={[styles.iosResumePreview, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                        <WebView source={{ uri: previewUrl }} style={{ flex: 1, borderRadius: 10 }} scalesPageToFit scrollEnabled={false} />
                      </View>
                    );
                  } else if (activeResume && activeUrl) {
                    return (
                      <View style={[styles.iosResumePreviewFallback, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                        <FileText size={28} color={isDark ? '#8E8E93' : '#C7C7CC'} />
                        <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 6 }}>Active Resume</Text>
                      </View>
                    );
                  }
                  return null;
                })()}
                <View style={[styles.iosGroupedSection, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                  {resumes.map((resume, idx) => (
                    <Pressable
                      key={resume.id}
                      style={[styles.iosGroupedRow, idx < resumes.length - 1 && styles.iosGroupedRowBorder]}
                      onPress={() => setActiveResume(resume.id)}
                    >
                      <View style={styles.iosGroupedRowContent}>
                        <FileText size={20} color={resume.isActive ? '#007AFF' : (isDark ? '#8E8E93' : '#C7C7CC')} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.iosGroupedRowTitle, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={1}>{resume.name}</Text>
                          <Text style={[styles.iosGroupedRowSubtitle, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>{new Date(resume.uploadDate).toLocaleDateString()}</Text>
                        </View>
                        <Pressable onPress={() => handleSheetRename(resume)} hitSlop={8} style={{ padding: 4 }}>
                          <Pencil size={16} color={isDark ? '#8E8E93' : '#C7C7CC'} />
                        </Pressable>
                        {resume.isActive && <Check size={20} color="#007AFF" strokeWidth={3} />}
                      </View>
                    </Pressable>
                  ))}
                </View>

              </ScrollView>
            )}
            <View style={[styles.iosResumeActions, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
              <Pressable style={[styles.iosResumeActionBtn, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]} onPress={handleSheetUpload}>
                <Plus size={15} color="#007AFF" strokeWidth={2.5} />
                <Text style={styles.iosResumeActionText}>Add New</Text>
              </Pressable>
              <Pressable style={[styles.iosResumeActionBtn, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]} onPress={() => { closeResumeSheet(); router.push('/resume-management' as any); }}>
                <FileText size={15} color="#007AFF" />
                <Text style={styles.iosResumeActionText}>Manage</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}

      <Modal visible={!!resumePendingFile || !!resumeRenamingResume} animationType="slide" transparent onRequestClose={() => { setResumePendingFile(null); setResumeRenamingResume(null); setResumeRenameText(''); }}>
        <View style={styles.resumeRenameOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.resumeRenameContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.resumeRenameHeader}>
              <Text style={[styles.resumeRenameTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{resumeRenamingResume ? 'Rename Resume' : 'Name Your Resume'}</Text>
              <Pressable onPress={() => { setResumePendingFile(null); setResumeRenamingResume(null); setResumeRenameText(''); }} hitSlop={8}>
                <Text style={{ fontSize: 17, color: '#007AFF' }}>Cancel</Text>
              </Pressable>
            </View>
            <TextInput
              style={[styles.resumeRenameInput, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#3A3A3C' : '#C6C6C8' }]}
              value={resumeRenameText}
              onChangeText={setResumeRenameText}
              autoFocus
              selectTextOnFocus
              placeholder="e.g. Software Engineer Resume"
              placeholderTextColor="#8E8E93"
            />
            <Pressable
              style={[styles.resumeRenameConfirmBtn, (!resumeRenameText.trim() || resumeUploading) && { opacity: 0.4 }]}
              onPress={resumeRenamingResume ? handleSheetConfirmRename : handleSheetConfirmUpload}
              disabled={!resumeRenameText.trim() || (resumeUploading && !resumeRenamingResume)}
            >
              {resumeUploading && !resumeRenamingResume ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.resumeRenameConfirmBtnText}>{resumeRenamingResume ? 'Rename' : 'Upload'}</Text>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.filterOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFilters(false)}>
            <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Pressable>
          <Animated.View style={[styles.filterContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', transform: [{ translateY: filterSlideAnim }] }]}>
            <View style={styles.iosFilterHandle} />
            <View style={[styles.iosFilterNav, !isDark && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8' }]}>
              <Pressable onPress={handleResetFilters} hitSlop={8}>
                <Text style={styles.iosFilterReset}>Reset</Text>
              </Pressable>
              <Text style={[styles.iosFilterTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Filter Jobs</Text>
              <Pressable onPress={handleApplyFilters} hitSlop={8}>
                <Text style={styles.iosFilterApply}>Apply</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScroll}>


            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>POSTED WITHIN</Text>
              <View style={[styles.iosFilterGroupBox, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.chipGrid}>
                  {POSTED_OPTIONS.map((opt) => {
                    const selected = tempFilters.postedWithin.includes(opt.value);
                    return (
                      <Pressable key={opt.value} style={[styles.iosFilterChip, selected && styles.iosFilterChipActive]} onPress={() => togglePostedWithin(opt.value)}>
                        <Text style={[styles.iosFilterChipText, selected && styles.iosFilterChipTextActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>WORK MODE</Text>
              <View style={[styles.iosFilterGroupBox, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.chipGrid}>
                  {WORK_MODES.map((mode) => {
                    const selected = tempFilters.workModes.includes(mode);
                    return (
                      <Pressable key={mode} style={[styles.iosFilterChip, selected && styles.iosFilterChipActive]} onPress={() => toggleWorkMode(mode)}>
                        <Text style={[styles.iosFilterChipText, selected && styles.iosFilterChipTextActive]}>{mode}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>JOB TYPE</Text>
              <View style={[styles.iosFilterGroupBox, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.chipGrid}>
                  {JOB_TYPES.map((type) => {
                    const selected = tempFilters.jobTypes.includes(type);
                    return (
                      <Pressable key={type} style={[styles.iosFilterChip, selected && styles.iosFilterChipActive]} onPress={() => toggleJobType(type)}>
                        <Text style={[styles.iosFilterChipText, selected && styles.iosFilterChipTextActive]}>{type}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>JOB LEVEL</Text>
              <View style={[styles.iosFilterGroupBox, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.chipGrid}>
                  {JOB_LEVELS.map((level) => {
                    const selected = tempFilters.jobLevels.includes(level);
                    return (
                      <Pressable key={level} style={[styles.iosFilterChip, selected && styles.iosFilterChipActive]} onPress={() => toggleJobLevel(level)}>
                        <Text style={[styles.iosFilterChipText, selected && styles.iosFilterChipTextActive]}>{level}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>JOB REQUIREMENTS</Text>
              <View style={[styles.iosFilterGroupBox, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <View style={styles.chipGrid}>
                  {JOB_REQUIREMENTS.map((req) => {
                    const selected = tempFilters.jobRequirements.includes(req);
                    return (
                      <Pressable key={req} style={[styles.iosFilterChip, selected && styles.iosFilterChipActive]} onPress={() => toggleJobRequirement(req)}>
                        <Text style={[styles.iosFilterChipText, selected && styles.iosFilterChipTextActive]}>{req}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>COMPANY</Text>
              <Pressable style={[styles.iosFilterPickerRow, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]} onPress={() => setShowCompanyPicker(true)}>
                <Building2 size={18} color={isDark ? '#8E8E93' : '#C7C7CC'} />
                <Text style={[styles.iosFilterPickerText, { color: tempFilters.companies.length > 0 ? (isDark ? '#FFFFFF' : '#000000') : '#C7C7CC' }]}>
                  {tempFilters.companies.length > 0 ? `${tempFilters.companies.length} companies selected` : 'Select companies...'}
                </Text>
                <ChevronDown size={16} color={isDark ? '#8E8E93' : '#C7C7CC'} />
              </Pressable>
              {tempFilters.companies.length > 0 && (
                <View style={styles.selectedCitiesWrap}>
                  {tempFilters.companies.map((company) => (
                    <Pressable key={company} style={[styles.iosFilterChip, styles.iosFilterChipActive]} onPress={() => toggleCompany(company)}>
                      <Text style={styles.iosFilterChipTextActive}>{company}</Text>
                      <X size={10} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>ROLE</Text>
              <Pressable style={[styles.iosFilterPickerRow, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]} onPress={() => setShowRolePicker(true)}>
                <Ionicons name="person-outline" size={18} color={isDark ? '#8E8E93' : '#C7C7CC'} />
                <Text style={[styles.iosFilterPickerText, { color: tempFilters.roles.length > 0 ? (isDark ? '#FFFFFF' : '#000000') : '#C7C7CC' }]}>
                  {tempFilters.roles.length > 0 ? `${tempFilters.roles.length} roles selected` : 'Select roles...'}
                </Text>
                <ChevronDown size={16} color={isDark ? '#8E8E93' : '#C7C7CC'} />
              </Pressable>
              {tempFilters.roles.length > 0 && (
                <View style={styles.selectedCitiesWrap}>
                  {tempFilters.roles.map((role) => (
                    <Pressable key={role} style={[styles.iosFilterChip, styles.iosFilterChipActive]} onPress={() => toggleRole(role)}>
                      <Text style={styles.iosFilterChipTextActive}>{role}</Text>
                      <X size={10} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.iosFilterSection}>
              <Text style={[styles.iosFilterSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>LOCATION</Text>
              <Pressable style={[styles.iosFilterPickerRow, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]} onPress={() => setShowLocationPicker(true)}>
                <MapPin size={18} color={isDark ? '#8E8E93' : '#C7C7CC'} />
                <Text style={[styles.iosFilterPickerText, { color: tempFilters.locations.length > 0 ? (isDark ? '#FFFFFF' : '#000000') : '#C7C7CC' }]}>
                  {tempFilters.locations.length > 0 ? `${tempFilters.locations.length} locations selected` : 'Select locations...'}
                </Text>
                <ChevronDown size={16} color={isDark ? '#8E8E93' : '#C7C7CC'} />
              </Pressable>
              {tempFilters.locations.length > 0 && (
                <View style={styles.selectedCitiesWrap}>
                  {tempFilters.locations.map((location) => (
                    <Pressable key={location} style={[styles.iosFilterChip, styles.iosFilterChipActive]} onPress={() => toggleLocation(location)}>
                      <Text style={styles.iosFilterChipTextActive}>{location}</Text>
                      <X size={10} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showCityPicker} animationType="slide" transparent onRequestClose={() => setShowCityPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.iosPickerNav}>
              <View style={{ width: 50 }} />
              <Text style={[styles.iosPickerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Select Cities</Text>
              <Pressable onPress={() => setShowCityPicker(false)} hitSlop={8}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.iosPickerList}>
              <View style={[styles.iosPickerGroup, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                {MAJOR_CITIES.map((city, idx) => {
                  const selected = tempFilters.cities.includes(city);
                  return (
                    <Pressable key={city} style={[styles.iosPickerRow, idx < MAJOR_CITIES.length - 1 && styles.iosPickerRowBorder]} onPress={() => toggleCity(city)}>
                      <Text style={[styles.iosPickerRowText, { color: isDark ? '#FFFFFF' : '#000000' }]}>{city}</Text>
                      {selected && <Check size={18} color="#007AFF" strokeWidth={2.5} />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCompanyPicker} animationType="slide" transparent onRequestClose={() => setShowCompanyPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.iosPickerNav}>
              <View style={{ width: 50 }} />
              <Text style={[styles.iosPickerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Select Companies</Text>
              <Pressable onPress={() => setShowCompanyPicker(false)} hitSlop={8}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.iosPickerSearchWrap}>
              <View style={[styles.iosPickerSearchBar, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(118,118,128,0.12)' }]}>
                <Search size={16} color="#8E8E93" />
                <TextInput
                  style={[styles.iosPickerSearchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                  placeholder="Search companies..."
                  placeholderTextColor="#8E8E93"
                  value={companySearch}
                  onChangeText={setCompanySearch}
                />
                {companySearch.length > 0 && (
                  <Pressable onPress={() => setCompanySearch('')} hitSlop={8}>
                    <View style={styles.iosPickerSearchClear}><X size={10} color={isDark ? '#2C2C2E' : '#FFFFFF'} strokeWidth={3} /></View>
                  </Pressable>
                )}
              </View>
            </View>
            {tempFilters.companies.length > 0 && (
              <View style={styles.iosPickerSelectedWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iosPickerSelectedScroll}>
                  {tempFilters.companies.map((company) => (
                    <Pressable key={company} style={styles.iosPickerSelectedChip} onPress={() => toggleCompany(company)}>
                      <Text style={styles.iosPickerSelectedText}>{company}</Text>
                      <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.iosPickerList}>
              {filteredCompanies.length === 0 ? (
                <Text style={[styles.iosPickerEmpty, { color: '#8E8E93' }]}>No companies found</Text>
              ) : (
                <View style={[styles.iosPickerGroup, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                  {filteredCompanies.map((company: any, idx: number) => {
                    const selected = tempFilters.companies.includes(company.name);
                    const logoUrl = company.logo_url
                      ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/company-logos/${company.logo_url}`
                      : null;
                    return (
                      <Pressable key={company.name} style={[styles.iosPickerRow, idx < filteredCompanies.length - 1 && styles.iosPickerRowBorder]} onPress={() => toggleCompany(company.name)}>
                        <View style={styles.iosPickerRowLeft}>
                          {logoUrl && <Image source={{ uri: logoUrl }} style={styles.iosPickerLogo} />}
                          <Text style={[styles.iosPickerRowText, { color: isDark ? '#FFFFFF' : '#000000' }]}>{company.name}</Text>
                        </View>
                        {selected && <Check size={18} color="#007AFF" strokeWidth={2.5} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showLocationPicker} animationType="slide" transparent onRequestClose={() => setShowLocationPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.iosPickerNav}>
              <View style={{ width: 50 }} />
              <Text style={[styles.iosPickerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Select Locations</Text>
              <Pressable onPress={() => setShowLocationPicker(false)} hitSlop={8}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.iosPickerSearchWrap}>
              <View style={[styles.iosPickerSearchBar, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(118,118,128,0.12)' }]}>
                <Search size={16} color="#8E8E93" />
                <TextInput
                  style={[styles.iosPickerSearchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                  placeholder="Search locations..."
                  placeholderTextColor="#8E8E93"
                  value={locationSearch}
                  onChangeText={setLocationSearch}
                  onSubmitEditing={handleLocationSearchSubmit}
                  returnKeyType="done"
                />
                {locationSearch.length > 0 && (
                  <Pressable onPress={() => setLocationSearch('')} hitSlop={8}>
                    <View style={styles.iosPickerSearchClear}><X size={10} color={isDark ? '#2C2C2E' : '#FFFFFF'} strokeWidth={3} /></View>
                  </Pressable>
                )}
              </View>
            </View>
            {tempFilters.locations.length > 0 && (
              <View style={styles.iosPickerSelectedWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iosPickerSelectedScroll}>
                  {tempFilters.locations.map((location) => (
                    <Pressable key={location} style={styles.iosPickerSelectedChip} onPress={() => toggleLocation(location)}>
                      <Text style={styles.iosPickerSelectedText}>{location}</Text>
                      <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.iosPickerList}>
              <View style={[styles.iosPickerGroup, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                {filteredLocations.map((location, idx) => {
                  const selected = tempFilters.locations.includes(location);
                  return (
                    <Pressable key={location} style={[styles.iosPickerRow, idx < filteredLocations.length - 1 && styles.iosPickerRowBorder]} onPress={() => toggleLocation(location)}>
                      <Text style={[styles.iosPickerRowText, { color: isDark ? '#FFFFFF' : '#000000' }]}>{location}</Text>
                      {selected && <Check size={18} color="#007AFF" strokeWidth={2.5} />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showRolePicker} animationType="slide" transparent onRequestClose={() => setShowRolePicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <View style={styles.iosPickerNav}>
              <View style={{ width: 50 }} />
              <Text style={[styles.iosPickerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Select Roles</Text>
              <Pressable onPress={() => setShowRolePicker(false)} hitSlop={8}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.iosPickerSearchWrap}>
              <View style={[styles.iosPickerSearchBar, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(118,118,128,0.12)' }]}>
                <Search size={16} color="#8E8E93" />
                <TextInput
                  style={[styles.iosPickerSearchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                  placeholder="Search roles..."
                  placeholderTextColor="#8E8E93"
                  value={roleSearch}
                  onChangeText={setRoleSearch}
                  onSubmitEditing={handleRoleSearchSubmit}
                  returnKeyType="done"
                />
                {roleSearch.length > 0 && (
                  <Pressable onPress={() => setRoleSearch('')} hitSlop={8}>
                    <View style={styles.iosPickerSearchClear}><X size={10} color={isDark ? '#2C2C2E' : '#FFFFFF'} strokeWidth={3} /></View>
                  </Pressable>
                )}
              </View>
            </View>
            {tempFilters.roles.length > 0 && (
              <View style={styles.iosPickerSelectedWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iosPickerSelectedScroll}>
                  {tempFilters.roles.map((role) => (
                    <Pressable key={role} style={styles.iosPickerSelectedChip} onPress={() => toggleRole(role)}>
                      <Text style={styles.iosPickerSelectedText}>{role}</Text>
                      <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.iosPickerList}>
              <View style={[styles.iosPickerGroup, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                {filteredRoles.map((role, idx) => {
                  const selected = tempFilters.roles.includes(role);
                  return (
                    <Pressable key={role} style={[styles.iosPickerRow, idx < filteredRoles.length - 1 && styles.iosPickerRowBorder]} onPress={() => toggleRole(role)}>
                      <Text style={[styles.iosPickerRowText, { color: isDark ? '#FFFFFF' : '#000000' }]}>{role}</Text>
                      {selected && <Check size={18} color="#007AFF" strokeWidth={2.5} />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>

      <FreeSwipesModal
        visible={showFreeSwipes}
        onClose={() => setShowFreeSwipes(false)}
        theme={isDark ? 'dark' : 'light'}
        colors={colors}
        referralStats={referralStats}
        userId={supabaseUserId}
        onSwipesUpdated={() => refetchProfile()}
        onShare={async () => {
          if (referralStats?.referralCode) {
            try {
              await RNShare.share({ message: `Hey! Have you heard about NextQuark? It's Tinder for jobs - swipe right to apply for your dream job! Join with my referral code ${referralStats.referralCode} and get 5 free application swipes to get started. Download now!` });
            } catch (error) { console.error('Error sharing:', error); }
          }
        }}
        onCopy={() => {
          if (referralStats?.referralCode) {
            Clipboard.setString(referralStats.referralCode);
          }
        }}
      />
    </TabTransitionWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 12 },
  headerLeft: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  appLogo: { height: 42, width: 180, alignSelf: 'flex-start' },
  appName: { fontSize: 12, fontWeight: '800' as const, color: "#000", letterSpacing: 2, textTransform: 'uppercase' as const },
  subscriptionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  subscriptionBadgeFree: { backgroundColor: '#10B981' },
  subscriptionBadgePro: { backgroundColor: '#FFD700' },
  subscriptionBadgePremium: { backgroundColor: '#9333EA' },
  subscriptionBadgeText: { fontSize: 9, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  headerTitle: { fontSize: 22, fontWeight: '800' as const, color: "#000" },
  headerSubtitle: { fontSize: 14, color: "#000", marginTop: 2 },
  headerActions: { flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  headerButtonsRow: { flexDirection: 'row', gap: 10 },
  headerButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' as const },
  filterBadge: { position: 'absolute' as const, top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '700' as const, color: "#000" },
  aiButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  feedToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  feedToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  feedToggleText: { fontSize: 12, fontWeight: '600' as const },
  feedToggleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  feedToggleBadgeText: { fontSize: 10, fontWeight: '700' as const },
  activeSearchContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#000000' },
  activeSearchScroll: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  activeSearchTag: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  activeSearchTagText: { fontSize: 13, fontWeight: '600' as const, color: '#000000' },
  clearSearchButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#000000', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF' },
  clearSearchText: { fontSize: 12, fontWeight: '600' as const, color: '#FFFFFF' },
  cardsContainer: { flex: 1, marginBottom: Platform.OS === 'ios' ? 88 : 64 },
  cardWrapper: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  overlayLabel: { position: 'absolute' as const, zIndex: 10, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  likeLabel: { top: 40, left: 24, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#16a34a' },
  likeLabelText: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 2 },
  nopeLabel: { top: 40, right: 24, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#dc2626' },
  nopeLabelText: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 2 },
  saveLabel: { bottom: 60, alignSelf: 'center', left: '35%', backgroundColor: '#3b82f6', borderWidth: 2, borderColor: '#2563eb' },
  saveLabelText: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 2 },
  actionBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 12, paddingHorizontal: 20, backgroundColor: "#FFF" },
  actionButton: { justifyContent: 'center', alignItems: 'center', borderRadius: 999, shadowColor: "rgba(0,0,0,0.1)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  passButton: { width: 60, height: 60, backgroundColor: "#FFF", borderWidth: 2, borderColor: "#DDD" },
  saveActionButton: { width: 50, height: 50, backgroundColor: "#FFF", borderWidth: 2, borderColor: '#EEEEEE' },
  applyButton: { width: 60, height: 60, backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#00C853' },
  activePass: { backgroundColor: "#FFF", borderColor: "#DDD" },
  activeSave: { backgroundColor: "#FFF", borderColor: "#DDD" },
  activeApply: { backgroundColor: "#FFF", borderColor: "#DDD" },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800' as const, color: "#000", marginBottom: 8 },
  emptyText: { fontSize: 15, color: "#000", textAlign: 'center', lineHeight: 22 },
  resetButton: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: "#FFF", borderRadius: 14 },
  resetButtonText: { fontSize: 16, fontWeight: '700' as const, color: "#000" },
  outOfSwipesActions: { marginTop: 24, width: '100%', gap: 12 },
  upgradeButton: { backgroundColor: '#111111', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  upgradeButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  shareButton: { backgroundColor: '#43A047', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  shareButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  filterOverlay: { flex: 1, justifyContent: 'flex-end' },
  filterContent: { borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '90%' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  filterTitle: { fontSize: 26, fontWeight: '800' as const, color: "#000" },
  filterCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  filterDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 6 },
  filterScroll: { paddingHorizontal: 16 },
  filterSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, marginBottom: 4 },
  filterSectionTitle: { fontSize: 17, fontWeight: '700' as const, color: "#000" },
  iosFilterHandle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC', alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  iosFilterNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  iosFilterReset: { fontSize: 17, fontWeight: '400' as const, color: '#FF3B30' },
  iosFilterTitle: { fontSize: 17, fontWeight: '600' as const },
  iosFilterApply: { fontSize: 17, fontWeight: '600' as const, color: '#007AFF' },
  iosFilterSection: { marginBottom: 4 },
  iosFilterSectionLabel: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08, marginTop: 12, marginBottom: 6, marginLeft: 16 },
  iosFilterGroupBox: { borderRadius: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  iosFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#E5E5EA', marginRight: 6, marginBottom: 6 },
  iosFilterChipActive: { backgroundColor: '#007AFF' },
  iosFilterChipText: { fontSize: 14, fontWeight: '500' as const, color: '#000000' },
  iosFilterChipTextActive: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '90%', paddingBottom: 34 },
  iosPickerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8' },
  iosPickerTitle: { fontSize: 17, fontWeight: '600' as const, flex: 1, textAlign: 'center' },
  iosPickerDone: { fontSize: 17, fontWeight: '600' as const, color: '#007AFF' },
  iosPickerSearchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  iosPickerSearchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, height: 36, gap: 6 },
  iosPickerSearchInput: { flex: 1, fontSize: 17, padding: 0 },
  iosPickerSearchClear: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#8E8E93', justifyContent: 'center', alignItems: 'center' },
  iosPickerList: { paddingHorizontal: 16, maxHeight: 420 },
  iosPickerGroup: { borderRadius: 10, overflow: 'hidden' as const },
  iosPickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 44 },
  iosPickerRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8' },
  iosPickerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iosPickerRowText: { fontSize: 17, fontWeight: '400' as const },
  iosPickerLogo: { width: 24, height: 24, borderRadius: 6 },
  iosPickerEmpty: { fontSize: 15, textAlign: 'center', paddingVertical: 30 },
  iosPickerSelectedWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  iosPickerSelectedScroll: { flexDirection: 'row', gap: 8 },
  iosPickerSelectedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  iosPickerSelectedText: { fontSize: 13, fontWeight: '500' as const, color: '#FFFFFF' },
  iosFilterPickerRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  iosFilterPickerText: { flex: 1, fontSize: 17 },

  cityPickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#DDD", gap: 10 },
  cityPickerBtnText: { flex: 1, fontSize: 15, color: "#000" },
  selectedCitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  selectedCityChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: "#FFF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  selectedCityText: { fontSize: 12, color: "#000", fontWeight: '600' as const },

  roleSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 10, borderWidth: 1, borderColor: "#DDD" },
  roleSearchInput: { flex: 1, fontSize: 14, color: "#000", padding: 0 },
  keywordSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1.5, borderColor: "#DDD" },
  keywordSearchInput: { flex: 1, fontSize: 15, color: "#000", padding: 0, fontWeight: '500' as const },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  filterChipText: { fontSize: 14, fontWeight: '600' as const },
  filterFooter: { display: 'none' as any },
  resetFilterBtn: { display: 'none' as any },
  resetFilterBtnText: { fontSize: 16, fontWeight: '700' as const, color: "#000" },
  applyFilterBtn: { display: 'none' as any },
  applyFilterBtnText: { fontSize: 16, fontWeight: '700' as const },
  cityList: { paddingHorizontal: 20, maxHeight: 400 },
  cityOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#DDD" },
  cityOptionActive: { backgroundColor: "#FFF", borderColor: "#DDD" },
  cityOptionText: { fontSize: 14, fontWeight: '600' as const, color: "#000" },
  cityOptionTextActive: { color: "#000" },
  cityDoneBtn: { marginHorizontal: 20, marginVertical: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: "#000000", alignItems: 'center' },
  cityDoneBtnText: { fontSize: 16, fontWeight: '700' as const, color: "#FFFFFF" },
  companyDoneBtn: { marginHorizontal: 20, marginVertical: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: "#000000", alignItems: 'center' },
  companyDoneBtnText: { fontSize: 16, fontWeight: '700' as const, color: "#FFFFFF" },
  locationDoneBtn: { marginHorizontal: 20, marginVertical: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: "#000000", alignItems: 'center' },
  locationDoneBtnText: { fontSize: 16, fontWeight: '700' as const, color: "#FFFFFF" },
  roleDoneBtn: { marginHorizontal: 20, marginVertical: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: "#000000", alignItems: 'center' },
  roleDoneBtnText: { fontSize: 16, fontWeight: '700' as const, color: "#FFFFFF" },
  pickerSelectedWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  pickerSelectedScroll: { flexDirection: 'row', gap: 8 },
  selectedItemChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: "#000000", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  selectedItemText: { fontSize: 12, color: "#FFFFFF", fontWeight: '600' as const },
  companyOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyLogo: { width: 24, height: 24, borderRadius: 4 },
  searchTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  searchTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: "#FFF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  searchTagText: { fontSize: 12, color: "#000", fontWeight: '600' as const },
  swipeModalOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 998, justifyContent: 'center', alignItems: 'center' },
  swipeModalCard: { width: SCREEN_WIDTH - 80, backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800' as const, color: '#000000', textAlign: 'center', marginBottom: 8 },
  sheetSubtitle: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  sheetUpgradeBtn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  sheetUpgradeBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  sheetShareBtn: { backgroundColor: '#9CA3AF', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  sheetShareBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  notificationContainer: { position: 'absolute' as const, left: 16, right: 16, zIndex: 1000 },
  notificationCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12, borderWidth: 1, borderColor: "#DDD" },
  notificationLogo: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#FFF" },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 11, fontWeight: '600' as const, color: "#000", textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  notificationCompany: { fontSize: 17, fontWeight: '700' as const, color: "#000", marginBottom: 2 },
  notificationRole: { fontSize: 14, color: "#000", lineHeight: 18 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 32 },
  loadingWordText: { fontSize: 20, fontWeight: '800' as const, letterSpacing: 0.5 },
  floatWrapper: { alignItems: 'center', gap: 12 },
  floatCard: { width: 280, height: 190, borderRadius: 22, borderWidth: 2, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  floatCardInner: { flex: 1, borderRadius: 18, padding: 16 },
  floatCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  floatCardLogo: { width: 44, height: 44, borderRadius: 12 },
  floatCardLine: { height: 10, borderRadius: 5 },
  floatCardChips: { flexDirection: 'row', gap: 8, marginTop: 16 },
  floatChip: { width: 60, height: 22, borderRadius: 6 },
  floatShadow: { width: 200, height: 16, borderRadius: 100, backgroundColor: '#000' },
  liveCounterText: { fontSize: 13, fontWeight: '400' as const, marginTop: 12, opacity: 0.7 },
  resumeSheetOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, justifyContent: 'flex-end' },
  resumeSheetContainer: { borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
  resumeSheetHandle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#C7C7CC', alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  resumeSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4, marginBottom: 4 },
  resumeSheetTitle: { fontSize: 17, fontWeight: '600' as const, textAlign: 'center', flex: 1 },
  resumeSheetDoneText: { fontSize: 17, fontWeight: '600' as const, color: '#007AFF' },
  resumeSheetScroll: { paddingHorizontal: 16 },
  resumeSheetLoading: { padding: 40, alignItems: 'center' },
  resumeSheetLoadingText: { fontSize: 15, color: '#8E8E93' },
  resumeSheetEmpty: { padding: 40, alignItems: 'center', gap: 10 },
  resumeSheetEmptyText: { fontSize: 15, color: '#8E8E93' },
  resumeSheetUploadBtn: { marginTop: 8 },
  resumeSheetUploadBtnText: { fontSize: 17, fontWeight: '400' as const, color: '#007AFF' },
  iosGroupedSection: { borderRadius: 10, overflow: 'hidden' as const, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  iosResumePreview: { height: 300, borderRadius: 10, overflow: 'hidden' as const, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  iosResumePreviewFallback: { height: 120, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  iosGroupedRow: { paddingHorizontal: 16, paddingVertical: 12 },
  iosGroupedRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8' },
  iosGroupedRowContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iosGroupedRowTitle: { fontSize: 17, fontWeight: '400' as const },
  iosGroupedRowSubtitle: { fontSize: 13, marginTop: 2 },
  iosResumeActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  iosResumeActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  iosResumeActionText: { fontSize: 15, fontWeight: '500' as const, color: '#007AFF' },
  resumeRenameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  resumeRenameContent: { borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20 },
  resumeRenameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  resumeRenameTitle: { fontSize: 17, fontWeight: '600' as const },
  resumeRenameInput: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 17, borderWidth: StyleSheet.hairlineWidth, marginBottom: 16 },
  resumeRenameConfirmBtn: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  resumeRenameConfirmBtnText: { fontSize: 17, fontWeight: '600' as const, color: '#FFFFFF' },
});
