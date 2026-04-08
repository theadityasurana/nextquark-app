import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Linking } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, MapPin, Users, Briefcase, Building2, ExternalLink, ChevronRight, Clock, Globe } from '@/components/ProfileIcons';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { Job } from '@/types';
import { fetchJobsByCompany, fetchCompanyFromSupabase, fetchUserApplications } from '@/lib/jobs';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonCompanyProfile } from '@/components/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Overview', 'Jobs', 'Applications'] as const;
type TabType = typeof TABS[number];

const MOCK_COMPANY_DATA: Record<string, { size: string; industry: string; founded: string; headquarters: string; oneLiner: string }> = {
  'Stripe': { size: '8,000+ employees', industry: 'Financial Technology', founded: '2010', headquarters: 'San Francisco, CA', oneLiner: 'Financial infrastructure for the internet' },
  'Airbnb': { size: '6,000+ employees', industry: 'Travel & Hospitality', founded: '2008', headquarters: 'San Francisco, CA', oneLiner: 'Belong anywhere' },
  'Notion': { size: '800+ employees', industry: 'Productivity Software', founded: '2013', headquarters: 'New York, NY', oneLiner: 'The all-in-one workspace' },
  'Figma': { size: '1,200+ employees', industry: 'Design Tools', founded: '2012', headquarters: 'San Francisco, CA', oneLiner: 'Where teams design together' },
  'Linear': { size: '100+ employees', industry: 'Project Management', founded: '2019', headquarters: 'Remote-first', oneLiner: 'The issue tracking tool you\'ll enjoy using' },
  'Vercel': { size: '500+ employees', industry: 'Cloud Platform', founded: '2015', headquarters: 'San Francisco, CA', oneLiner: 'Develop. Preview. Ship.' },
};

function getCompanyMeta(name: string) {
  return MOCK_COMPANY_DATA[name] || { size: '500+ employees', industry: 'Technology', founded: '2015', headquarters: 'San Francisco, CA', oneLiner: 'Building the future of technology' };
}

function getCompanyLogoUrl(companyName: string, logo?: string): string {
  if (logo && logo.startsWith('http')) return logo;
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  return `https://logo.clearbit.com/${domain}`;
}

