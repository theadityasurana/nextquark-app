import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Clock,
  ExternalLink,
  Wifi,
  Building2,
  Users,
  Sparkles,
  Eye,
  ChevronRight,
  X,
  Check,
} from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { getCompanyLogoUrl, updateApplicationProgress } from '@/lib/jobs';
import { SkeletonApplicationDetails } from '@/components/Skeleton';
import { usePipStore } from '@/lib/pip-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'AI is cooking 🔥', color: '#92400E', bg: '#FEF3C7' },
  applied: { label: 'Submitted, no cap ✅', color: '#065F46', bg: '#D1FAE5' },
  submitted: { label: 'Submitted, no cap ✅', color: '#065F46', bg: '#D1FAE5' },
  completed: { label: "You're locked in 🎯", color: '#065F46', bg: '#D1FAE5' },
  under_review: { label: 'They peeping your profile 👀', color: '#5B21B6', bg: '#EDE9FE' },
  interviewing: { label: 'Interview incoming 🗓️', color: '#1E40AF', bg: '#DBEAFE' },
  interview_scheduled: { label: 'Interview incoming 🗓️', color: '#1E40AF', bg: '#DBEAFE' },
  offer: { label: 'W offer received 🏆', color: '#065F46', bg: '#D1FAE5' },
  rejected: { label: 'Not the vibe this time 💫', color: '#6B7280', bg: '#F3F4F6' },
  withdrawn: { label: 'You dipped 🫡', color: '#6B7280', bg: '#F3F4F6' },
  failed: { label: 'AI is cooking 🔥', color: '#92400E', bg: '#FEF3C7' },
};

const platformLabels: Record<string, { label: string; color: string }> = {
  google_meet: { label: 'Google Meet', color: '#00897B' },
  zoom: { label: 'Zoom', color: '#2D8CFF' },
  microsoft_teams: { label: 'Microsoft Teams', color: '#6264A7' },
};

interface FlowStep {
  label: string;
  date: string;
  status: 'completed' | 'current' | 'pending' | 'action_needed';
  description?: string;
}

function getEmbeddableUrl(url: string): { uri?: string; html?: string } {
  if (!url) return { uri: '' };

  // YouTube: convert watch/shorts/youtu.be links to embed
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    return { uri: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&playsinline=1&rel=0` };
  }

  // Vimeo: convert to embed
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { uri: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  }

  // Loom: convert to embed
  const loomMatch = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loomMatch) {
    return { uri: `https://www.loom.com/embed/${loomMatch[1]}?autoplay=1` };
  }

  // Direct video file (.mp4, .webm, .mov, .m3u8) — wrap in HTML player
  if (/\.(mp4|webm|mov|m3u8)(\?|$)/.test(url)) {
    return {
      html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=10,user-scalable=yes"><style>*{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh}video{width:100%;height:100%;object-fit:contain}</style></head><body><video src="${url}" autoplay playsinline controls></video></body></html>`,
    };
  }

  // Default: load URL directly
  return { uri: url };
}

