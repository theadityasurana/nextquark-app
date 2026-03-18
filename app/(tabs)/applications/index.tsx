import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, FileCheck, Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import ApplicationItem from '@/components/ApplicationItem';
import { Application } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserApplications, scanEmailsForOtp, scanEmailsForInterviews } from '@/lib/jobs';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { Image } from 'expo-image';
import { useCompletedApps } from '@/hooks/useCompletedApps';

export default function ApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { supabaseUserId } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'cooking' | 'locked_in' | 'interviewing' | 'offer'>('all');

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    queryFn: async () => {
      if (!supabaseUserId) return [];
      // Scan emails for OTPs and interview invites before fetching applications
      await Promise.all([
        scanEmailsForOtp(supabaseUserId),
        scanEmailsForInterviews(supabaseUserId),
      ]);
      return fetchUserApplications(supabaseUserId);
    },
    enabled: !!supabaseUserId,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const appIds = useMemo(() => applications.map((a: any) => a.id), [applications]);
  const completedApps = useCompletedApps(appIds);

  const mappedApplications: Application[] = useMemo(() => {
    return applications.map((app: any) => {
      const getCompanyLogoUrl = (companyName: string, logo?: string, logoUrl?: string): string => {
        const SUPABASE_URL = 'https://widujxpahzlpegzjjpqp.supabase.co';
        if (logoUrl && logoUrl.startsWith('http')) return logoUrl;
        if (logo && logo.startsWith('http')) return logo;
        if (logoUrl) return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logoUrl}`;
        if (logo) return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logo}`;
        const logoPath = `logos/${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
        return `${SUPABASE_URL}/storage/v1/object/public/company-logos/${logoPath}`;
      };

      const companyLogo = getCompanyLogoUrl(app.company_name || '', app.company_logo, app.company_logo_url);

      // If local step progress reached the end, override status to 'completed'
      const dbStatus = app.status || 'applied';
      const effectiveStatus = completedApps.has(app.id) && (dbStatus === 'pending' || dbStatus === 'failed' || dbStatus === 'applied') ? 'completed' : dbStatus;

      return {
        id: app.id,
        appliedDate: app.created_at,
        status: effectiveStatus,
        lastActivity: app.updated_at || app.created_at,
        interviewDate: app.interview_date || null,
        interviewTime: app.interview_time || null,
        meetingLink: app.meeting_link || null,
        meetingPlatform: app.meeting_platform || null,
        verificationOtp: app.verification_otp || null,
        otpReceivedAt: app.otp_received_at || null,
        job: {
          id: app.job_id,
          jobTitle: app.job_title,
          companyName: app.company_name,
          companyLogo,
          location: app.location || '',
          salary: app.salary_min && app.salary_max ? `${app.salary_currency || '$'}${app.salary_min / 1000}k-${app.salary_max / 1000}k` : '',
        } as any,
      } as Application;
    });
  }, [applications, completedApps]);

  const stats = useMemo(() => {
    const total = mappedApplications.length;
    const cooking = mappedApplications.filter((a) => a.status === 'pending' || a.status === 'failed' as any).length;
    const lockedIn = mappedApplications.filter((a) => a.status === 'applied' || a.status === 'completed' as any || a.status === 'submitted' as any).length;
    const interviewing = mappedApplications.filter((a) => a.status === 'interviewing' || a.status === 'interview_scheduled').length;
    const offers = mappedApplications.filter((a) => a.status === 'offer').length;
    return { total, cooking, lockedIn, interviewing, offers };
  }, [mappedApplications]);

  const filteredApplications = useMemo(() => {
    if (selectedFilter === 'all') return mappedApplications;
    if (selectedFilter === 'cooking') return mappedApplications.filter((a) => a.status === 'pending' || a.status === 'failed' as any);
    if (selectedFilter === 'locked_in') return mappedApplications.filter((a) => a.status === 'applied' || a.status === 'completed' as any || a.status === 'submitted' as any);
    if (selectedFilter === 'interviewing') return mappedApplications.filter((a) => a.status === 'interviewing' || a.status === 'interview_scheduled');
    if (selectedFilter === 'offer') return mappedApplications.filter((a) => a.status === 'offer');
    return mappedApplications;
  }, [mappedApplications, selectedFilter]);

  const renderItem = ({ item }: { item: Application }) => (
    <ApplicationItem application={item} />
  );

  if (isLoading) {
    return (
      <TabTransitionWrapper routeName="applications">
        <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </TabTransitionWrapper>
    );
  }

  return (
    <TabTransitionWrapper routeName="applications">
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.brandHeader}>
        <Image source={require('@/assets/images/header.png')} style={styles.brandLogo} resizeMode="contain" />
      </View>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.secondary }]}>Applications</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>{mappedApplications.length} total</Text>
      </View>

      <View style={styles.statsRow}>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'all' && styles.statCardActive]} 
          onPress={() => setSelectedFilter('all')}
        >
          <TrendingUp size={18} color={colors.textPrimary} />
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>All</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'cooking' && styles.statCardActive]} 
          onPress={() => setSelectedFilter('cooking')}
        >
          <Clock size={18} color={colors.warning} />
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.cooking}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cooking</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'locked_in' && styles.statCardActive]} 
          onPress={() => setSelectedFilter('locked_in')}
        >
          <FileCheck size={18} color={colors.accent} />
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.lockedIn}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Locked In</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'interviewing' && styles.statCardActive]} 
          onPress={() => setSelectedFilter('interviewing')}
        >
          <FileCheck size={18} color={colors.statusInterview} />
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.interviewing}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Interviews</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredApplications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={filteredApplications.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.secondary }]}>No applications</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedFilter === 'all' 
                ? 'Start swiping on jobs to see your applications here'
                : `No ${selectedFilter} applications found`
              }
            </Text>
          </View>
        }
      />
    </View>
    </TabTransitionWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  brandLogo: {
    height: 32,
    width: 240,
  },
  brandName: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: "#000",
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: "#000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#000",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statCardActive: {
    borderColor: '#22c55e',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statLabel: {
    fontSize: 11,
    color: "#000",
    fontWeight: '500' as const,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: "#000",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#000",
    textAlign: 'center',
  },
});
