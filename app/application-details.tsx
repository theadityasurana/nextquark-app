import React, { useState, useEffect, useMemo } from 'react';
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
  Camera,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Bot,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: Colors.textSecondary, bg: '#EEEEEE' },
  applied: { label: 'Applied', color: Colors.statusApplied, bg: '#EEEEEE' },
  under_review: { label: 'Under Review', color: Colors.statusReview, bg: Colors.warningSoft },
  interviewing: { label: 'Interview Scheduled', color: Colors.statusInterview, bg: '#FFF3E0' },
  interview_scheduled: { label: 'Interview Scheduled', color: Colors.statusInterview, bg: '#FFF3E0' },
  offer: { label: 'Offer Received', color: Colors.statusOffer, bg: Colors.accentSoft },
  rejected: { label: 'Not Selected', color: Colors.statusRejected, bg: Colors.errorSoft },
  withdrawn: { label: 'Withdrawn', color: Colors.statusWithdrawn, bg: '#F0F2F5' },
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

function getFlowSteps(appStatus: string, hasActionNeeded: boolean): FlowStep[] {
  const base: FlowStep[] = [
    { label: 'You swiped right', date: 'Yesterday', status: 'completed' },
    { label: 'AI started filling application', date: 'Yesterday', status: 'completed' },
  ];

  if (hasActionNeeded) {
    return [
      ...base,
      { label: 'Employer asked additional questions', date: 'Today', status: 'action_needed', description: 'The AI needs your input to answer some questions on the application form.' },
      { label: 'Application form submitted', date: '', status: 'pending' },
      { label: 'Waiting for employer review', date: '', status: 'pending' },
    ];
  }

  const submitted: FlowStep = { label: 'Application form submitted', date: 'Yesterday', status: 'completed' };

  if (appStatus === 'applied') {
    return [
      ...base,
      submitted,
      { label: 'Waiting for employer review', date: 'Today', status: 'current', description: 'AI has submitted your application. Waiting for response.' },
    ];
  }
  if (appStatus === 'under_review') {
    return [
      ...base,
      { label: 'Employer reviewing application', date: 'Today', status: 'current', description: 'The recruiter is reviewing your profile.' },
      { label: 'Interview request', date: '', status: 'pending' },
    ];
  }
  if (appStatus === 'interview_scheduled') {
    return [
      ...base,
      { label: 'Employer reviewed application', date: 'Yesterday', status: 'completed' },
      { label: 'Assessment completed', date: 'Yesterday', status: 'completed' },
      { label: 'Interview request received', date: 'Today', status: 'completed' },
      { label: 'Interview scheduled', date: 'Today', status: 'current', description: 'Your interview is confirmed.' },
    ];
  }
  if (appStatus === 'offer') {
    return [
      ...base,
      { label: 'Employer reviewed application', date: '3 days ago', status: 'completed' },
      { label: 'Interview completed', date: '2 days ago', status: 'completed' },
      { label: 'Offer received', date: 'Today', status: 'current', description: 'Congratulations! Review the offer details.' },
    ];
  }
  if (appStatus === 'rejected') {
    return [
      ...base,
      { label: 'Application not selected', date: 'Today', status: 'current', description: 'Unfortunately, the employer chose another candidate.' },
    ];
  }
  return base;
}