export default function CompanyProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { companyName } = useLocalSearchParams<{ companyName: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [visibleJobs, setVisibleJobs] = useState(10);
  const { supabaseUserId } = useAuth();

  const { data: supabaseCompanyJobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['company-jobs', companyName],
    queryFn: () => fetchJobsByCompany(companyName || ''),
    enabled: !!companyName,
  });

  const { data: supabaseCompany, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['company-profile', companyName],
    queryFn: () => fetchCompanyFromSupabase(companyName || ''),
    enabled: !!companyName,
  });

  const companyJobs = useMemo(() => {
    if (supabaseCompanyJobs && supabaseCompanyJobs.length > 0) return supabaseCompanyJobs;
    return [];
  }, [companyName, supabaseCompanyJobs]);

  const { data: userApplications = [] } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    queryFn: () => fetchUserApplications(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const companyApplications = useMemo(() => 
    userApplications.filter((a: any) => a.company_name?.toLowerCase() === companyName?.toLowerCase()),
    [userApplications, companyName]
  );

  const companyMeta = useMemo(() => {
    if (supabaseCompany) {
      return {
        size: supabaseCompany.size || '500+ employees',
        industry: supabaseCompany.industry || 'Technology',
        founded: supabaseCompany.founded || 'N/A',
        headquarters: supabaseCompany.headquarters || 'N/A',
        oneLiner: supabaseCompany.one_liner || supabaseCompany.description?.substring(0, 80) || 'Building the future of technology',
      };
    }
    return getCompanyMeta(companyName || '');
  }, [companyName, supabaseCompany]);

  const firstJob = companyJobs[0];
  const companyLogoUrl = supabaseCompany?.logo ? getCompanyLogoUrl(companyName || '', supabaseCompany.logo) : firstJob?.companyLogo;
  const companyDesc = supabaseCompany?.description || firstJob?.companyDescription;
  const companyCulturePhotos = supabaseCompany?.culture_photos || firstJob?.culturePhotos;
  const companyWebsiteUrl = supabaseCompany?.website || firstJob?.companyWebsite;

  const handleJobPress = useCallback((job: Job) => {
    router.push({ pathname: '/job-details' as any, params: { id: job.id } });
  }, [router]);

  const handleApplicationPress = useCallback((appId: string) => {
    router.push({ pathname: '/application-details' as any, params: { id: appId } });
  }, [router]);

  if (isLoadingJobs || isLoadingCompany) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F5F5F5' }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: Colors.textPrimary }]}>{companyName || 'Company'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <SkeletonCompanyProfile />
      </View>
    );
  }

  if (!companyName || (!firstJob && !supabaseCompany)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Company not found</Text>
        </View>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return Colors.statusApplied;
      case 'under_review': return Colors.statusReview;
      case 'interview_scheduled': return Colors.statusInterview;
      case 'offer': return Colors.statusOffer;
      case 'rejected': return Colors.statusRejected;
      default: return Colors.textTertiary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'applied': return 'Applied';
      case 'under_review': return 'Under Review';
      case 'interview_scheduled': return 'Interview Scheduled';
      case 'offer': return 'Offer Received';
      case 'rejected': return 'Not Selected';
      case 'withdrawn': return 'Withdrawn';
      default: return status;
    }
  };

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About {companyName}</Text>
        <Text style={styles.descriptionText}>{companyDesc || 'No description available.'}</Text>
      </View>

      {companyWebsiteUrl && (
        <Pressable
          style={styles.websiteBtn}
          onPress={() => Linking.openURL(companyWebsiteUrl).catch(() => console.log('Could not open website'))}
        >
          <Globe size={16} color={Colors.primary} />
          <Text style={styles.websiteBtnText}>Visit Website</Text>
          <ExternalLink size={14} color={Colors.textTertiary} />
        </Pressable>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Briefcase size={20} color={Colors.primary} />
          <Text style={styles.statValue}>{companyJobs.length}</Text>
          <Text style={styles.statLabel}>Open Jobs</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={20} color="#1565C0" />
          <Text style={styles.statValue}>{companyMeta.size.split(' ')[0]}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={styles.statCard}>
          <Building2 size={20} color="#E65100" />
          <Text style={styles.statValue}>{companyMeta.founded}</Text>
          <Text style={styles.statLabel}>Founded</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Industry</Text>
          <Text style={styles.infoValue}>{companyMeta.industry}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Headquarters</Text>
          <Text style={styles.infoValue}>{companyMeta.headquarters}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Company Size</Text>
          <Text style={styles.infoValue}>{companyMeta.size}</Text>
        </View>
      </View>

      {companyApplications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Recent Applications</Text>
          {companyApplications.map((app: any) => (
            <Pressable key={app.id} style={styles.miniAppCard} onPress={() => handleApplicationPress(app.id)}>
              <View style={styles.miniAppInfo}>
                <Text style={styles.miniAppTitle}>{app.job_title}</Text>
                <Text style={styles.miniAppDate}>Applied {new Date(app.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.miniStatusBadge, { backgroundColor: `${getStatusColor(app.status)}18` }]}>
                <Text style={[styles.miniStatusText, { color: getStatusColor(app.status) }]}>{getStatusLabel(app.status)}</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      {companyCulturePhotos && companyCulturePhotos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Culture</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {companyCulturePhotos.map((photo, idx) => (
              <Image key={idx} source={{ uri: photo }} style={styles.culturePhoto} contentFit="cover" />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderJobs = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <Text style={styles.jobsCount}>{companyJobs.length} open position{companyJobs.length !== 1 ? 's' : ''}</Text>
      {companyJobs.slice(0, visibleJobs).map((job) => (
        <Pressable key={job.id} style={styles.jobListCard} onPress={() => handleJobPress(job)}>
          <View style={styles.jobListHeader}>
            <Text style={styles.jobListTitle}>{job.jobTitle}</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </View>
          <View style={styles.jobListMeta}>
            <View style={styles.jobListChip}>
              <Briefcase size={12} color="#E65100" />
              <Text style={styles.jobListChipText}>{job.employmentType}</Text>
            </View>
            <View style={styles.jobListChip}>
              <Clock size={12} color="#1565C0" />
              <Text style={styles.jobListChipText}>{job.experienceLevel}</Text>
            </View>
          </View>
          <View style={styles.jobListBottom}>
            <View style={styles.jobListLocationRow}>
              <MapPin size={13} color={Colors.textTertiary} />
              <Text style={styles.jobListLocation}>{job.location}</Text>
              <View style={[styles.locTypeBadge, job.locationType === 'remote' && styles.remoteBadge]}>
                <Text style={[styles.locTypeText, job.locationType === 'remote' && styles.remoteText]}>{job.locationType}</Text>
              </View>
            </View>
            <Text style={styles.jobListSalary}>
              {job.salaryRangeRaw || `${(job.salaryMin / 1000).toFixed(0)}k - ${(job.salaryMax / 1000).toFixed(0)}k`}
            </Text>
          </View>
        </Pressable>
      ))}
      {visibleJobs < companyJobs.length && (
        <Pressable style={styles.showMoreBtn} onPress={() => setVisibleJobs(prev => prev + 10)}>
          <Text style={styles.showMoreText}>Show more jobs</Text>
        </Pressable>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderApplications = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {companyApplications.length === 0 ? (
        <View style={styles.emptyAppState}>
          <Briefcase size={40} color={Colors.textTertiary} />
          <Text style={styles.emptyAppTitle}>No applications yet</Text>
          <Text style={styles.emptyAppText}>Swipe right on a {companyName} job to apply</Text>
        </View>
      ) : (
        <>
          <Text style={styles.jobsCount}>{companyApplications.length} application{companyApplications.length !== 1 ? 's' : ''}</Text>
          {companyApplications.map((app: any) => (
            <Pressable key={app.id} style={styles.appListCard} onPress={() => handleApplicationPress(app.id)}>
              <View style={styles.appListHeader}>
                <Text style={styles.appListTitle}>{app.job_title}</Text>
                <View style={[styles.appStatusBadge, { backgroundColor: `${getStatusColor(app.status)}18` }]}>
                  <View style={[styles.appStatusDot, { backgroundColor: getStatusColor(app.status) }]} />
                  <Text style={[styles.appStatusText, { color: getStatusColor(app.status) }]}>{getStatusLabel(app.status)}</Text>
                </View>
              </View>
              <Text style={styles.appListActivity}>{app.status}</Text>
              <View style={styles.appListFooter}>
                <Text style={styles.appListDate}>Applied {new Date(app.created_at).toLocaleDateString()}</Text>
                <ChevronRight size={16} color={Colors.textTertiary} />
              </View>
            </Pressable>
          ))}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.heroSection}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{companyName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.companyHero}>
          <Image source={{ uri: companyLogoUrl || `https://logo.clearbit.com/${(companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '')}.com` }} style={styles.companyLogo} />
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.companyOneLiner}>{companyMeta.oneLiner}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {tab === 'Jobs' && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{companyJobs.length}</Text></View>}
            {tab === 'Applications' && companyApplications.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{companyApplications.length}</Text></View>}
          </Pressable>
        ))}
      </View>

      <View style={styles.tabBody}>
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Jobs' && renderJobs()}
        {activeTab === 'Applications' && renderApplications()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  heroSection: { paddingHorizontal: 16, paddingBottom: 20, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary, flex: 1, textAlign: 'center' },
  companyHero: { alignItems: 'center', paddingVertical: 12 },
  companyLogo: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.borderLight, marginBottom: 12, borderWidth: 2, borderColor: Colors.borderLight },
  companyName: { fontSize: 24, fontWeight: '900' as const, color: Colors.secondary, marginBottom: 4 },
  companyOneLiner: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#F0F0F0', borderRadius: 12, padding: 4, marginBottom: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#111111' },
  tabText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: { backgroundColor: Colors.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  tabBadgeText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  tabBody: { flex: 1 },
  tabContent: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.secondary, marginBottom: 12 },
  descriptionText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 23 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.borderLight },
  statValue: { fontSize: 18, fontWeight: '800' as const, color: Colors.secondary },
  statLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: '500' as const },
  infoSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: Colors.borderLight },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.secondary },
  divider: { height: 1, backgroundColor: Colors.borderLight },
  miniAppCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderLight },
  miniAppInfo: { flex: 1, marginRight: 10 },
  miniAppTitle: { fontSize: 14, fontWeight: '600' as const, color: Colors.secondary },
  miniAppDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  miniStatusText: { fontSize: 11, fontWeight: '600' as const },
  culturePhoto: { width: 200, height: 140, borderRadius: 14, marginRight: 10, backgroundColor: Colors.borderLight },
  jobsCount: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' as const, marginBottom: 16 },
  jobListCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  jobListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  jobListTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary, flex: 1, marginRight: 8 },
  jobListMeta: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  jobListChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  jobListChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  jobListBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobListLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobListLocation: { fontSize: 13, color: Colors.textTertiary },
  locTypeBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  remoteBadge: { backgroundColor: '#E8F5E9' },
  locTypeText: { fontSize: 10, fontWeight: '600' as const, color: Colors.textSecondary, textTransform: 'capitalize' as const },
  remoteText: { color: Colors.accent },
  jobListSalary: { fontSize: 14, fontWeight: '700' as const, color: Colors.secondary },
  showMoreBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surface, marginTop: 4 },
  showMoreText: { fontSize: 14, fontWeight: '600' as const, color: Colors.primary },
  emptyAppState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyAppTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.secondary },
  emptyAppText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  appListCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  appListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  appListTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.secondary, flex: 1, marginRight: 8 },
  appStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  appStatusDot: { width: 6, height: 6, borderRadius: 3 },
  appStatusText: { fontSize: 11, fontWeight: '600' as const },
  appListActivity: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  appListFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appListDate: { fontSize: 12, color: Colors.textTertiary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  websiteBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
