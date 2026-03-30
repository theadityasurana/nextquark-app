import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, FileCheck, Clock } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import ApplicationItem from '@/components/ApplicationItem';
import { Application, ApplicationStatus, DbApplicationRow } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { fetchUserApplications, scanEmailsForOtp, scanEmailsForInterviews, getCompanyLogoUrl, updateApplicationProgress } from '@/lib/jobs';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { Image } from 'expo-image';
import { AnimatedHeaderScrollView } from '@/components/AnimatedHeader';

export default function ApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { supabaseUserId } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'cooking' | 'locked_in' | 'interviewing' | 'offer'>('all');
  const flatListRef = useRef<FlatList>(null);
  useScrollToTop(flatListRef);

  useFocusEffect(
    useCallback(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      queryClient.invalidateQueries({ queryKey: ['user-applications', supabaseUserId] });
    }, [supabaseUserId, queryClient])
  );

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    queryFn: async () => {
      if (!supabaseUserId) return [];
      await Promise.all([
        scanEmailsForOtp(supabaseUserId),
        scanEmailsForInterviews(supabaseUserId),
      ]);
      const apps = await fetchUserApplications(supabaseUserId);
      // Update progress for all pending/failed apps so DB status is current
      await Promise.all(
        apps
          .filter((a: any) => a.status === 'pending' || a.status === 'failed')
          .map((a: any) => updateApplicationProgress(a.id))
      );
      // Re-fetch to get updated statuses
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

  const mappedApplications: Application[] = useMemo(() => {
    return applications.map((app: DbApplicationRow) => {
      const companyLogo = getCompanyLogoUrl(app.company_name || '', app.company_logo || undefined, app.company_logo_url || undefined);

      const dbStatus = (app.status || 'pending') as ApplicationStatus;

      return {
        id: app.id,
        appliedDate: app.created_at,
        status: dbStatus,
        lastActivity: app.updated_at || app.created_at,
        interviewDate: app.interview_date || null,
        interviewTime: app.interview_time || null,
        meetingLink: app.meeting_link || null,
        meetingPlatform: app.meeting_platform as Application['meetingPlatform'],
        verificationOtp: app.verification_otp || null,
        otpReceivedAt: app.otp_received_at || null,
        job: {
          id: app.job_id,
          jobTitle: app.job_title,
          companyName: app.company_name,
          companyLogo,
          location: app.location || '',
        } as Application['job'],
      } as Application;
    });
  }, [applications]);

  const stats = useMemo(() => {
    const total = mappedApplications.length;
    const cooking = mappedApplications.filter((a) => a.status === 'pending' || a.status === 'failed').length;
    const lockedIn = mappedApplications.filter((a) => a.status === 'applied' || a.status === 'completed' || a.status === 'submitted').length;
    const interviewing = mappedApplications.filter((a) => a.status === 'interviewing' || a.status === 'interview_scheduled').length;
    const offers = mappedApplications.filter((a) => a.status === 'offer').length;
    return { total, cooking, lockedIn, interviewing, offers };
  }, [mappedApplications]);

  const filteredApplications = useMemo(() => {
    if (selectedFilter === 'all') return mappedApplications;
    if (selectedFilter === 'cooking') return mappedApplications.filter((a) => a.status === 'pending' || a.status === 'failed');
    if (selectedFilter === 'locked_in') return mappedApplications.filter((a) => a.status === 'applied' || a.status === 'completed' || a.status === 'submitted');
    if (selectedFilter === 'interviewing') return mappedApplications.filter((a) => a.status === 'interviewing' || a.status === 'interview_scheduled');
    if (selectedFilter === 'offer') return mappedApplications.filter((a) => a.status === 'offer');
    return mappedApplications;
  }, [mappedApplications, selectedFilter]);

  const renderItem = ({ item }: { item: Application }) => (
    <ApplicationItem application={item} />
  );

  return (
    <TabTransitionWrapper routeName="applications">
      {isLoading ? (
        <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <AnimatedHeaderScrollView
          largeTitle="Applications"
          subtitle={`${mappedApplications.length} total`}
          backgroundColor={colors.background}
          largeTitleColor={colors.secondary}
          subtitleColor={colors.textTertiary}
          largeHeaderTitleStyle={{ fontSize: 34, fontWeight: '800' }}
        >
          <View style={styles.statsRow}>
            <Pressable 
              style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'all' && styles.statCardActive]} 
              onPress={() => setSelectedFilter('all')}
            >
              <TrendingUp size={18} color={colors.textPrimary} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>All</Text>
            </Pressable>
            <Pressable 
              style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'cooking' && styles.statCardActive]} 
              onPress={() => setSelectedFilter('cooking')}
            >
              <Clock size={18} color={colors.warning} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.cooking}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Cooking</Text>
            </Pressable>
            <Pressable 
              style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'locked_in' && styles.statCardActive]} 
              onPress={() => setSelectedFilter('locked_in')}
            >
              <FileCheck size={18} color={colors.accent} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.lockedIn}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Locked In</Text>
            </Pressable>
            <Pressable 
              style={[styles.statCard, { backgroundColor: colors.surface }, selectedFilter === 'interviewing' && styles.statCardActive]} 
              onPress={() => setSelectedFilter('interviewing')}
            >
              <FileCheck size={18} color={colors.statusInterview} />
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats.interviewing}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Interviews</Text>
            </Pressable>
          </View>

          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>No applications</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {selectedFilter === 'all' 
                  ? 'Start swiping on jobs to see your applications here'
                  : `No ${selectedFilter} applications found`
                }
              </Text>
            </View>
          ) : (
            filteredApplications.map((item) => (
              <ApplicationItem key={item.id} application={item} />
            ))
          )}
        </AnimatedHeaderScrollView>
      )}
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
    textAlign: 'center' as const,
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
