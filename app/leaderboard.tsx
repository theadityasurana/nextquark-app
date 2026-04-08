import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image as RNImage, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { X, Trophy, Crown, TrendingUp } from '@/components/ProfileIcons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, getProfilePictureUrl } from '@/lib/supabase';
import Colors from '@/constants/colors';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonLeaderboardRow } from '@/components/Skeleton';
import * as Haptics from 'expo-haptics';

export default function LeaderboardScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supabaseUserId } = useAuth();

  const { data: leaderboardData = [], isLoading, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, subscription_type, swiped_job_ids');
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }
      
      const usersWithCounts = (data || []).map(user => ({
        ...user,
        swipeCount: user.swiped_job_ids?.length || 0
      }));
      
      return usersWithCounts.sort((a, b) => b.swipeCount - a.swipeCount);
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);
  const haptic = () => { if (Platform.OS !== 'web') Haptics.selectionAsync(); };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', colors.background]} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <X size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Trophy size={24} color="#FFD700" />
            <Text style={styles.headerTitle}>Leaderboard</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=200&fit=crop' }} style={styles.heroBanner} />
        <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>See how you rank against other job seekers</Text>
      </LinearGradient>

      {!isLoading && leaderboardData.length > 0 && (() => {
        const myIdx = leaderboardData.findIndex((u: any) => u.id === supabaseUserId);
        if (myIdx === -1) return null;
        const me = leaderboardData[myIdx] as any;
        return (
          <View style={[styles.yourRankCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.yourRankLeft}>
              <Text style={[styles.yourRankLabel, { color: colors.textTertiary }]}>Your Rank</Text>
              <Text style={[styles.yourRankNum, { color: colors.textPrimary }]}>#{myIdx + 1}</Text>
            </View>
            <View style={styles.yourRankCenter}>
              <Text style={[styles.yourRankLabel, { color: colors.textTertiary }]}>Swipes</Text>
              <Text style={[styles.yourRankNum, { color: colors.textPrimary }]}>{me.swipeCount}</Text>
            </View>
            <View style={styles.yourRankRight}>
              <TrendingUp size={16} color="#10B981" />
              <Text style={styles.yourRankTrend}>Top {Math.max(1, Math.round(((myIdx + 1) / leaderboardData.length) * 100))}%</Text>
            </View>
          </View>
        );
      })()}

      {isLoading ? (
        <View style={styles.scrollContent}>
          {[1,2,3,4,5,6].map(i => <SkeletonLeaderboardRow key={i} />)}
        </View>
      ) : leaderboardData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textTertiary} />}>
          {leaderboardData.map((user: any, index: number) => {
            let avatarUrl;
            const defaultUnsplash = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d';
            if (user.avatar_url && !user.avatar_url.includes(defaultUnsplash)) {
              avatarUrl = user.avatar_url.startsWith('http')
                ? user.avatar_url
                : getProfilePictureUrl(user.avatar_url);
            } else {
              avatarUrl = 'https://api.dicebear.com/9.x/adventurer/png?seed=' + encodeURIComponent(user.id || user.full_name || 'User') + '&size=200';
            }

            const isPremium = user.subscription_type === 'premium' || user.subscription_type === 'pro';
            const badgeColor = user.subscription_type === 'pro' ? '#FFD700' : '#9C27B0';
            const isTopThree = index < 3;
            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

            return (
              <Pressable
                key={user.id}
                style={[
                  styles.userRow,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  isTopThree && { borderColor: rankColors[index], borderWidth: 2 },
                  user.id === supabaseUserId && { backgroundColor: theme === 'dark' ? '#1E3A5F' : '#EFF6FF', borderColor: '#3B82F6', borderWidth: 2 },
                ]}
                onPress={() => { haptic(); router.push({ pathname: '/friend-profile' as any, params: { userId: user.id } }); }}
              >
                <View style={styles.rankContainer}>
                  {isTopThree ? (
                    <View style={[styles.rankBadge, { backgroundColor: rankColors[index] }]}>
                      <Text style={styles.rankBadgeText}>{index + 1}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.rankText, { color: colors.textSecondary }]}>#{index + 1}</Text>
                  )}
                </View>

                <View style={styles.avatarContainer}>
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  {isPremium && (
                    <View style={[styles.premiumBadge, { backgroundColor: badgeColor }]}>
                      <Crown size={8} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {user.full_name || 'Anonymous'}{user.id === supabaseUserId ? ' (You)' : ''}
                  </Text>
                  {isPremium && (
                    <Text style={[styles.subscriptionText, { color: badgeColor }]}>
                      {user.subscription_type === 'pro' ? 'PRO' : 'PREMIUM'}
                    </Text>
                  )}
                </View>

                <View style={styles.swipeCountContainer}>
                  <Text style={[styles.swipeCount, { color: colors.textPrimary }]}>
                    {user.swipeCount || 0}
                  </Text>
                  <Text style={[styles.swipeLabel, { color: colors.textPrimary }]}>swipes</Text>
                </View>
              </Pressable>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  heroBanner: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 0,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  yourRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  yourRankLeft: { flex: 1, alignItems: 'center' },
  yourRankCenter: { flex: 1, alignItems: 'center' },
  yourRankRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  yourRankLabel: { fontSize: 11, fontWeight: '500' },
  yourRankNum: { fontSize: 20, fontWeight: '800' },
  yourRankTrend: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  currentUserRow: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subscriptionText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  swipeCountContainer: {
    alignItems: 'flex-end',
  },
  swipeCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  swipeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
