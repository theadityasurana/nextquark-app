import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Animated, Image as RNImage, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, MapPin, Bookmark, Wifi, Building2, Check, Trash2 } from '@/components/ProfileIcons';
import { useQuery } from '@tanstack/react-query';
import { Job } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { mapSupabaseJobToJob } from '@/lib/jobs';
import { SkeletonJobCard } from '@/components/Skeleton';
import * as Haptics from 'expo-haptics';

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'match', label: 'Best Match' },
  { key: 'salary', label: 'Salary' },
] as const;
type SortKey = typeof SORT_OPTIONS[number]['key'];

export default function SavedJobsScreen() {
  const dk = {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceElevated: '#2A2A2A',
    border: '#333333',
    borderLight: '#2A2A2A',
    secondary: '#FFFFFF',
    accent: '#00E676',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
    textInverse: '#111111',
  };
  const colors = dk as any;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supabaseUserId, swipedJobIds } = useAuth();
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const haptic = () => { if (Platform.OS !== 'web') Haptics.selectionAsync(); };

  const { data: savedJobs = [], isLoading, refetch } = useQuery({
    queryKey: ['saved-jobs', supabaseUserId],
    queryFn: async () => {
      if (!supabaseUserId) return [];
      const { data, error } = await supabase.from('saved_jobs').select('job_id').eq('user_id', supabaseUserId);
      if (error || !data) return [];
      const jobIds = data.map(d => d.job_id);
      if (jobIds.length === 0) return [];
      const { data: jobs } = await supabase.from('jobs').select('*').in('id', jobIds);
      return jobs ? jobs.map(mapSupabaseJobToJob) : [];
    },
    enabled: !!supabaseUserId,
  });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const sortedJobs = [...savedJobs].sort((a, b) => {
    if (sortBy === 'match') return (b.matchScore || 0) - (a.matchScore || 0);
    if (sortBy === 'salary') return b.salaryMax - a.salaryMax;
    return 0;
  });

  const handleRemove = async (jobId: string) => {
    if (!supabaseUserId) return;
    swipeableRefs.current[jobId]?.close();
    await supabase.from('saved_jobs').delete().eq('user_id', supabaseUserId).eq('job_id', jobId);
    refetch();
  };

  const formatSalary = (min: number, max: number) => {
    const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`);
    return `${fmt(min)} - ${fmt(max)}`;
  };

  const renderRightActions = (jobId: string) => (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[st.swipeAction, { transform: [{ translateX }] }]}>
        <Pressable style={st.swipeDeleteBtn} onPress={() => handleRemove(jobId)}>
          <Trash2 size={20} color="#FFF" />
          <Text style={st.swipeDeleteText}>Remove</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderItem = ({ item }: { item: Job }) => {
    const LocationIcon = item.locationType === 'remote' ? Wifi : item.locationType === 'hybrid' ? Building2 : MapPin;
    const isApplied = swipedJobIds.includes(item.id);
    return (
      <Swipeable
        ref={ref => { swipeableRefs.current[item.id] = ref; }}
        renderRightActions={renderRightActions(item.id)}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          style={({ pressed }) => [st.jobCard, { backgroundColor: colors.surface }, pressed && st.jobCardPressed]}
          onPress={() => router.push({ pathname: '/job-details' as any, params: { id: item.id } })}
        >
          <View style={st.jobCardTop}>
            <Image source={{ uri: item.companyLogo }} style={st.logo} />
            <View style={st.jobInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[st.jobTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.jobTitle}</Text>
                {isApplied && (
                  <View style={st.appliedBadge}>
                    <Check size={10} color="#FFF" />
                    <Text style={st.appliedBadgeText}>Applied</Text>
                  </View>
                )}
              </View>
              <Text style={[st.companyName, { color: colors.textSecondary }]}>{item.companyName}</Text>
              <View style={st.locationRow}>
                <LocationIcon size={12} color={colors.textTertiary} />
                <Text style={[st.locationText, { color: colors.textTertiary }]}>{item.location}</Text>
              </View>
            </View>
          </View>
          <View style={st.jobCardBottom}>
            <Text style={[st.salary, { color: colors.textPrimary }]}>{formatSalary(item.salaryMin, item.salaryMax)}/{item.salaryPeriod}</Text>
            <View style={[st.typeBadge, { backgroundColor: colors.surfaceElevated }]}><Text style={[st.typeBadgeText, { color: colors.textSecondary }]}>{item.employmentType}</Text></View>
            <View style={[st.matchBadge, { backgroundColor: colors.surfaceElevated }]}><Text style={[st.matchBadgeText, { color: colors.textPrimary }]}>{item.matchScore}% match</Text></View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', '#121212']} style={st.heroGradient}>
        <View style={st.header}>
          <Pressable style={st.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={st.headerTitle}>Saved Jobs</Text>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=200&fit=crop' }} style={st.heroBanner} />
        <Text style={[st.heroSubtext, { color: colors.textSecondary }]}>Jobs you've bookmarked for later — apply when you're ready</Text>
      </LinearGradient>

      {!isLoading && savedJobs.length > 0 && (
        <View style={st.sortBar}>
          {SORT_OPTIONS.map(opt => (
            <Pressable key={opt.key} style={[st.sortPill, { backgroundColor: sortBy === opt.key ? colors.secondary : colors.surface, borderColor: sortBy === opt.key ? colors.secondary : colors.border }]} onPress={() => { haptic(); setSortBy(opt.key); }}>
              <Text style={[st.sortPillText, { color: sortBy === opt.key ? colors.textInverse : colors.textSecondary }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={st.listContent}>
          {[1,2,3,4].map(i => <SkeletonJobCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={sortedJobs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={savedJobs.length === 0 ? st.emptyContainerFill : st.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textTertiary} />}
          ListEmptyComponent={
            <View style={st.emptyState}>
              <View style={st.emptyIcon}><Bookmark size={36} color={colors.textTertiary} /></View>
              <Text style={[st.emptyTitle, { color: colors.textPrimary }]}>No Saved Jobs</Text>
              <Text style={[st.emptyText, { color: colors.textSecondary }]}>Swipe up on jobs in Discover to save them for later.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, paddingTop: 0 },
  heroGradient: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 8 },
  heroSubtext: { fontSize: 13, textAlign: 'center', marginTop: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF' },
  sortBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  sortPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  sortPillActive: { backgroundColor: '#111', borderColor: '#111' },
  sortPillText: { fontSize: 12, fontWeight: '600' as const, color: '#666' },
  sortPillTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  jobCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  jobCardPressed: { opacity: 0.9 },
  jobCardTop: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF' },
  jobInfo: { flex: 1, marginLeft: 14 },
  jobTitle: { fontSize: 15, fontWeight: '700' as const, flexShrink: 1 },
  companyName: { fontSize: 13, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  locationText: { fontSize: 12 },
  appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  appliedBadgeText: { fontSize: 9, fontWeight: '700' as const, color: '#FFF' },
  jobCardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  salary: { fontSize: 14, fontWeight: '700' as const },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' as const },
  matchBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  matchBadgeText: { fontSize: 11, fontWeight: '700' as const },
  swipeAction: { width: 80, marginBottom: 12 },
  swipeDeleteBtn: { flex: 1, backgroundColor: '#EF4444', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 8, gap: 4 },
  swipeDeleteText: { fontSize: 11, fontWeight: '700' as const, color: '#FFF' },
  emptyContainerFill: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