export default function ApplicationDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: appData, isLoading } = useQuery({
    queryKey: ['application-details', id],
    queryFn: async () => {
      const { data: appData, error: appError } = await supabase
        .from('live_application_queue')
        .select('*')
        .eq('id', id)
        .single();
      if (appError) throw appError;

      const { data: jobData } = await supabase
        .from('jobs')
        .select('description, location, requirements, skills, title, benefits, employment_type, location_type, experience_level, salary_min, salary_max, salary_currency')
        .eq('id', appData.job_id)
        .single();

      const { data: companyData } = await supabase
        .from('companies')
        .select('description, logo, logo_url')
        .ilike('name', appData.company_name)
        .single();

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

    return {
      id: appData.id,
      jobId: appData.job_id,
      appliedDate: new Date(appData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: appData.status || 'pending',
      job: {
        id: appData.job_id,
        jobTitle: appData.jobData?.title || appData.job_title,
        companyName: appData.company_name,
        companyLogo,
        location: appData.jobData?.location || appData.location || 'Remote',
        locationType: (appData.jobData?.location_type || 'remote') as 'remote' | 'onsite' | 'hybrid',
        employmentType: appData.jobData?.employment_type || 'Full-time',
        experienceLevel: appData.jobData?.experience_level || 'Not specified',
        salaryMin: appData.jobData?.salary_min || appData.salary_min || 0,
        salaryMax: appData.jobData?.salary_max || appData.salary_max || 0,
        salaryCurrency: appData.jobData?.salary_currency || 'USD',
        salaryPeriod: 'year',
        applicantsCount: 0,
        description: appData.jobData?.description || 'No description available',
        companyDescription: appData.companyData?.description || `${appData.company_name} is hiring for this position.`,
        requirements: appData.jobData?.requirements || [],
        skills: appData.jobData?.skills || [],
        benefits: appData.jobData?.benefits || [],
        culturePhotos: [],
      },
    };
  }, [appData]);

  const [showCredentials, setShowCredentials] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdditionalQuestions, setShowAdditionalQuestions] = useState(false);
  const [additionalAnswers, setAdditionalAnswers] = useState<Record<string, string>>({});
  const [showVideoModal, setShowVideoModal] = useState(false);

  const needsAction = application?.status === 'applied' || application?.status === 'under_review';
  const hasActionNeeded = needsAction && Object.keys(additionalAnswers).length === 0;

  const additionalQuestions = [
    { id: 'q1', question: 'Where did you hear about us?', options: ['LinkedIn', 'Google', 'YouTube', 'Twitter', 'Friend/Referral', 'Job Board', 'Other'] },
    { id: 'q2', question: 'Are you authorized to work in this country?', options: ['Yes', 'No', 'Need Sponsorship'] },
    { id: 'q3', question: 'What is your earliest start date?', options: ['Immediately', '2 weeks', '1 month', '2+ months'] },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!application) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </Pressable>
        </View>
        <Text style={styles.errorText}>Application not found</Text>
      </View>
    );
  }

  const job = application.job;
  const status = statusConfig[application.status] || statusConfig.applied;
  const LocationIcon = job.locationType === 'remote' ? Wifi : job.locationType === 'hybrid' ? Building2 : MapPin;
  const flowSteps = getFlowSteps(application.status, hasActionNeeded);

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
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isActionNeeded = step.status === 'action_needed';
            return (
              <View key={idx} style={styles.flowStep}>
                <View style={styles.flowIndicator}>
                  {isCompleted ? (
                    <CheckCircle2 size={20} color="#10B981" />
                  ) : isCurrent ? (
                    <View style={styles.flowDotCurrent} />
                  ) : isActionNeeded ? (
                    <XCircle size={20} color="#FF8F00" />
                  ) : (
                    <Circle size={20} color="rgba(255,255,255,0.2)" />
                  )}
                  {idx < flowSteps.length - 1 && (
                    <View style={[styles.flowLine, isCompleted && styles.flowLineCompleted]} />
                  )}
                </View>
                <View style={styles.flowContent}>
                  <View style={styles.flowLabelRow}>
                    <Text style={[styles.flowLabel, isCurrent && styles.flowLabelActive]}>{step.label}</Text>
                    {step.date ? <Text style={styles.flowDate}>{step.date}</Text> : null}
                  </View>
                  {step.description && isCurrent ? (
                    <Text style={styles.flowDesc}>{step.description}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {hasActionNeeded && (
          <Pressable style={styles.actionNeededCard} onPress={() => setShowAdditionalQuestions(true)}>
            <View style={styles.actionNeededIcon}>
              <AlertTriangle size={20} color="#E65100" />
            </View>
            <View style={styles.actionNeededContent}>
              <Text style={styles.actionNeededTitle}>Action Required</Text>
              <Text style={styles.actionNeededText}>The AI needs your input to complete this application</Text>
            </View>
            <ChevronRight size={18} color="#E65100" />
          </Pressable>
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

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Briefcase size={18} color={Colors.textPrimary} />
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{job.employmentType}</Text>
          </View>
          <View style={styles.infoCard}>
            <LocationIcon size={18} color={Colors.primary} />
            <Text style={styles.infoLabel}>Mode</Text>
            <Text style={styles.infoValue}>{job.locationType}</Text>
          </View>
          <View style={styles.infoCard}>
            <Clock size={18} color={Colors.warning} />
            <Text style={styles.infoLabel}>Applied</Text>
            <Text style={styles.infoValue}>{application.appliedDate}</Text>
          </View>
        </View>

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Users size={18} color={Colors.accent} />
            <Text style={styles.infoLabel}>Experience</Text>
            <Text style={styles.infoValue}>{job.experienceLevel}</Text>
          </View>
        </View>

        <View style={styles.salaryCard}>
          <Text style={styles.salaryLabel}>Salary Range</Text>
          <Text style={styles.salaryValue}>
            {formatSalary(job.salaryMin, job.salaryMax)}
            <Text style={styles.salaryPeriod}> /{job.salaryPeriod}</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About the Role</Text>
          <Text style={styles.descriptionText}>{job.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About {job.companyName}</Text>
          <Text style={styles.descriptionText}>{job.companyDescription}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Requirements</Text>
          {job.requirements.map((req, idx) => (
            <View key={idx} style={styles.reqRow}>
              <View style={styles.reqBullet} />
              <Text style={styles.reqText}>{req}</Text>
            </View>
          ))}
        </View>

        {job.culturePhotos && job.culturePhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.cultureHeader}>
              <Camera size={18} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>Work Culture</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {job.culturePhotos.map((photo, idx) => (
                <Image key={idx} source={{ uri: photo }} style={styles.culturePhoto} contentFit="cover" />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills Required</Text>
          <View style={styles.tagsWrap}>
            {job.skills.length > 0 ? (
              job.skills.map((skill, idx) => (
                <View key={idx} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{skill}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.descriptionText}>No specific skills listed</Text>
            )}
          </View>
        </View>

        {job.benefits && job.benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benefits</Text>
            <View style={styles.tagsWrap}>
              {job.benefits.map((benefit, idx) => (
                <View key={idx} style={styles.benefitTag}>
                  <Text style={styles.benefitTagText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showAdditionalQuestions} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Additional Questions</Text>
              <Pressable onPress={() => setShowAdditionalQuestions(false)} style={styles.modalCloseBtn}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtext}>The AI encountered these questions while filling out your application. Please provide your answers so it can continue.</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {additionalQuestions.map((q) => (
                <View key={q.id} style={styles.questionBlock}>
                  <View style={styles.questionHeader}>
                    <MessageCircle size={14} color="#1565C0" />
                    <Text style={styles.questionText}>{q.question}</Text>
                  </View>
                  <View style={styles.optionsWrap}>
                    {q.options.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[styles.optionChip, additionalAnswers[q.id] === opt && styles.optionChipSelected]}
                        onPress={() => setAdditionalAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      >
                        <Text style={[styles.optionChipText, additionalAnswers[q.id] === opt && styles.optionChipTextSelected]}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.saveCredBtn, Object.keys(additionalAnswers).length < additionalQuestions.length && { opacity: 0.5 }]}
              onPress={() => {
                if (Object.keys(additionalAnswers).length >= additionalQuestions.length) {
                  setShowAdditionalQuestions(false);
                  Alert.alert('Submitted', 'Your answers have been sent to the AI agent. It will now continue filling out your application.');
                } else {
                  Alert.alert('Incomplete', 'Please answer all questions before submitting.');
                }
              }}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveCredBtnText}>Submit Answers</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  errorText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  scrollContent: { paddingHorizontal: 16 },
  credentialsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#90CAF9' },
  credIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#BBDEFB', justifyContent: 'center', alignItems: 'center' },
  credContent: { flex: 1, marginLeft: 12 },
  credTitle: { fontSize: 14, fontWeight: '700' as const, color: '#1565C0' },
  credSubtext: { fontSize: 12, color: '#42A5F5', marginTop: 2 },
  companyCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 12 },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.borderLight, marginBottom: 12 },
  jobTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary, textAlign: 'center' },
  companyName: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' as const, marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontSize: 13, color: Colors.textTertiary },
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
  infoCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: '500' as const },
  infoValue: { fontSize: 13, fontWeight: '700' as const, color: Colors.secondary, textAlign: 'center' },
  salaryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  salaryLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' as const },
  salaryValue: { fontSize: 18, fontWeight: '800' as const, color: Colors.secondary },
  salaryPeriod: { fontSize: 13, fontWeight: '400' as const, color: Colors.textTertiary },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary, marginBottom: 10 },
  descriptionText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reqBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textPrimary, marginTop: 7, marginRight: 12 },
  reqText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  cultureHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  culturePhoto: { width: 200, height: 140, borderRadius: 14, marginRight: 10, backgroundColor: Colors.borderLight },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { backgroundColor: Colors.secondary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  skillTagText: { fontSize: 13, color: Colors.textInverse, fontWeight: '600' as const },
  benefitTag: { backgroundColor: Colors.accentSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  benefitTagText: { fontSize: 13, color: Colors.accent, fontWeight: '600' as const },
  actionNeededCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FFB74D' },
  actionNeededIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFE0B2', justifyContent: 'center', alignItems: 'center' },
  actionNeededContent: { flex: 1, marginLeft: 12 },
  actionNeededTitle: { fontSize: 14, fontWeight: '700' as const, color: '#E65100' },
  actionNeededText: { fontSize: 12, color: '#F57C00', marginTop: 2 },
  questionBlock: { marginBottom: 16 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  questionText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary, flex: 1 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight },
  optionChipSelected: { backgroundColor: '#111111', borderColor: '#111111' },
  optionChipText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  optionChipTextSelected: { color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  modalSubtext: { fontSize: 13, color: Colors.textTertiary, marginBottom: 16, lineHeight: 19 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight },
  passwordRow: { position: 'relative' as const },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute' as const, right: 14, top: 14 },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 },
  securityText: { fontSize: 12, color: Colors.textTertiary },
  saveCredBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  saveCredBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
});