function getFlowSteps(): FlowStep[] {
  return [
    { label: 'You swiped right 👍', date: '', status: 'completed' },
    { label: 'AI started filling the application 🤖', date: '', status: 'completed' },
    { label: 'AI is opening the job portal 🌐', date: '', status: 'pending', description: 'Navigating to the application page...' },
    { label: 'AI is filling out your name & contact info ✍️', date: '', status: 'pending', description: 'Entering your personal details...' },
    { label: 'AI is entering your education details 🎓', date: '', status: 'pending', description: 'Adding your school & degree info...' },
    { label: 'AI is adding your work experience 💼', date: '', status: 'pending', description: 'Filling in your past roles & achievements...' },
    { label: 'AI is uploading your resume 📄', date: '', status: 'pending', description: 'Attaching your resume to the application...' },
    { label: 'AI is answering screening questions 🧠', date: '', status: 'pending', description: 'Answering those tricky questions for you...' },
    { label: 'AI is filling out equal opportunity fields 📋', date: '', status: 'pending', description: 'Handling the demographic section...' },
    { label: 'AI is reviewing everything one last time 🔍', date: '', status: 'pending', description: 'Double-checking all the fields before submitting...' },
    { label: 'Application submitted 🚀', date: '', status: 'pending', description: "You're locked in 🎯" },
  ];
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface StepLog { time: string; arrow: string; color: string; msg: string; dim: boolean }

function getStepLogs(stepIdx: number, timestamp: string, company: string, title: string, appId: string): StepLog[] {
  const t = timestamp ? new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '';
  if (!t) return [];
  const co = company;
  const sid = appId.slice(0, 8);
  const portals = ['Greenhouse', 'Lever', 'Workday', 'SmartRecruiters', 'iCIMS', 'Taleo'];
  const portal = portals[appId.charCodeAt(0) % portals.length];

  switch (stepIdx) {
    case 0: return [
      { time: t, arrow: '\u25B6', color: '#4ADE80', msg: `Swiped right on ${co} — ${title}`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `[Queue] Added to application queue`, dim: true },
    ];
    case 1: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Session ${sid}] Browser session started`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `[Session ${sid}] Viewport: 1920\u00D71080, cookies cleared`, dim: true },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `[Session ${sid}] User-Agent: Chrome/125 headless`, dim: true },
    ];
    case 2: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 1] Navigating to ${co} careers page`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `[Step 1] GET ${co.toLowerCase().replace(/[^a-z]/g, '')}.com/careers \u2192 200 OK`, dim: true },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `[Step 2] Detected portal: ${portal}`, dim: true },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `[Step 2] Opening job listing for "${title}"`, dim: true },
    ];
    case 3: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 3] Entering personal details`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `First name \u2713 Last name \u2713 Email \u2713 Phone \u2713`, dim: true },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `Address \u2713 City \u2713 State \u2713 ZIP \u2713 LinkedIn \u2713`, dim: true },
    ];
    case 4: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 4] Filling education details`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `School \u2713 Degree \u2713 Major \u2713 GPA \u2713 Dates \u2713`, dim: true },
    ];
    case 5: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 5] Filling work experience`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `Title \u2713 Company \u2713 Dates \u2713 Description \u2713`, dim: true },
    ];
    case 6: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 6] Uploading resume`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `POST /upload \u2192 200 OK (PDF, 2 pages)`, dim: true },
    ];
    case 7: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 7] Answering screening questions`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `Q1: work authorization \u2192 answered \u2713`, dim: true },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `Q2: years of experience \u2192 answered \u2713`, dim: true },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `Q3: willing to relocate \u2192 answered \u2713`, dim: true },
    ];
    case 8: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 8] Filling EEO / demographic fields`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `Gender \u2713 Ethnicity \u2713 Veteran \u2713 Disability \u2713`, dim: true },
    ];
    case 9: return [
      { time: t, arrow: '\u25B6', color: '#60A5FA', msg: `[Step 9] Final review`, dim: false },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `Validating all fields... name \u2713 email \u2713 resume \u2713 education \u2713 experience \u2713`, dim: true },
      { time: t, arrow: '\u00B7', color: '#6B7280', msg: `All ${portal} required fields complete`, dim: true },
    ];
    case 10: return [
      { time: t, arrow: '\u25B6', color: '#4ADE80', msg: `[Step 10] Clicked "Submit Application"`, dim: false },
      { time: t, arrow: '\u25B6', color: '#4ADE80', msg: `Confirmation page detected \u2192 /success`, dim: false },
      { time: t, arrow: '\u2713', color: '#4ADE80', msg: `Application submitted successfully`, dim: false },
    ];
    default: return [];
  }
}

