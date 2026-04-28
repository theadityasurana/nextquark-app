import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Platform, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { SkeletonAppCard } from '@/components/Skeleton';

const PENDING_HOLD_MS = 120_000; // 120 seconds — ignore Supabase status for this long

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
  const router = useRouter();
  useScrollToTop(flatListRef as any);

  // Tick every 15s so time-based pending hold re-evaluates without needing a refetch
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [])
  );

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      if (!supabaseUserId) return [];
      await Promise.all([
        scanEmailsForOtp(supabaseUserId),
        scanEmailsForInterviews(supabaseUserId),
      ]);
      const apps = await fetchUserApplications(supabaseUserId);
      // Only run updateApplicationProgress for apps PAST the 120s hold window
      const now = Date.now();
      await Promise.all(
        apps
          .filter((a: any) => {
            const appliedAt = a.applied_at || a.created_at;
            const elapsed = now - new Date(appliedAt).getTime();
            return elapsed >= PENDING_HOLD_MS && (a.status === 'pending' || a.status === 'failed');
          })
          .map((a: any) => updateApplicationProgress(a.id))
      );
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
    const now = Date.now();
    return applications.map((app: DbApplicationRow) => {
      const companyLogo = getCompanyLogoUrl(app.company_name || '', app.company_logo || undefined, app.company_logo_url || undefined);
      const rawStatus = (app.status || 'pending') as ApplicationStatus;
      const appliedAt = (app as any).applied_at || app.created_at;
      const elapsed = now - new Date(appliedAt).getTime();
      // Within 120s: ALWAYS pending, ignore Supabase completely
      // After 120s: use Supabase status, but if still 'pending' treat as 'completed'
      const dbStatus: ApplicationStatus = elapsed < PENDING_HOLD_MS
        ? 'pending'
        : (rawStatus === 'pending' ? 'completed' : rawStatus);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, tick]);

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

  const dailyStreak = useMemo(() => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const hasApp = mappedApplications.some(a => {
        const d = new Date(a.appliedDate).getTime();
        return d >= dayStart.getTime() && d < dayEnd.getTime();
      });
      if (hasApp) streak++;
      else break;
    }
    return streak;
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
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        {/* Fixed header */}
        <View style={styles.fixedHeader}>
          <Text style={[styles.headerTitle, { color: colors.secondary }]}>Applications</Text>
          <Pressable
            style={[styles.logsBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
            onPress={() => router.push('/application-logs' as any)}
          >
            <Ionicons name="code-slash-outline" size={20} color={colors.secondary} />
          </Pressable>
        </View>

        {/* Auto-apply queue indicator */}
        {stats.pending > 0 && (
          <QueueIndicator count={stats.pending} colors={colors} />
        )}

        {isLoading ? (
          <View style={{ paddingHorizontal: 16, flex: 1 }}>
            {[1,2,3,4,5].map(i => <SkeletonAppCard key={i} />)}
          </View>
        ) : (
          <>
            {/* Fixed stat boxes */}
            <View style={styles.fixedContent}>
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

              <View style={[styles.chartContainer, { backgroundColor: colors.surface, marginBottom: 8 }]}>
                <View style={styles.chartHeader}>
                  <View>
                    <Text style={[styles.chartTitle, { color: colors.secondary }]}>Application Streak</Text>
                    <Text style={[styles.chartSubtitle, { color: colors.textTertiary }]}>Last 30 days</Text>
                  </View>
                  {dailyStreak > 0 && (
                    <View style={styles.streakBadge}>
                      <Text style={styles.streakFlame}>🔥</Text>
                      <Text style={styles.streakCount}>{dailyStreak}</Text>
                      <Text style={styles.streakLabel}>day{dailyStreak > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                </View>
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
            </View>

            {/* Scrollable application list */}
            <FlatList
              ref={flatListRef}
              data={filteredApplications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: colors.secondary }]}>No applications</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery ? 'No results found' : `No ${selectedFilter} applications found`}
                  </Text>
                </View>
              }
            />

            <Pressable
              style={[styles.searchFab, { backgroundColor: isDark ? '#FFFFFF' : '#111111' }]}
              onPress={() => { setSearchVisible((v) => !v); if (searchVisible) setSearchQuery(''); }}
            >
              {searchVisible ? <X size={22} color={isDark ? '#111111' : '#FFFFFF'} /> : <Search size={22} color={isDark ? '#111111' : '#FFFFFF'} />}
            </Pressable>
          </>
        )}
      </View>
    </TabTransitionWrapper>
  );
}

function QueueIndicator({ count, colors }: { count: number; colors: any }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={queueStyles.container}>
      <View style={queueStyles.inner}>
        <Animated.View style={[queueStyles.dot, { opacity: pulseAnim }]} />
        <Text style={queueStyles.text}>
          {count} application{count > 1 ? 's' : ''} in queue
        </Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
      </View>
    </View>
  );
}

const queueStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

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
      <Polyline points={points.join(' ')} fill="none" stroke="#EF4444" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => {
        if (v === 0) return null;
        const x = PX + (i / (data.length - 1)) * (W - PX * 2);
        const y = PY + (1 - v / max) * (H - PY * 2);
        return <Circle key={i} cx={x} cy={y} r={2.5} fill="#EF4444" />;
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    fontFamily: 'Lora_700Bold',
  },
  logsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedContent: {
    paddingHorizontal: 16,
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
    overflow: 'hidden',
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
    marginTop: 4,
    marginBottom: 4,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
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
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 11,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  streakFlame: {
    fontSize: 14,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
});
