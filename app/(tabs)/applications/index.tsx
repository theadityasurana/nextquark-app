import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator, RefreshControl, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, ChevronRight } from '@/components/ProfileIcons';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import Colors, { darkColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import ApplicationItem from '@/components/ApplicationItem';
import { Application, ApplicationStatus, DbApplicationRow } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { fetchUserApplications, scanEmailsForOtp, scanEmailsForInterviews, getCompanyLogoUrl, updateApplicationProgress } from '@/lib/jobs';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { Image } from 'expo-image';
import { AnimatedHeaderScrollView, AnimatedHeaderScrollViewRef } from '@/components/AnimatedHeader';
import { SkeletonAppCard } from '@/components/Skeleton';

export default function ApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = colors.background === darkColors.background;
  const queryClient = useQueryClient();
  const { supabaseUserId } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'pending' | 'done'>('done');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const animatedScrollRef = useRef<AnimatedHeaderScrollViewRef>(null);
  const scrollToTopRef = useRef({ scrollToOffset: () => { animatedScrollRef.current?.scrollToTop(); } });
  const router = useRouter();
  useScrollToTop(scrollToTopRef as any);

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
    const pending = mappedApplications.filter((a) => a.status === 'pending' || a.status === 'failed').length;
    const done = mappedApplications.filter((a) => a.status === 'applied' || a.status === 'completed' || a.status === 'submitted').length;
    return { pending, done };
  }, [mappedApplications]);

  const attentionCount = useMemo(() => {
    return mappedApplications.filter((a) => a.verificationOtp).length;
  }, [mappedApplications]);

  const streakData = useMemo(() => {
    const days = 30;
    const now = new Date();
    const counts: number[] = new Array(days).fill(0);
    mappedApplications.forEach((a) => {
      const d = new Date(a.appliedDate);
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) counts[days - 1 - diff]++;
    });
    return counts;
  }, [mappedApplications]);

  const filteredApplications = useMemo(() => {
    let apps = mappedApplications;
    if (selectedFilter === 'pending') apps = apps.filter((a) => a.status === 'pending' || a.status === 'failed');
    else if (selectedFilter === 'done') apps = apps.filter((a) => a.status === 'applied' || a.status === 'completed' || a.status === 'submitted');
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      apps = apps.filter((a) => a.job.jobTitle.toLowerCase().includes(q) || a.job.companyName.toLowerCase().includes(q));
    }
    return apps;
  }, [mappedApplications, selectedFilter, searchQuery]);

  const renderItem = ({ item }: { item: Application }) => (
    <ApplicationItem application={item} />
  );

  return (
    <TabTransitionWrapper routeName="applications">
      {isLoading ? (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: colors.secondary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>Applications</Text>
          <View style={{ paddingHorizontal: 16 }}>
            {[1,2,3,4,5].map(i => <SkeletonAppCard key={i} />)}
          </View>
        </View>
      ) : (
        <>
        <AnimatedHeaderScrollView
          scrollRef={animatedScrollRef}
          largeTitle="Applications"
          backgroundColor={colors.background}
          largeTitleColor={colors.secondary}
          largeHeaderTitleStyle={{ fontSize: 34, fontWeight: '800' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
        >
          {searchVisible && (
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
              <Search size={16} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search applications..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <Pressable onPress={() => { setSearchQuery(''); setSearchVisible(false); }}>
                <X size={16} color={colors.textTertiary} />
              </Pressable>
            </View>
          )}

          <View style={styles.statBoxRow}>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}> 
              <Text style={[styles.statBoxNumber, { color: colors.secondary }]}>{mappedApplications.length}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.textTertiary }]}>Total Applied</Text>
            </View>
            <Pressable
              style={[styles.statBox, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/applications/attention-details' as any)}
            >
              <View style={styles.attentionRow}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[styles.statBoxNumber, { color: attentionCount > 0 ? '#F59E0B' : colors.secondary }]}>{attentionCount}</Text>
                  <Text style={[styles.statBoxLabel, { color: colors.textTertiary }]}>{attentionCount === 0 ? '0 apps need your attention' : `${attentionCount} app${attentionCount > 1 ? 's' : ''} need your attention`}</Text>
                </View>
                <ChevronRight size={16} color={colors.textTertiary} />
              </View>
            </Pressable>
          </View>

          {/* Application Streak Chart */}
          <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.secondary }]}>Application Streak</Text>
            <Text style={[styles.chartSubtitle, { color: colors.textTertiary }]}>Last 30 days</Text>
            <ApplicationStreakChart data={streakData} colors={colors} />
          </View>

          <View style={styles.statsRow}>
            <Pressable 
              style={[styles.statCard, { backgroundColor: selectedFilter === 'pending' ? colors.warning : colors.surface }]} 
              onPress={() => setSelectedFilter('pending')}
            >
              <Text style={[styles.statLabel, { color: selectedFilter === 'pending' ? '#fff' : colors.textPrimary }]}>Pending ({stats.pending})</Text>
            </Pressable>
            <Pressable 
              style={[styles.statCard, { backgroundColor: selectedFilter === 'done' ? colors.accent : colors.surface }]} 
              onPress={() => setSelectedFilter('done')}
            >
              <Text style={[styles.statLabel, { color: selectedFilter === 'done' ? '#fff' : colors.textPrimary }]}>Done ({stats.done})</Text>
            </Pressable>
          </View>

          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>No applications</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No results found' : `No ${selectedFilter} applications found`}
              </Text>
            </View>
          ) : (
            filteredApplications.map((item) => (
              <ApplicationItem key={item.id} application={item} />
            ))
          )}
        </AnimatedHeaderScrollView>
        <Pressable
          style={[styles.searchFab, { backgroundColor: isDark ? '#FFFFFF' : '#111111' }]}
          onPress={() => { setSearchVisible((v) => !v); if (searchVisible) setSearchQuery(''); }}
        >
          {searchVisible ? <X size={22} color={isDark ? '#111111' : '#FFFFFF'} /> : <Search size={22} color={isDark ? '#111111' : '#FFFFFF'} />}
        </Pressable>
        </>
      )}
    </TabTransitionWrapper>
  );
}

function ApplicationStreakChart({ data, colors }: { data: number[]; colors: any }) {
  const W = 300, H = 100, PX = 28, PY = 16;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = PX + (i / (data.length - 1)) * (W - PX * 2);
    const y = PY + (1 - v / max) * (H - PY * 2);
    return `${x},${y}`;
  });
  const yLabels = [0, Math.ceil(max / 2), max];

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {yLabels.map((label, i) => {
        const y = PY + (1 - label / max) * (H - PY * 2);
        return (
          <React.Fragment key={i}>
            <Line x1={PX} y1={y} x2={W - PX} y2={y} stroke={colors.borderLight} strokeWidth={0.5} />
            <SvgText x={4} y={y + 3} fontSize={9} fill={colors.textTertiary}>{label}</SvgText>
          </React.Fragment>
        );
      })}
      <Polyline points={points.join(' ')} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => {
        if (v === 0) return null;
        const x = PX + (i / (data.length - 1)) * (W - PX * 2);
        const y = PY + (1 - v / max) * (H - PY * 2);
        return <Circle key={i} cx={x} cy={y} r={2.5} fill={colors.accent} />;
      })}
    </Svg>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  statBoxRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statBoxNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  chartContainer: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 11,
    marginBottom: 8,
  },
});