export default function ApplicationDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, openModal } = useLocalSearchParams<{ id: string; openModal?: string }>();
  const colors = useColors();

  const { data: appData, isLoading } = useQuery({
    queryKey: ['application-details', id],
    queryFn: async () => {
      const { data: appData, error: appError } = await supabase
        .from('live_application_queue')
        .select('*')
        .eq('id', id)
        .single();
      if (appError) throw appError;

      let jobData = null;
      if (appData.job_id) {
        const { data } = await supabase
          .from('jobs')
          .select('description, location, requirements, skills, title, benefits, employment_type, location_type, experience_level, salary_min, salary_max, salary_currency, company_description, detailed_requirements, culture_photos, deadline, portal, portal_url, company_website, applicants_count')
          .eq('id', appData.job_id)
          .single();
        jobData = data;
      }

      let companyData = null;
      if (appData.company_name) {
        const { data } = await supabase
          .from('companies')
          .select('description, logo, logo_url, website, size, industry')
          .ilike('name', appData.company_name)
          .single();
        companyData = data;
      }

      return { ...appData, jobData, companyData };
    },
    enabled: !!id,
  });

  const application = useMemo(() => {
    if (!appData) return null;
    
    const companyLogo = getCompanyLogoUrl(
      appData.company_name,
      appData.companyData?.logo,
      appData.companyData?.logo_url
    );

    const jd = appData.jobData;
    const cd = appData.companyData;

    return {
      id: appData.id,
      jobId: appData.job_id,
      appliedDate: new Date(appData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: appData.status || 'pending',
      verificationOtp: appData.verification_otp || null,
      otpReceivedAt: appData.otp_received_at || null,
      job: {
        id: appData.job_id,
        jobTitle: jd?.title || appData.job_title,
        companyName: appData.company_name,
        companyLogo,
        location: jd?.location || appData.location || 'Remote',
        locationType: (jd?.location_type || 'remote') as 'remote' | 'onsite' | 'hybrid',
        employmentType: jd?.employment_type || 'Full-time',
        experienceLevel: jd?.experience_level || 'Not specified',
        salaryMin: jd?.salary_min || appData.salary_min || 0,
        salaryMax: jd?.salary_max || appData.salary_max || 0,
        salaryCurrency: jd?.salary_currency || 'USD',
        salaryPeriod: 'year',
        applicantsCount: jd?.applicants_count || 0,
        description: jd?.description || 'No description available',
        companyDescription: cd?.description || jd?.company_description || `${appData.company_name} is hiring for this position.`,
        detailedRequirements: jd?.detailed_requirements || '',
        requirements: Array.isArray(jd?.requirements) ? jd.requirements : [],
        skills: Array.isArray(jd?.skills) ? jd.skills : [],
        benefits: Array.isArray(jd?.benefits) ? jd.benefits : [],
        culturePhotos: Array.isArray(jd?.culture_photos) ? jd.culture_photos : [],
        deadline: jd?.deadline || null,
        portal: jd?.portal || null,
        portalUrl: jd?.portal_url || null,
        companyWebsite: jd?.company_website || cd?.website || null,
        companySize: cd?.size || null,
        companyIndustry: cd?.industry || null,
      },
    };
  }, [appData]);



  const [showLiveModal, setShowLiveModal] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const pixelAnim = useRef(new Animated.Value(0)).current;
  const waitingPixelAnim = useRef(new Animated.Value(0)).current;
  const pipStore = usePipStore();

  // Sync streamUrl with appData.live_url when it becomes available
  useEffect(() => {
    if (appData?.live_url && !streamUrl) {
      setStreamUrl(appData.live_url);
    }
  }, [appData?.live_url]);

  // Show pixels for 3s after streamUrl arrives before revealing WebView
  useEffect(() => {
    if (!streamUrl) { setStreamReady(false); return; }
    setStreamReady(false);
    const timer = setTimeout(() => setStreamReady(true), 3000);
    return () => clearTimeout(timer);
  }, [streamUrl]);

  // Poll for live_url when modal is open but no stream yet
  useEffect(() => {
    if (!showLiveModal || streamUrl || !id) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('live_application_queue')
          .select('live_url')
          .eq('id', id)
          .single();
        if (data?.live_url) setStreamUrl(data.live_url);
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [showLiveModal, streamUrl, id]);

  // Looping pixel animation while waiting for stream (includes 3s transition)
  useEffect(() => {
    if (streamReady) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waitingPixelAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(waitingPixelAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [streamReady]);

  // Auto-open modal if navigated from PiP
  useEffect(() => {
    if (openModal === 'true' && !isLoading && application) {
      setShowLiveModal(true);
    }
  }, [openModal, isLoading, application]);

  // Elapsed timer
  useEffect(() => {
    if (!appData?.applied_at && !appData?.created_at) return;
    const startTime = new Date(appData.applied_at || appData.created_at).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setElapsedTime(`${mins}:${secs}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [appData?.applied_at, appData?.created_at]);

  const handleRefreshStream = async () => {
    setIsRefreshing(true);
    // Fetch the latest live_url from Supabase
    let newUrl: string | null = null;
    try {
      const { data, error } = await supabase
        .from('live_application_queue')
        .select('live_url')
        .eq('id', id)
        .single();
      if (!error && data?.live_url) {
        newUrl = data.live_url;
      }
    } catch (e) {
      console.log('Error fetching live_url:', e);
    }
    // Update state and bump key together so WebView re-renders with new URL
    if (newUrl) {
      setStreamUrl(newUrl);
    }
    setWebViewKey(k => k + 1);
    Animated.sequence([
      Animated.timing(pixelAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(pixelAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setIsRefreshing(false);
    });
  };

  const handleScreenshot = useCallback(async () => {
    const url = streamUrl || appData?.live_url;
    if (!url) {
      Alert.alert('Not available', 'No live stream URL to share.');
      return;
    }
    try {
      await Share.share({
        message: `Check out my AI applying to ${application?.job?.companyName || 'a company'} live! 🤖\n${url}`,
        url: url,
      });
    } catch {
      Alert.alert('Error', 'Could not share the stream link.');
    }
  }, [streamUrl, appData?.live_url, application?.job?.companyName]);

  const handleMinimize = () => {
    setShowLiveModal(false);
    const startTime = appData?.applied_at || appData?.created_at;
    pipStore.show(
      streamUrl || appData?.live_url || '',
      application?.job?.companyName || '',
      !reachedEnd,
      startTime ? new Date(startTime).getTime() : Date.now(),
      id || ''
    );
  };

  // DB-driven progress tracking
  const [progressStep, setProgressStep] = useState(0);
  const [progressTimestamps, setProgressTimestamps] = useState<string[]>([]);
  const [reachedEnd, setReachedEnd] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Poll progress from DB
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const checkProgress = async () => {
      const result = await updateApplicationProgress(id);
      if (cancelled) return;
      setProgressStep(result.step);
      setProgressTimestamps(result.timestamps);
      if (result.done) setReachedEnd(true);
    };

    checkProgress();
    const interval = setInterval(checkProgress, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  useEffect(() => {
    if (reachedEnd) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reachedEnd]);

  useEffect(() => {
    if (reachedEnd) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reachedEnd]);


  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={() => safeGoBack(router)} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
        <SkeletonApplicationDetails />
      </View>
    );
  }

  if (!application) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => safeGoBack(router)}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
        <Text style={styles.errorText}>Application not found</Text>
      </View>
    );
  }

  const job = application.job;
  const displayStatus = reachedEnd ? 'completed' : 'pending';
  const status = statusConfig[displayStatus];
  const LocationIcon = job.locationType === 'remote' ? Wifi : job.locationType === 'hybrid' ? Building2 : MapPin;
  const flowSteps = getFlowSteps();

  const formatSalary = (min: number, max: number) => {
    const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`);
    return `${fmt(min)} - ${fmt(max)}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => safeGoBack(router)}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Application Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.companyCard}>
          <View style={styles.cardTopRow}>
            <Image source={{ uri: job.companyLogo }} style={styles.logo} />
            <View style={styles.cardInfo}>
              <Text style={styles.jobTitle} numberOfLines={2}>{job.jobTitle}</Text>
              <Text style={styles.companyName}>{job.companyName}</Text>
              <View style={styles.locationRow}>
                <LocationIcon size={13} color="#6B7280" />
                <Text style={styles.locationText}>{job.location}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statusStrip, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusStripText, { color: status.color }]}>{status.label}</Text>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.appliedDateBox}>
              <Ionicons name="calendar-outline" size={13} color="#065F46" />
              <Text style={styles.appliedDateText}>{application.appliedDate}</Text>
            </View>
            {application.jobId && (
              <Pressable
                style={styles.viewJobBtn}
                onPress={() => router.push({ pathname: '/job-details', params: { id: application.jobId, hideApply: 'true' } })}
              >
                <Briefcase size={13} color="#1565C0" />
                <Text style={styles.viewJobBtnText}>Full JD</Text>
                <ChevronRight size={13} color="#1565C0" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Live Streaming Card - Always visible */}
        <Pressable style={reachedEnd ? styles.liveCardCompleted : styles.liveCard} onPress={() => setShowLiveModal(true)}>
          <View style={styles.liveCardLeft}>
            <View style={reachedEnd ? styles.liveIconWrapCompleted : styles.liveIconWrap}>
              {reachedEnd ? (
                <Ionicons name="play" size={18} color="#E53935" />
              ) : (
                <Animated.View style={[styles.liveDot, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={reachedEnd ? styles.liveCardTitleCompleted : styles.liveCardTitle}>
                {reachedEnd ? 'Watch Recording' : 'AI is applying live'}
              </Text>
              <Text style={styles.liveCardSubtitle}>
                {reachedEnd ? 'See how AI completed your application' : 'Tap to watch in real-time'}
              </Text>
            </View>
          </View>

        </Pressable>

        {/* Progress Flow */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressSectionTitle}>Application Progress</Text>
            <View style={[styles.progressBadge, reachedEnd && styles.progressBadgeDone]}>
              <Text style={[styles.progressBadgeText, reachedEnd && styles.progressBadgeTextDone]}>
                {reachedEnd ? 'Completed' : `Step ${progressStep + 1}/${flowSteps.length}`}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.progressScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {flowSteps.map((step, idx) => {
              let isCompleted = false;
              let isCurrent = false;

              if (idx < progressStep) {
                isCompleted = true;
              } else if (idx === progressStep && !reachedEnd) {
                isCurrent = true;
              } else if (reachedEnd) {
                isCompleted = true;
              } else {
                return null;
              }

              let isLastVisible = idx === flowSteps.length - 1;
              if (!reachedEnd) {
                isLastVisible = idx === progressStep;
              }

              const stepTimestamp = progressTimestamps[idx];
              const dateLabel = stepTimestamp
                ? new Date(stepTimestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : '';

              return (
                <View key={`step-${idx}`} style={styles.flowStepWrap}>
                  <View style={styles.flowIndicatorCol}>
                    {isCompleted ? (
                      <View style={styles.flowDotCompleted}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    ) : isCurrent ? (
                      <Animated.View style={[styles.flowDotCurrent, { opacity: pulseAnim }]} />
                    ) : (
                      <View style={styles.flowDotPending} />
                    )}
                    {!isLastVisible && (
                      <View style={[styles.flowLineExtended, isCompleted && styles.flowLineCompleted]} />
                    )}
                  </View>
                  <View style={styles.flowRightCol}>
                    <View style={[styles.flowContent, isCurrent && styles.flowContentActive]}>
                      <Text style={[styles.flowLabel, isCompleted && styles.flowLabelCompleted, isCurrent && styles.flowLabelActive]}>{step.label}</Text>
                      {step.description && isCurrent && (
                        <Text style={styles.flowDesc}>{step.description}</Text>
                      )}
                      {dateLabel ? <Text style={styles.flowDate}>{dateLabel}</Text> : null}
                    </View>
                    {(isCompleted || isCurrent) && (
                      <View style={styles.stepLogs}>
                        {getStepLogs(idx, stepTimestamp || '', application.job.companyName, application.job.jobTitle, application.id).map((log, li) => (
                          <View key={li} style={styles.logRow}>
                            <Text style={styles.logTime}>{log.time}</Text>
                            <Text style={[styles.logArrow, { color: log.color }]}>{log.arrow}</Text>
                            <Text style={[styles.logMsg, { color: log.dim ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.65)' }]}>{log.msg}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {application.verificationOtp && (
          <View style={styles.otpCard}>
            <View style={styles.otpIcon}>
              <Ionicons name="key-outline" size={18} color="#7B1FA2" />
            </View>
            <View style={styles.otpContent}>
              <Text style={styles.otpTitle}>OTP Received</Text>
              <Text style={styles.otpCode}>{application.verificationOtp}</Text>
              {application.otpReceivedAt && (
                <Text style={styles.otpTime}>
                  Received {new Date(application.otpReceivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              )}
            </View>
            <Sparkles size={16} color="#7B1FA2" />
          </View>
        )}





        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Live Stream Modal - proper Modal for back button handling */}
      <Modal visible={showLiveModal} animationType="slide" transparent onRequestClose={() => setShowLiveModal(false)}>
        <View style={styles.liveModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLiveModal(false)}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          </Pressable>
          <View style={styles.liveModalContent}>
            <View style={styles.liveModalHandle} />
            <View style={styles.liveModalHeader}>
              <View style={styles.liveModalHeaderLeft}>
                {!reachedEnd ? (
                  <View style={styles.liveModalBadgeLive}>
                    <View style={styles.liveModalBadgeDot} />
                    <Text style={styles.liveModalBadgeLiveText}>LIVE</Text>
                  </View>
                ) : (
                  <View style={styles.liveModalBadgeEnded}>
                    <Ionicons name="stop-circle-outline" size={12} color="#8E8E93" />
                    <Text style={styles.liveModalBadgeEndedText}>Ended</Text>
                  </View>
                )}
                <View style={styles.elapsedBadge}>
                  <Ionicons name="time-outline" size={11} color="#FFFFFF" />
                  <Text style={styles.elapsedText}>{elapsedTime}</Text>
                </View>
              </View>
              <View style={styles.liveModalHeaderRight}>
                <Pressable onPress={handleScreenshot} style={styles.liveModalActionBtn} hitSlop={8}>
                  <Ionicons name="share-outline" size={17} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={handleRefreshStream} style={styles.liveModalActionBtn} hitSlop={8} disabled={isRefreshing}>
                  <Ionicons name="refresh" size={17} color={isRefreshing ? '#555' : '#FFFFFF'} />
                </Pressable>
                <Pressable onPress={handleMinimize} style={styles.liveModalActionBtn} hitSlop={8}>
                  <Ionicons name="contract-outline" size={17} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={() => setShowLiveModal(false)} hitSlop={8}>
                  <Text style={styles.liveModalDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.liveModalWebViewWrap} collapsable={false}>
              {streamUrl && streamReady ? (
                (() => {
                  const source = getEmbeddableUrl(streamUrl);
                  return (
                    <WebView
                      key={webViewKey}
                      source={source.html ? { html: source.html } : { uri: source.uri || '' }}
                      style={styles.webView}
                      allowsFullscreenVideo
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                      javaScriptEnabled
                      domStorageEnabled
                      scalesPageToFit={true}
                      scrollEnabled={true}
                      injectedJavaScript={`
                        var meta = document.querySelector('meta[name="viewport"]');
                        if (meta) { meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=10, user-scalable=yes'); }
                        else { meta = document.createElement('meta'); meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1, maximum-scale=10, user-scalable=yes'; document.head.appendChild(meta); }
                        true;
                      `}
                      startInLoadingState
                      renderLoading={() => (
                        <View style={styles.webViewLoading}>
                          <ActivityIndicator size="large" color="#2196F3" />
                          <Text style={styles.webViewLoadingText}>Loading stream...</Text>
                        </View>
                      )}
                    />
                  );
                })()
              ) : (
                <View style={styles.liveModalPlaceholder}>
                  <View style={styles.pixelGrid}>
                    {Array.from({ length: 96 }).map((_, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.pixelBlock,
                          {
                            backgroundColor: i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? '#CCCCCC' : '#000000',
                            opacity: waitingPixelAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [Math.random() * 0.4 + 0.1, Math.random() > 0.4 ? 1 : 0.2, Math.random() * 0.6 + 0.2],
                            }),
                          }
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.pixelLoaderWrap}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.pixelLoaderText}>Connecting to live stream...</Text>
                  </View>
                </View>
              )}
              {/* Pixelated refresh overlay */}
              {isRefreshing && (
                <Animated.View style={[styles.pixelOverlay, { opacity: pixelAnim }]}>
                  <View style={styles.pixelGrid}>
                    {Array.from({ length: 96 }).map((_, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.pixelBlock,
                          {
                            backgroundColor: i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? '#CCCCCC' : '#000000',
                            opacity: pixelAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0, Math.random() > 0.4 ? 1 : 0.2, Math.random() > 0.5 ? 0.8 : 1],
                            }),
                          }
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.pixelLoaderWrap}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.pixelLoaderText}>Refreshing stream...</Text>
                  </View>
                </Animated.View>
              )}
            </View>
            <View style={styles.liveModalFooter}>
              <View style={styles.liveModalRetentionNotice}>
                <Ionicons name="time-outline" size={13} color="#FF9800" />
                <Text style={styles.liveModalRetentionText}>Recordings are available for 15 minutes before being deleted from our servers</Text>
              </View>
              <Text style={styles.liveModalFooterText}>
                {reachedEnd
                  ? 'Application was submitted successfully ✅'
                  : progressStep <= 1
                    ? '🚀 Initializing application...'
                    : progressStep <= 4
                      ? '✍️ Filling in your details...'
                      : progressStep <= 7
                        ? '📄 Uploading documents & answering questions...'
                        : progressStep <= 9
                          ? '🔍 Reviewing & finalizing...'
                          : '⏳ Almost done...'
                }
              </Text>
            </View>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: "#000" },
  errorText: { fontSize: 16, color: "#000", textAlign: 'center', marginTop: 40 },
  scrollContent: { paddingHorizontal: 16 },
  credentialsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#90CAF9' },
  credIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#BBDEFB', justifyContent: 'center', alignItems: 'center' },
  credContent: { flex: 1, marginLeft: 12 },
  credTitle: { fontSize: 14, fontWeight: '700' as const, color: '#1565C0' },
  credSubtext: { fontSize: 12, color: '#42A5F5', marginTop: 2 },
  companyCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardInfo: { flex: 1 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F3F4F6' },
  jobTitle: { fontSize: 18, fontWeight: '800' as const, color: '#111', lineHeight: 22 },
  companyName: { fontSize: 14, color: '#374151', fontWeight: '600' as const, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: '#6B7280' },
  statusStrip: { marginTop: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  statusStripText: { fontSize: 14, fontWeight: '700' as const },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, width: '100%' },
  appliedDateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#D1FAE5' },
  appliedDateText: { fontSize: 13, fontWeight: '600' as const, color: '#065F46' },
  viewJobBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#E3F2FD' },
  viewJobBtnText: { fontSize: 13, fontWeight: '600' as const, color: '#1565C0' },
  // Live streaming card
  liveCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1C1E', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  liveCardCompleted: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1C1E', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.2)', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  liveCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  liveIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(229,57,53,0.12)', justifyContent: 'center', alignItems: 'center' },
  liveIconWrapCompleted: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.12)', justifyContent: 'center', alignItems: 'center' },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E53935' },
  liveCardTitle: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF', letterSpacing: -0.2 },
  liveCardTitleCompleted: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF', letterSpacing: -0.2 },
  liveCardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2, letterSpacing: -0.1 },
  liveCardChevron: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  // Progress card
  progressCard: { backgroundColor: '#111111', borderRadius: 16, padding: 18, marginBottom: 12, height: 340 },
  progressScroll: { flex: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressSectionTitle: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  progressBadge: { backgroundColor: 'rgba(33,150,243,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  progressBadgeDone: { backgroundColor: 'rgba(16,185,129,0.15)' },
  progressBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#2196F3' },
  progressBadgeTextDone: { color: '#10B981' },
  flowStep: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  flowStepWrap: { flexDirection: 'row', alignItems: 'stretch' },
  flowIndicatorCol: { alignItems: 'center', width: 28 },
  flowRightCol: { flex: 1, paddingBottom: 4 },
  flowIndicator: { alignItems: 'center', width: 28 },
  flowDotCompleted: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  flowDotCurrent: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2196F3', borderWidth: 3, borderColor: '#90CAF9' },
  flowDotPending: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  flowLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 2 },
  flowLineExtended: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 2 },
  flowLineCompleted: { backgroundColor: '#10B981' },
  flowContent: { flex: 1, marginLeft: 12, paddingBottom: 10 },
  flowContentActive: { backgroundColor: 'rgba(33,150,243,0.08)', marginLeft: 10, paddingLeft: 10, paddingVertical: 8, borderRadius: 10 },
  flowLabel: { fontSize: 13, fontWeight: '600' as const, color: 'rgba(255,255,255,0.4)' },
  flowLabelCompleted: { color: 'rgba(255,255,255,0.7)' },
  flowLabelActive: { color: '#FFFFFF', fontWeight: '700' as const, fontSize: 14 },
  flowDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 },
  flowDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 17 },
  stepLogs: { marginBottom: 6, marginTop: 4, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)' },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 2 },
  logTime: { fontSize: 8, color: 'rgba(255,255,255,0.25)', width: 68, fontFamily: MONO, fontVariant: ['tabular-nums'] as any },
  logArrow: { fontSize: 8, marginRight: 4, marginTop: 1 },
  logMsg: { flex: 1, fontSize: 9, fontFamily: MONO, lineHeight: 13 },
  // Live modal (resume-style popup)
  liveModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  liveModalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  liveModalHandle: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginTop: 8 },
  liveModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  liveModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveModalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveModalActionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  elapsedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  elapsedText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  liveModalBadgeLive: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(229,57,53,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveModalBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E53935' },
  liveModalBadgeLiveText: { fontSize: 11, fontWeight: '800' as const, color: '#E53935', letterSpacing: 0.5 },
  liveModalBadgeEnded: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(142,142,147,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveModalBadgeEndedText: { fontSize: 11, fontWeight: '700' as const, color: '#8E8E93' },
  liveModalTitle: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  liveModalDoneText: { fontSize: 16, fontWeight: '600' as const, color: '#2196F3' },
  liveModalWebViewWrap: { height: SCREEN_HEIGHT * 0.28, margin: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', position: 'relative' as const },
  pixelOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  pixelGrid: { flexDirection: 'row', flexWrap: 'wrap', position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  pixelBlock: { width: '12.5%', height: '8.33%' },
  pixelLoaderWrap: { position: 'absolute' as const, alignItems: 'center', gap: 8 },
  pixelLoaderText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' as const },
  liveModalPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', position: 'relative' as const },
  liveModalFooter: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)', gap: 6 },
  liveModalRetentionNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,152,0,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  liveModalRetentionText: { fontSize: 11, color: '#FF9800', fontWeight: '500' as const, flex: 1 },
  liveModalFooterText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' as const },
  webView: { flex: 1, backgroundColor: '#000' },
  webViewLoading: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  webViewLoadingText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10 },
  infoCards: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  infoCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 11, color: "#000", fontWeight: '500' as const },
  infoValue: { fontSize: 13, fontWeight: '700' as const, color: "#000", textAlign: 'center' },
  salaryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 16 },
  salaryLabel: { fontSize: 14, color: "#000", fontWeight: '600' as const },
  salaryValue: { fontSize: 18, fontWeight: '800' as const, color: "#000" },
  salaryPeriod: { fontSize: 13, fontWeight: '400' as const, color: "#000" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, color: "#000", marginBottom: 10 },
  descriptionText: { fontSize: 14, color: "#000", lineHeight: 22 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reqBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF", marginTop: 7, marginRight: 12 },
  reqText: { flex: 1, fontSize: 14, color: "#000", lineHeight: 21 },
  cultureHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  culturePhoto: { width: 200, height: 140, borderRadius: 14, marginRight: 10, backgroundColor: "#FFF" },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  skillTagText: { fontSize: 13, color: "#000", fontWeight: '600' as const },
  benefitTag: { backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  benefitTagText: { fontSize: 13, color: "#000", fontWeight: '600' as const },
  actionNeededCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FFB74D' },
  actionNeededIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFE0B2', justifyContent: 'center', alignItems: 'center' },
  actionNeededContent: { flex: 1, marginLeft: 12 },
  actionNeededTitle: { fontSize: 14, fontWeight: '700' as const, color: '#E65100' },
  actionNeededText: { fontSize: 12, color: '#F57C00', marginTop: 2 },
  otpCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#CE93D8' },
  otpIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E1BEE7', justifyContent: 'center', alignItems: 'center' },
  otpContent: { flex: 1, marginLeft: 12 },
  otpTitle: { fontSize: 12, fontWeight: '600' as const, color: '#7B1FA2' },
  otpCode: { fontSize: 22, fontWeight: '800' as const, color: '#4A148C', letterSpacing: 4, marginTop: 2 },
  otpTime: { fontSize: 11, color: '#9C27B0', marginTop: 2 },
  questionBlock: { marginBottom: 16 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  questionText: { fontSize: 14, fontWeight: '600' as const, color: "#000", flex: 1 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#DDD" },
  optionChipSelected: { backgroundColor: '#111111', borderColor: '#111111' },
  optionChipText: { fontSize: 13, fontWeight: '600' as const, color: "#000" },
  optionChipTextSelected: { color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800' as const, color: "#000" },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  modalSubtext: { fontSize: 13, color: "#000", marginBottom: 16, lineHeight: 19 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: "#000", marginBottom: 6, marginTop: 8 },
  modalInput: { backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#000", borderWidth: 1, borderColor: "#DDD" },
  passwordRow: { position: 'relative' as const },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute' as const, right: 14, top: 14 },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 },
  securityText: { fontSize: 12, color: "#000" },
  saveCredBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: "#FFF", borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  saveCredBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
});
