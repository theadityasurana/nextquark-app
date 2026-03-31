import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { X, Trophy, Crown } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import { supabase, getProfilePictureUrl } from '@/lib/supabase';
import Colors from '@/constants/colors';
import { Stack } from 'expo-router';

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: leaderboardData = [], isLoading } = useQuery({
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={[styles.closeButton, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Trophy size={24} color={Colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.secondary }]}>Leaderboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : leaderboardData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                  isTopThree && { borderColor: rankColors[index], borderWidth: 2 }
                ]}
                onPress={() => router.push({ pathname: '/friend-profile' as any, params: { userId: user.id } })}
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
                    {user.full_name || 'Anonymous'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
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
    paddingTop: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
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
