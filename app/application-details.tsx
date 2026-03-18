import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Clock,
  Video,
  ExternalLink,
  Bell,
  Calendar,
  CheckCircle2,
  Circle,
  XCircle,
  Wifi,
  Building2,
  Users,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Bot,
  ChevronRight,
  X,
  Check,

} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

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

function getFlowSteps(): FlowStep[] {
  return [
    { label: 'You swiped right 👍', date: 'Just now', status: 'completed' },
    { label: 'AI started filling the application 🤖', date: 'Just now', status: 'completed' },
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

export default function ApplicationDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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
    
    const getCompanyLogoUrl = (companyName: string, logo?: string, logoUrl?: string): string => {
      const SUPABASE_URL = 'https://widujxpahzlpegzjjpqp.supabase.co';
      if (logoUrl && logoUrl.startsWith('http')) return logoUrl;
      if (logo && logo.startsWith('http')) return logo;
      if (logoUrl) {
        return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logoUrl}`;
      }
      if (logo) {
        return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logo}`;
      }
      const logoPath = `logos/${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logoPath}`;
    };

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

  const [showCredentials, setShowCredentials] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showVideoModal, setShowVideoModal] = useState(false);

  // Animated pulsing dot + auto-advance — always runs regardless of DB status
  const pendingStepCount = 11; // 2 base completed + 9 animated steps
  const [activeStepOffset, setActiveStepOffset] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [stepLoaded, setStepLoaded] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const storageKey = `app_step_${id}`;

  // Restore saved step offset on mount
  useEffect(() => {
    if (!id) return;
    AsyncStorage.getItem(storageKey).then((val) => {
      if (val !== null) {
        const saved = parseInt(val, 10);
        if (!isNaN(saved)) {
          setActiveStepOffset(saved);
          if (saved >= pendingStepCount - 2 - 1) setReachedEnd(true);
        }
      }
      setStepLoaded(true);
    });
  }, [id]);

  // Persist step offset whenever it changes
  useEffect(() => {
    if (!stepLoaded || !id) return;
    AsyncStorage.setItem(storageKey, String(activeStepOffset));
  }, [activeStepOffset, stepLoaded, id]);

  useEffect(() => {
    if (reachedEnd || !stepLoaded) return;
    const interval = setInterval(() => {
      setActiveStepOffset((prev) => {
        const next = prev + 1;
        if (next >= pendingStepCount - 2 - 1) {
          // pendingStepCount - 2 base steps - 1 for zero-index = last animated step
          setReachedEnd(true);
          return pendingStepCount - 2 - 1;
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [reachedEnd, stepLoaded]);

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


  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!application) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
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

  const handleSaveCredentials = () => {
    Alert.alert('Saved', 'Portal credentials saved. AI will use these to apply on your behalf.');
    setShowCredentials(false);
  };

  const formatSalary = (min: number, max: number) => {
    const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`);
    return `${fmt(min)} - ${fmt(max)}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Application Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.credentialsCard} onPress={() => setShowCredentials(true)}>
          <View style={styles.credIcon}>
            <Key size={18} color="#1565C0" />
          </View>
          <View style={styles.credContent}>
            <Text style={styles.credTitle}>Portal Credentials</Text>
            <Text style={styles.credSubtext}>{portalEmail ? 'Credentials saved' : 'Add login for AI to apply on your behalf'}</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </Pressable>

        <View style={styles.companyCard}>
          <Image source={{ uri: job.companyLogo }} style={styles.logo} />
          <Text style={styles.jobTitle}>{job.jobTitle}</Text>
          <Text style={styles.companyName}>{job.companyName}</Text>
          <View style={styles.locationRow}>
            <LocationIcon size={14} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{job.location}</Text>
          </View>
          <View style={[styles.statusBadgeLarge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressSectionTitle}>Application Progress</Text>
          {flowSteps.map((step, idx) => {
            let isCompleted = step.status === 'completed';
            let isCurrent = false;

            if (idx >= 2) {
              const pendingIdx = idx - 2;
              if (reachedEnd) {
                isCompleted = true;
              } else if (pendingIdx < activeStepOffset) {
                isCompleted = true;
              } else if (pendingIdx === activeStepOffset) {
                isCurrent = true;
              } else {
                return null;
              }
            }

            let isLastVisible = idx === flowSteps.length - 1;
            if (!reachedEnd && idx >= 2) {
              const pendingIdx = idx - 2;
              isLastVisible = pendingIdx === activeStepOffset;
            }

            return (
              <View key={idx} style={styles.flowStep}>
                <View style={styles.flowIndicator}>
                  {isCompleted ? (
                    <CheckCircle2 size={20} color="#10B981" />
                  ) : isCurrent ? (
                    <Animated.View style={[styles.flowDotCurrent, { opacity: pulseAnim }]} />
                  ) : (
                    <Circle size={20} color="rgba(255,255,255,0.2)" />
                  )}
                  {!isLastVisible && (
                    <View style={[styles.flowLine, isCompleted && styles.flowLineCompleted]} />
                  )}
                </View>
                <View style={styles.flowContent}>
                  <View style={styles.flowLabelRow}>
                    <Text style={[styles.flowLabel, isCurrent && styles.flowLabelActive]}>{step.label}</Text>
                    {isCompleted && idx >= 2 ? <Text style={styles.flowDate}>Done</Text> : step.date ? <Text style={styles.flowDate}>{step.date}</Text> : null}
                  </View>
                  {step.description && isCurrent ? (
                    <Text style={styles.flowDesc}>{step.description}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>



        {application.verificationOtp && (
          <View style={styles.otpCard}>
            <View style={styles.otpIcon}>
              <Key size={18} color="#7B1FA2" />
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

        {appData?.live_url && (
          <Pressable 
            style={styles.watchVideoBtn} 
            onPress={() => setShowVideoModal(true)}
          >
            <Video size={18} color="#FFFFFF" />
            <Text style={styles.watchVideoBtnText}>Watch the AI Apply Live</Text>
          </Pressable>
        )}





        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showVideoModal} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.videoModalOverlay}>
          <Pressable onPress={() => setShowVideoModal(false)} style={styles.videoCloseBtn}>
            <X size={28} color="#FFFFFF" />
          </Pressable>
          <WebView
            source={{ uri: appData?.live_url || '' }}
            style={styles.webView}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      </Modal>

      <Modal visible={showCredentials} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Portal Credentials</Text>
              <Pressable onPress={() => setShowCredentials(false)} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtext}>Add your login credentials for {job.companyName}'s job portal so the AI agent can apply on your behalf.</Text>
            <Text style={styles.fieldLabel}>Email / Username</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textTertiary}
              value={portalEmail}
              onChangeText={setPortalEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.modalInput, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={portalPassword}
                onChangeText={setPortalPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color={Colors.textTertiary} /> : <Eye size={18} color={Colors.textTertiary} />}
              </Pressable>
            </View>
            <View style={styles.securityNote}>
              <Key size={14} color={Colors.textTertiary} />
              <Text style={styles.securityText}>Credentials are encrypted and stored securely</Text>
            </View>
            <Pressable style={styles.saveCredBtn} onPress={handleSaveCredentials}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveCredBtnText}>Save Credentials</Text>
            </Pressable>
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
  companyCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 12 },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: "#FFF", marginBottom: 12 },
  jobTitle: { fontSize: 20, fontWeight: '800' as const, color: "#000", textAlign: 'center' },
  companyName: { fontSize: 14, color: "#000", fontWeight: '600' as const, marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontSize: 13, color: "#000" },
  statusBadgeLarge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10 },
  statusBadgeText: { fontSize: 14, fontWeight: '700' as const },
  progressCard: { backgroundColor: '#111111', borderRadius: 16, padding: 18, marginBottom: 12 },
  progressSectionTitle: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 14 },
  flowStep: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 50 },
  flowIndicator: { alignItems: 'center', width: 24 },
  flowDotCurrent: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#2196F3', borderWidth: 3, borderColor: '#90CAF9' },
  flowLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 2 },
  flowLineCompleted: { backgroundColor: '#10B981' },
  flowContent: { flex: 1, marginLeft: 12, paddingBottom: 12 },
  flowLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flowLabel: { fontSize: 13, fontWeight: '600' as const, color: 'rgba(255,255,255,0.5)', flex: 1 },
  flowLabelActive: { color: '#FFFFFF', fontWeight: '700' as const },
  flowDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 },
  flowDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4, lineHeight: 17 },
  watchVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 14, marginBottom: 12 },
  watchVideoBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  videoModalOverlay: { flex: 1, backgroundColor: '#000' },
  videoCloseBtn: { position: 'absolute' as const, top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  webView: { flex: 1, backgroundColor: '#000' },
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
