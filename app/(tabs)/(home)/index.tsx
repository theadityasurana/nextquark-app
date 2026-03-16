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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Heart, Bookmark, SlidersHorizontal, Sparkles, MapPin, Check, ChevronDown, Search, RefreshCw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import { mockJobs } from '@/mocks/jobs';
import { Job } from '@/types';
import JobCard from '@/components/JobCard';
import { MAJOR_CITIES, CURRENCIES, getSalaryConfig, formatSalaryForCurrency } from '@/constants/cities';
import RangeSlider from '@/components/RangeSlider';
import { mockUser } from '@/mocks/user';
import { fetchJobsFromSupabase, incrementRightSwipe, addToLiveApplicationQueue, fetchAllCompanies, fetchUniqueJobTitles, fetchUniqueLocations, saveJob } from '@/lib/jobs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { getSubscriptionStatus, decrementApplicationCount, getSubscriptionDisplayName } from '@/lib/subscription';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_TAGS_KEY = 'nextquark_search_tags';

const CARD_COLORS = [Colors.surface];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
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
  salaryMin: 0,
  salaryMax: 500000,
  salaryCurrency: 'USD',
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
  const { userName, swipedJobIds, addSwipedJobId, supabaseUserId, userProfile } = useAuth();
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [tempFilters, setTempFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [roleSearch, setRoleSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [feedMode, setFeedMode] = useState<'discover' | 'foryou'>('discover');
  const [notification, setNotification] = useState<{ visible: boolean; job?: Job } | null>(null);
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true);
  const [activeSearchTags, setActiveSearchTags] = useState<string[]>([]);
  const [loadingWordIndex, setLoadingWordIndex] = useState(0);
  const filterSlideAnim = useRef(new Animated.Value(300)).current;
  const position = useRef(new Animated.ValueXY()).current;
  const loadingWordOpacity = useRef(new Animated.Value(0)).current;
  const swipeCardAnim = useRef(new Animated.Value(0)).current;

  const loadingWords = ['Vibe', 'Check', 'Apply'];

  // Loading word animation
  useEffect(() => {
    if (!isLoadingJobs) {
      setLoadingWordIndex(0);
      loadingWordOpacity.setValue(0);
      swipeCardAnim.setValue(0);
      return;
    }

    // Swipe card animation
    const swipeAnimation = Animated.loop(
      Animated.sequence([
        // Swipe right
        Animated.timing(swipeCardAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Pause
        Animated.delay(200),
        // Swipe left
        Animated.timing(swipeCardAnim, {
          toValue: -1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Pause
        Animated.delay(200),
        // Return to center
        Animated.timing(swipeCardAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        // Pause before loop
        Animated.delay(400),
      ])
    );
    swipeAnimation.start();

    const animateWord = () => {
      // Fade in
      Animated.timing(loadingWordOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Hold for a moment
        setTimeout(() => {
          // Fade out
          Animated.timing(loadingWordOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            // Move to next word
            setLoadingWordIndex((prev) => {
              const next = prev + 1;
              if (next < loadingWords.length) {
                return next;
              }
              return 0; // Loop back to start
            });
          });
        }, 600);
      });
    };

    animateWord();

    return () => {
      swipeAnimation.stop();
    };
  }, [isLoadingJobs, loadingWordIndex, loadingWordOpacity, swipeCardAnim, loadingWords.length]);

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



  const { data: supabaseJobs, isLoading: isLoadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['supabase-jobs'],
    queryFn: fetchJobsFromSupabase,
    staleTime: 1000 * 60 * 5,
  });

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

  console.log('Companies data loaded:', allCompaniesData.length);

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

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-status', supabaseUserId],
    queryFn: () => getSubscriptionStatus(supabaseUserId!),
    enabled: !!supabaseUserId,
    refetchInterval: 60000,
  });

  const allJobs: Job[] = useMemo(() => {
    let jobsList: Job[] = [];
    if (supabaseJobs && supabaseJobs.length > 0) {
      console.log('Using Supabase jobs:', supabaseJobs.length);
      jobsList = supabaseJobs;
    } else {
      console.log('Falling back to mock jobs');
      jobsList = mockJobs;
    }
    
    // Shuffle the jobs array
    const shuffled = [...jobsList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, [supabaseJobs]);

  // Calculate For You count separately (constant regardless of active section)
  const forYouCount = useMemo(() => {
    let filtered = allJobs;
    if (swipedJobIds.length > 0) {
      const swipedSet = new Set(swipedJobIds);
      filtered = filtered.filter(job => !swipedSet.has(job.id));
    }
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

  const jobs: Job[] = useMemo(() => {
    let filtered = allJobs;

    if (swipedJobIds.length > 0) {
      const swipedSet = new Set(swipedJobIds);
      filtered = filtered.filter(job => !swipedSet.has(job.id));
    }

    // For You mode: filter by user's desired roles
    if (feedMode === 'foryou' && userProfile?.desiredRoles && userProfile.desiredRoles.length > 0) {
      filtered = filtered.filter(job => 
        userProfile.desiredRoles!.some(role => {
          const roleLower = role.toLowerCase();
          return job.jobTitle.toLowerCase().includes(roleLower) ||
            job.description.toLowerCase().includes(roleLower) ||
            job.skills.some(skill => skill.toLowerCase().includes(roleLower));
        })
      );
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
    // ✅ Salary Range
    // ✅ Posted Within (Date Range) - NOW WORKING
    // ✅ Job Levels - NOW WORKING (filters by experienceLevel, jobTitle, description)
    // ✅ Job Requirements - NOW WORKING (H1B, Security Clearance, No Degree, Remote Only, Relocation)

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

    if (filters.salaryMin > 0 || filters.salaryMax < 500000) {
      filtered = filtered.filter(job => {
        if (job.salaryCurrency !== filters.salaryCurrency) return true;
        return job.salaryMax >= filters.salaryMin && job.salaryMin <= filters.salaryMax;
      });
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
  }, [allJobs, swipedJobIds, filters, feedMode, userProfile, activeSearchTags]);

  useEffect(() => {
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
  }, [jobs, position]);

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

  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const saveOpacity = position.y.interpolate({
    inputRange: [-SCREEN_HEIGHT / 6, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  const nextCardOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.6, 1],
    extrapolate: 'clamp',
  });

  const handleSwipeComplete = useCallback(async (direction: string) => {
    const currentJob = jobs[currentIndex];
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
        refetchJobs();
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
    
    // Delay resetting position and incrementing index to avoid flicker
    setTimeout(() => {
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
      
      // Re-enable swiping after card transition completes
      setTimeout(() => {
        console.log('🔓 Re-enabling swipe - transition complete');
        setIsSwipeEnabled(true);
      }, 100);
    }, 150);
  }, [currentIndex, position, triggerHaptic, jobs, refetchJobs, addSwipedJobId, supabaseUserId, userProfile, userName, queryClient]);

  const forceSwipe = useCallback((direction: string) => {
    if (!isSwipeEnabled) {
      console.log('🚫 forceSwipe blocked - isSwipeEnabled:', isSwipeEnabled);
      return;
    }
    console.log('✅ forceSwipe allowed - direction:', direction, 'isSwipeEnabled:', isSwipeEnabled);
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : direction === 'left' ? -SCREEN_WIDTH * 1.5 : 0;
    const y = direction === 'up' ? -SCREEN_HEIGHT : 0;
    Animated.timing(position, {
      toValue: { x, y },
      duration: 300,
      useNativeDriver: false,
    }).start(() => handleSwipeComplete(direction));
  }, [position, handleSwipeComplete, isSwipeEnabled]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!isSwipeEnabled) {
          console.log('🚫 Gesture blocked - isSwipeEnabled:', isSwipeEnabled);
          return false;
        }
        return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        if (!isSwipeEnabled) return;
        position.setValue({ x: gesture.dx, y: gesture.dy });
        if (gesture.dx > 50) setSwipeDirection('right');
        else if (gesture.dx < -50) setSwipeDirection('left');
        else if (gesture.dy < -50) setSwipeDirection('up');
        else setSwipeDirection(null);
      },
      onPanResponderRelease: (_, gesture) => {
        if (!isSwipeEnabled) {
          console.log('🚫 Release blocked - isSwipeEnabled:', isSwipeEnabled);
          return;
        }
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          forceSwipe('up');
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
          setSwipeDirection(null);
        }
      },
    }),
    [isSwipeEnabled, position, forceSwipe]
  );

  useEffect(() => {
    if (currentIndex < jobs.length && jobs[currentIndex]) {
      console.log('🔄 useEffect: Re-enabling swipe for new card at index:', currentIndex);
      setIsSwipeEnabled(true);
    }
  }, [currentIndex, jobs]);

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

  const handleFilterCurrencyChange = useCallback((code: string) => {
    const config = getSalaryConfig(code);
    setTempFilters((prev) => ({ ...prev, salaryCurrency: code, salaryMin: config.min, salaryMax: config.max }));
    setShowCurrencyPicker(false);
  }, []);

  const handleSalaryChange = useCallback((low: number, high: number) => {
    setTempFilters((prev) => ({ ...prev, salaryMin: low, salaryMax: high }));
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
    filters.salaryMin > 0 || filters.salaryMax < 500000,
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

  const filterCurrencyObj = CURRENCIES.find((c) => c.code === tempFilters.salaryCurrency);
  const filterSalaryConfig = getSalaryConfig(tempFilters.salaryCurrency);

  const formatFilterSalary = useCallback((v: number) => {
    const sym = filterCurrencyObj?.symbol ?? '$';
    return formatSalaryForCurrency(v, tempFilters.salaryCurrency, sym);
  }, [tempFilters.salaryCurrency, filterCurrencyObj]);

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

  const renderCard = (job: Job, index: number) => {
    if (index < currentIndex) return null;

    const hash = job.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cardColor = CARD_COLORS[hash % CARD_COLORS.length];

    if (index === currentIndex) {
      return (
        <Animated.View
          key={job.id}
          style={[
            styles.cardWrapper,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotation },
              ],
              paddingHorizontal: 16,
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
          <JobCard job={job} onViewDetails={() => router.push({ pathname: '/job-details' as any, params: { id: job.id } })} backgroundColor={cardColor} showMatchBadge={feedMode === 'foryou'} />
        </Animated.View>
      );
    }

    if (index === currentIndex + 1) {
      return (
        <Animated.View
          key={job.id}
          style={[
            styles.cardWrapper,
            { transform: [{ scale: nextCardScale }], opacity: nextCardOpacity, paddingHorizontal: 16 },
          ]}
        >
          <JobCard job={job} backgroundColor={cardColor} showMatchBadge={feedMode === 'foryou'} />
        </Animated.View>
      );
    }

    return null;
  };

  const remainingJobs = jobs.length - currentIndex;

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
          <Text style={[styles.headerTitle, { color: colors.secondary }]}>{greeting}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            {isLoadingJobs 
              ? 'Loading jobs...' 
              : subscriptionData 
              ? `${subscriptionData.applications_remaining} applications left this month`
              : `${remainingJobs} jobs left today`
            }
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerButtonsRow}>
            <Pressable style={styles.headerButton} onPress={() => router.push('/(tabs)/(home)/search' as any)}>
              <Search size={20} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.headerButton} onPress={handleOpenFilters}>
              <SlidersHorizontal size={20} color={Colors.textSecondary} />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
          {subscriptionData && (
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
          )}
        </View>
      </View>

      <View style={styles.feedToggleRow}>
        <Pressable
          style={[styles.feedToggleBtn, feedMode === 'discover' ? { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' } : { backgroundColor: 'transparent', borderColor: '#FFFFFF', borderWidth: 1 }]}
          onPress={() => setFeedMode('discover')}
        >
          <Text style={[styles.feedToggleText, { color: feedMode === 'discover' ? '#000000' : '#FFFFFF' }]}>Discover</Text>
          <View style={[styles.feedToggleBadge, { backgroundColor: feedMode === 'discover' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]}>
            <Text style={[styles.feedToggleBadgeText, { color: feedMode === 'discover' ? '#000000' : '#FFFFFF' }]}>{allJobs.length}</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.feedToggleBtn, feedMode === 'foryou' ? { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' } : { backgroundColor: 'transparent', borderColor: '#FFFFFF', borderWidth: 1 }]}
          onPress={() => setFeedMode('foryou')}
        >
          <Text style={[styles.feedToggleText, { color: feedMode === 'foryou' ? '#000000' : '#FFFFFF' }]}>For You</Text>
          <View style={[styles.feedToggleBadge, { backgroundColor: feedMode === 'foryou' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]}>
            <Text style={[styles.feedToggleBadgeText, { color: feedMode === 'foryou' ? '#000000' : '#FFFFFF' }]}>{forYouCount}</Text>
          </View>
        </Pressable>
      </View>

      {activeSearchTags.length > 0 && (
        <View style={styles.activeSearchContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeSearchScroll}>
            {activeSearchTags.map((tag, idx) => (
              <View key={idx} style={styles.activeSearchTag}>
                <Text style={styles.activeSearchTagText}>{tag}</Text>
              </View>
            ))}
            <Pressable style={styles.clearSearchButton} onPress={clearSearchTags}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      <View style={styles.cardsContainer}>
        {isLoadingJobs ? (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.swipeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  transform: [
                    {
                      translateX: swipeCardAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [-80, 0, 80],
                      }),
                    },
                    {
                      rotate: swipeCardAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: ['-15deg', '0deg', '15deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.swipeCardInner, { backgroundColor: colors.background }]}>
                <View style={styles.swipeCardHeader}>
                  <View style={[styles.swipeCardLogo, { backgroundColor: colors.borderLight }]} />
                  <View style={{ flex: 1 }}>
                    <View style={[styles.swipeCardLine, { backgroundColor: colors.borderLight, width: '70%' }]} />
                    <View style={[styles.swipeCardLine, { backgroundColor: colors.borderLight, width: '50%', marginTop: 6 }]} />
                  </View>
                </View>
                <View style={[styles.swipeCardLine, { backgroundColor: colors.borderLight, width: '90%', height: 12, marginTop: 12 }]} />
                <View style={[styles.swipeCardLine, { backgroundColor: colors.borderLight, width: '60%', height: 8, marginTop: 8 }]} />
              </View>
            </Animated.View>
            <Animated.Text 
              style={[
                styles.loadingWordText, 
                { 
                  color: colors.textPrimary,
                  opacity: loadingWordOpacity 
                }
              ]}
            >
              {loadingWords[loadingWordIndex]}
            </Animated.Text>
          </View>
        ) : subscriptionData && subscriptionData.applications_remaining <= 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Heart size={40} color={Colors.error} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.secondary }]}>Out of Swipes!</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sorry, but you have run out of free swipes. Consider upgrading your plan or share NextQuark with your friends to earn more swipes.</Text>
            <View style={styles.outOfSwipesActions}>
              <Pressable 
                style={[styles.upgradeButton, { backgroundColor: colors.surface }]} 
                onPress={() => router.push('/premium' as any)}
              >
                <Text style={[styles.upgradeButtonText, { color: colors.secondary }]}>Upgrade to Pro</Text>
              </Pressable>
              <Pressable 
                style={styles.shareButton} 
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
                <Text style={styles.shareButtonText}>Share to Earn Free Swipes</Text>
              </Pressable>
            </View>
          </View>
        ) : currentIndex >= jobs.length ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Sparkles size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>You've reviewed all available jobs. Check back later or adjust your filters for more matches.</Text>
            <Pressable style={styles.resetButton} onPress={() => { setCurrentIndex(0); refetchJobs(); }}>
              <Text style={styles.resetButtonText}>Start Over</Text>
            </Pressable>
          </View>
        ) : (
          [...jobs].reverse().map((job, i) => renderCard(job, jobs.length - 1 - i))
        )}
      </View>

      {currentIndex < jobs.length && subscriptionData && subscriptionData.applications_remaining > 0 && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 10) + 8, backgroundColor: colors.surface }]}>
          <Pressable style={[styles.actionButton, styles.passButton, swipeDirection === 'left' && styles.activePass]} onPress={() => forceSwipe('left')}>
            <X size={28} color={swipeDirection === 'left' ? Colors.textInverse : Colors.error} strokeWidth={2.5} />
          </Pressable>
          <Pressable style={[styles.actionButton, styles.saveActionButton, swipeDirection === 'up' && styles.activeSave]} onPress={() => forceSwipe('up')}>
            <Bookmark size={22} color={swipeDirection === 'up' ? Colors.textInverse : Colors.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <Pressable style={[styles.actionButton, styles.applyButton, swipeDirection === 'right' && styles.activeApply]} onPress={() => forceSwipe('right')}>
            <Heart size={28} color={swipeDirection === 'right' ? Colors.textInverse : '#00C853'} fill={swipeDirection === 'right' ? Colors.textInverse : '#00C853'} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}

      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <Animated.View style={[styles.filterContent, { transform: [{ translateY: filterSlideAnim }] }]}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Jobs</Text>
              <Pressable onPress={() => setShowFilters(false)} style={styles.filterCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScroll}>


              <Text style={styles.filterSectionTitle}>Posted Within</Text>
              <View style={styles.chipGrid}>
                {POSTED_OPTIONS.map((opt) => {
                  const selected = tempFilters.postedWithin.includes(opt.value);
                  return (
                    <Pressable key={opt.value} style={[styles.filterChip, { backgroundColor: '#000000', borderColor: '#FFFFFF' }, selected && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => togglePostedWithin(opt.value)}>
                      {selected && <Check size={14} color="#FFFFFF" />}
                      <Text style={[styles.filterChipText, { color: '#FFFFFF' }]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.filterDivider} />

              <Text style={styles.filterSectionTitle}>Work Mode</Text>
              <View style={styles.chipGrid}>
                {WORK_MODES.map((mode) => {
                  const selected = tempFilters.workModes.includes(mode);
                  return (
                    <Pressable key={mode} style={[styles.filterChip, { backgroundColor: '#000000', borderColor: '#FFFFFF' }, selected && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => toggleWorkMode(mode)}>
                      {selected && <Check size={14} color="#FFFFFF" />}
                      <Text style={[styles.filterChipText, { color: '#FFFFFF' }]}>{mode}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.filterDivider} />

              <Text style={styles.filterSectionTitle}>Job Type</Text>
              <View style={styles.chipGrid}>
                {JOB_TYPES.map((type) => {
                  const selected = tempFilters.jobTypes.includes(type);
                  return (
                    <Pressable key={type} style={[styles.filterChip, { backgroundColor: '#000000', borderColor: '#FFFFFF' }, selected && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => toggleJobType(type)}>
                      {selected && <Check size={14} color="#FFFFFF" />}
                      <Text style={[styles.filterChipText, { color: '#FFFFFF' }]}>{type}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.filterDivider} />

              <Text style={styles.filterSectionTitle}>Job Level</Text>
              <View style={styles.chipGrid}>
                {JOB_LEVELS.map((level) => {
                  const selected = tempFilters.jobLevels.includes(level);
                  return (
                    <Pressable key={level} style={[styles.filterChip, { backgroundColor: '#000000', borderColor: '#FFFFFF' }, selected && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => toggleJobLevel(level)}>
                      {selected && <Check size={14} color="#FFFFFF" />}
                      <Text style={[styles.filterChipText, { color: '#FFFFFF' }]}>{level}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.filterDivider} />

              <Text style={styles.filterSectionTitle}>Job Requirements</Text>
              <View style={styles.chipGrid}>
                {JOB_REQUIREMENTS.map((req) => {
                  const selected = tempFilters.jobRequirements.includes(req);
                  return (
                    <Pressable key={req} style={[styles.filterChip, { backgroundColor: '#000000', borderColor: '#FFFFFF' }, selected && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]} onPress={() => toggleJobRequirement(req)}>
                      {selected && <Check size={14} color="#FFFFFF" />}
                      <Text style={[styles.filterChipText, { color: '#FFFFFF' }]}>{req}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.filterDivider} />

              <Text style={styles.filterSectionTitle}>Company</Text>
              <Pressable style={styles.cityPickerBtn} onPress={() => setShowCompanyPicker(true)}>
                <Search size={18} color={Colors.textTertiary} />
                <Text style={styles.cityPickerBtnText}>
                  {tempFilters.companies.length > 0 ? `${tempFilters.companies.length} companies selected` : 'Select companies...'}
                </Text>
                <ChevronDown size={18} color={Colors.textTertiary} />
              </Pressable>
              {tempFilters.companies.length > 0 && (
                <View style={styles.selectedCitiesWrap}>
                  {tempFilters.companies.map((company) => (
                    <Pressable key={company} style={styles.selectedItemChip} onPress={() => toggleCompany(company)}>
                      <Text style={styles.selectedItemText}>{company}</Text>
                      <X size={12} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.filterDivider} />

              <Text style={styles.filterSectionTitle}>Role</Text>
              <Pressable style={styles.cityPickerBtn} onPress={() => setShowRolePicker(true)}>
                <Search size={18} color={Colors.textTertiary} />
                <Text style={styles.cityPickerBtnText}>
                  {tempFilters.roles.length > 0 ? `${tempFilters.roles.length} roles selected` : 'Select roles...'}
                </Text>
                <ChevronDown size={18} color={Colors.textTertiary} />
              </Pressable>
              {tempFilters.roles.length > 0 && (
                <View style={styles.selectedCitiesWrap}>
                  {tempFilters.roles.map((role) => (
                    <Pressable key={role} style={styles.selectedItemChip} onPress={() => toggleRole(role)}>
                      <Text style={styles.selectedItemText}>{role}</Text>
                      <X size={12} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.filterDivider} />

              <Text style={styles.filterSectionTitle}>Location</Text>
              <Pressable style={styles.cityPickerBtn} onPress={() => setShowLocationPicker(true)}>
                <MapPin size={18} color={Colors.textTertiary} />
                <Text style={styles.cityPickerBtnText}>
                  {tempFilters.locations.length > 0 ? `${tempFilters.locations.length} locations selected` : 'Select locations...'}
                </Text>
                <ChevronDown size={18} color={Colors.textTertiary} />
              </Pressable>
              {tempFilters.locations.length > 0 && (
                <View style={styles.selectedCitiesWrap}>
                  {tempFilters.locations.map((location) => (
                    <Pressable key={location} style={styles.selectedItemChip} onPress={() => toggleLocation(location)}>
                      <Text style={styles.selectedItemText}>{location}</Text>
                      <X size={12} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.filterDivider} />

              <View style={styles.salaryHeaderRow}>
                <Text style={styles.filterSectionTitle}>Salary Range</Text>
                <Pressable style={styles.filterCurrencyBtn} onPress={() => setShowCurrencyPicker(true)}>
                  <Text style={styles.filterCurrencyText}>{tempFilters.salaryCurrency}</Text>
                  <ChevronDown size={14} color={Colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.salarySliderWrap}>
                <RangeSlider
                  min={filterSalaryConfig.min}
                  max={filterSalaryConfig.max}
                  step={filterSalaryConfig.step}
                  low={tempFilters.salaryMin}
                  high={tempFilters.salaryMax}
                  onChange={handleSalaryChange}
                  formatLabel={formatFilterSalary}
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.filterFooter}>
              <Pressable style={styles.resetFilterBtn} onPress={handleResetFilters}>
                <Text style={styles.resetFilterBtnText}>Reset</Text>
              </Pressable>
              <Pressable style={[styles.applyFilterBtn, { backgroundColor: colors.secondary }]} onPress={handleApplyFilters}>
                <Text style={[styles.applyFilterBtnText, { color: colors.surface }]}>Apply Filters ({jobs.length})</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showCityPicker} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <View style={styles.filterContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Select Cities</Text>
              <Pressable onPress={() => setShowCityPicker(false)} style={styles.filterCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.cityList}>
              {MAJOR_CITIES.map((city) => {
                const selected = tempFilters.cities.includes(city);
                return (
                  <Pressable key={city} style={[styles.cityOption, selected && styles.cityOptionActive]} onPress={() => toggleCity(city)}>
                    <Text style={[styles.cityOptionText, selected && styles.cityOptionTextActive]}>{city}</Text>
                    {selected && <Check size={18} color={Colors.surface} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cityDoneBtn} onPress={() => setShowCityPicker(false)}>
              <Text style={styles.cityDoneBtnText}>Done ({tempFilters.cities.length} selected)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showCurrencyPicker} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <View style={styles.filterContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Select Currency</Text>
              <Pressable onPress={() => setShowCurrencyPicker(false)} style={styles.filterCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.cityList}>
              {CURRENCIES.map((c) => {
                const selected = tempFilters.salaryCurrency === c.code;
                return (
                  <Pressable key={c.code} style={[styles.cityOption, selected && styles.cityOptionActive]} onPress={() => handleFilterCurrencyChange(c.code)}>
                    <Text style={[styles.cityOptionText, selected && styles.cityOptionTextActive]}>{c.label}</Text>
                    {selected && <Check size={18} color={Colors.surface} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCompanyPicker} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <View style={styles.filterContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Select Companies</Text>
              <Pressable onPress={() => setShowCompanyPicker(false)} style={styles.filterCloseBtn}>
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
            <ScrollView showsVerticalScrollIndicator={false} style={styles.cityList}>
              {filteredCompanies.length === 0 ? (
                <Text style={styles.emptyText}>No companies found</Text>
              ) : (
                filteredCompanies.map((company: any) => {
                  const selected = tempFilters.companies.includes(company.name);
                  const logoUrl = company.logo_url 
                    ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/company-logos/${company.logo_url}`
                    : null;
                  return (
                    <Pressable key={company.name} style={[styles.cityOption, selected && { borderColor: '#22c55e', borderWidth: 2 }]} onPress={() => toggleCompany(company.name)}>
                      <View style={styles.companyOptionContent}>
                        {logoUrl && <Image source={{ uri: logoUrl }} style={styles.companyLogo} />}
                        <Text style={[styles.cityOptionText, selected && { color: '#22c55e' }]}>{company.name}</Text>
                      </View>
                      {selected && <Check size={18} color="#22c55e" />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable style={styles.companyDoneBtn} onPress={() => setShowCompanyPicker(false)}>
              <Text style={styles.companyDoneBtnText}>Done ({tempFilters.companies.length} selected)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showLocationPicker} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <View style={styles.filterContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Select Locations</Text>
              <Pressable onPress={() => setShowLocationPicker(false)} style={styles.filterCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.roleSearchContainer}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.roleSearchInput}
                placeholder="Search locations..."
                placeholderTextColor={Colors.textTertiary}
                value={locationSearch}
                onChangeText={setLocationSearch}
                onSubmitEditing={handleLocationSearchSubmit}
                returnKeyType="done"
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.cityList}>
              {filteredLocations.map((location) => {
                const selected = tempFilters.locations.includes(location);
                return (
                  <Pressable key={location} style={[styles.cityOption, selected && { borderColor: '#22c55e', borderWidth: 2 }]} onPress={() => toggleLocation(location)}>
                    <Text style={[styles.cityOptionText, selected && { color: '#22c55e' }]}>{location}</Text>
                    {selected && <Check size={18} color="#22c55e" />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.locationDoneBtn} onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.locationDoneBtnText}>Done ({tempFilters.locations.length} selected)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showRolePicker} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <View style={styles.filterContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Select Roles</Text>
              <Pressable onPress={() => setShowRolePicker(false)} style={styles.filterCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.roleSearchContainer}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.roleSearchInput}
                placeholder="Search roles..."
                placeholderTextColor={Colors.textTertiary}
                value={roleSearch}
                onChangeText={setRoleSearch}
                onSubmitEditing={handleRoleSearchSubmit}
                returnKeyType="done"
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.cityList}>
              {filteredRoles.map((role) => {
                const selected = tempFilters.roles.includes(role);
                return (
                  <Pressable key={role} style={[styles.cityOption, selected && { borderColor: '#22c55e', borderWidth: 2 }]} onPress={() => toggleRole(role)}>
                    <Text style={[styles.cityOptionText, selected && { color: '#22c55e' }]}>{role}</Text>
                    {selected && <Check size={18} color="#22c55e" />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.roleDoneBtn} onPress={() => setShowRolePicker(false)}>
              <Text style={styles.roleDoneBtnText}>Done ({tempFilters.roles.length} selected)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </TabTransitionWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 12 },
  headerLeft: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  appLogo: { height: 28, width: 200, alignSelf: 'flex-start' },
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
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center', shadowColor: "rgba(0,0,0,0.1)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2, position: 'relative' as const },
  filterBadge: { position: 'absolute' as const, top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '700' as const, color: "#000" },
  aiButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  feedToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 6 },
  feedToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  feedToggleText: { fontSize: 13, fontWeight: '600' as const },
  feedToggleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  feedToggleBadgeText: { fontSize: 10, fontWeight: '700' as const },
  activeSearchContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#000000' },
  activeSearchScroll: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  activeSearchTag: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  activeSearchTagText: { fontSize: 13, fontWeight: '600' as const, color: '#000000' },
  clearSearchButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#000000', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF' },
  clearSearchText: { fontSize: 12, fontWeight: '600' as const, color: '#FFFFFF' },
  cardsContainer: { flex: 1, paddingHorizontal: 12, paddingTop: 2 },
  cardWrapper: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  overlayLabel: { position: 'absolute' as const, zIndex: 10, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  likeLabel: { top: 40, left: 24, backgroundColor: "#FFF", borderWidth: 2, borderColor: "#DDD" },
  likeLabelText: { fontSize: 24, fontWeight: '900' as const, color: "#000", letterSpacing: 2 },
  nopeLabel: { top: 40, right: 24, backgroundColor: "#FFF", borderWidth: 2, borderColor: "#DDD" },
  nopeLabelText: { fontSize: 24, fontWeight: '900' as const, color: "#000", letterSpacing: 2 },
  saveLabel: { bottom: 60, alignSelf: 'center', left: '35%', backgroundColor: '#EEEEEE', borderWidth: 2, borderColor: "#DDD" },
  saveLabelText: { fontSize: 24, fontWeight: '900' as const, color: "#000", letterSpacing: 2 },
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
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterContent: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  filterTitle: { fontSize: 22, fontWeight: '800' as const, color: "#000" },
  filterCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  filterDivider: { height: 1, backgroundColor: "#FFF", marginVertical: 14 },
  filterScroll: { paddingHorizontal: 20 },
  filterSectionTitle: { fontSize: 15, fontWeight: '700' as const, color: "#000", marginTop: 18, marginBottom: 10 },
  salaryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterCurrencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#DDD" },
  filterCurrencyText: { fontSize: 13, fontWeight: '600' as const, color: "#000" },
  cityPickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#DDD", gap: 10 },
  cityPickerBtnText: { flex: 1, fontSize: 15, color: "#000" },
  selectedCitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  selectedCityChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: "#FFF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  selectedCityText: { fontSize: 12, color: "#000", fontWeight: '600' as const },
  salarySliderWrap: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#DDD" },
  roleSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 10, borderWidth: 1, borderColor: "#DDD" },
  roleSearchInput: { flex: 1, fontSize: 14, color: "#000", padding: 0 },
  keywordSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1.5, borderColor: "#DDD" },
  keywordSearchInput: { flex: 1, fontSize: 15, color: "#000", padding: 0, fontWeight: '500' as const },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  filterChipText: { fontSize: 14, fontWeight: '600' as const },
  filterFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  resetFilterBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#DDD", alignItems: 'center' },
  resetFilterBtnText: { fontSize: 16, fontWeight: '700' as const, color: "#000" },
  applyFilterBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
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
  selectedItemChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: "#000000", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  selectedItemText: { fontSize: 12, color: "#FFFFFF", fontWeight: '600' as const },
  companyOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyLogo: { width: 24, height: 24, borderRadius: 4 },
  searchTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  searchTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: "#FFF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  searchTagText: { fontSize: 12, color: "#000", fontWeight: '600' as const },
  notificationContainer: { position: 'absolute' as const, left: 16, right: 16, zIndex: 1000 },
  notificationCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12, borderWidth: 1, borderColor: "#DDD" },
  notificationLogo: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#FFF" },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 11, fontWeight: '600' as const, color: "#000", textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  notificationCompany: { fontSize: 17, fontWeight: '700' as const, color: "#000", marginBottom: 2 },
  notificationRole: { fontSize: 14, color: "#000", lineHeight: 18 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 40 },
  loadingWordText: { fontSize: 32, fontWeight: '800' as const, letterSpacing: 1 },
  swipeCard: { width: 280, height: 180, borderRadius: 20, borderWidth: 2, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  swipeCardInner: { flex: 1, borderRadius: 16, padding: 16 },
  swipeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swipeCardLogo: { width: 40, height: 40, borderRadius: 10 },
  swipeCardLine: { height: 10, borderRadius: 5 },
});
