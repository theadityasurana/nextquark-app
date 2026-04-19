import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, RefreshControl, TextInput, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Plus, X, ChevronDown, Check, Search, Users, Building2, TrendingUp, Clock } from '@/components/ProfileIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { mapSupabaseJobToJob } from '@/lib/jobs';
import { Job } from '@/types';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { supabase } from '@/lib/supabase';
import { SkeletonFriendCircle, SkeletonFavCompanies, SkeletonTopCompaniesRow, SkeletonRecentJobsRow } from '@/components/Skeleton';

import { getReferralStats, createReferralCode } from '@/lib/referral';
import { Share } from 'react-native';
import { AnimatedHeaderScrollView, AnimatedHeaderScrollViewRef } from '@/components/AnimatedHeader';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useColors();
  const { userProfile, supabaseUserId } = useAuth();
  


  const [refreshing, setRefreshing] = useState(false);
  const [visibleTopCompanies, setVisibleTopCompanies] = useState(10);
  const [activeFavCompany, setActiveFavCompany] = useState<string | null>(null);
  const [visibleRecentJobs, setVisibleRecentJobs] = useState(10);
  const [friendSearch, setFriendSearch] = useState('');
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '3d' | '7d' | '30d' | '365d' | 'all'>('30d');
  const [recentJobsTimeRange, setRecentJobsTimeRange] = useState<'24h' | '48h' | '7d' | '30d'>('30d');

  const [visibleFriends, setVisibleFriends] = useState(10);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const animatedScrollRef = useRef<AnimatedHeaderScrollViewRef>(null);
  const scrollToTopRef = useRef({ scrollToOffset: () => { animatedScrollRef.current?.scrollToTop(); } });
  useScrollToTop(scrollToTopRef as any);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      animatedScrollRef.current?.scrollToTop();
    }, [])
  );

  const { data: referralStats, refetch: refetchReferralStats } = useQuery({
    queryKey: ['referral-stats', supabaseUserId],
    queryFn: () => getReferralStats(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const getTimeRangeDate = useCallback(() => {
    const now = Date.now();
    switch (analyticsTimeRange) {
      case '24h': return new Date(now - 24 * 60 * 60 * 1000).toISOString();
      case '3d': return new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '365d': return new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
      case 'all': return new Date(0).toISOString();
    }
  }, [analyticsTimeRange]);

  const getTimeRangeLabel = useCallback(() => {
    switch (analyticsTimeRange) {
      case '24h': return 'Past 24 Hours';
      case '3d': return 'Past 3 Days';
      case '7d': return 'Past Week';
      case '30d': return 'Past Month';
      case '365d': return 'Past Year';
      case 'all': return 'All Time';
    }
  }, [analyticsTimeRange]);

  const isLight = colors.background === '#F5F5F5';
  const sectionColors = {
    friends: isLight ? '#FFFFFF' : '#1A1A1A',
    topCompanies: isLight ? '#FAFAFA' : '#1E1E1E',
    recentJobs: isLight ? '#FFFFFF' : '#1A1A1A',
    insights: isLight ? '#FAFAFA' : '#1E1E1E',
    favorites: isLight ? '#FFFFFF' : '#1A1A1A',
  };

  const favoriteCompanies = userProfile?.favoriteCompanies || [];

  const { data: topCompanies = [] } = useQuery({
    queryKey: ['analytics-top-companies', analyticsTimeRange],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const since = getTimeRangeDate();
      const { data, error } = await supabase.rpc('top_companies_hiring', { since });
      if (error || !data) return [];
      return data.map((r: any) => [r.company_name, r.job_count]);
    },
  });

  const { data: mostAppliedJobs = [] } = useQuery({
    queryKey: ['analytics-most-applied', analyticsTimeRange],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase.from('jobs').select('job_title, company_name, right_swipe').order('right_swipe', { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: trendingLocations = [] } = useQuery({
    queryKey: ['analytics-trending-locations', analyticsTimeRange],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const since = getTimeRangeDate();
      const { data, error } = await supabase.rpc('trending_locations', { since });
      if (error || !data) return [];
      return data.map((r: any) => [r.location, r.job_count]);
    },
  });

  const { data: hotJobs = [] } = useQuery({
    queryKey: ['analytics-hot-jobs', analyticsTimeRange],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const timeRangeDate = getTimeRangeDate();
      const query = supabase.from('jobs').select('job_title, company_name, right_swipe');
      if (analyticsTimeRange !== 'all') query.gte('created_at', timeRangeDate);
      const { data } = await query.order('right_swipe', { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: recentJobs = [], isFetching: isLoadingRecentJobs } = useQuery({
    queryKey: ['recent-jobs', recentJobsTimeRange, userProfile?.desiredRoles],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const hours = recentJobsTimeRange === '24h' ? 24 : recentJobsTimeRange === '48h' ? 48 : recentJobsTimeRange === '7d' ? 168 : 720;
      const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const desiredRoles = userProfile?.desiredRoles || [];
      const limit = desiredRoles.length > 0 ? 200 : 100;
      const { data, error } = await supabase.from('jobs')
        .select('id, title, company_name, location, type, created_at, skills, description')
        .gte('created_at', timeAgo)
        .ilike('location', '%india%')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) { console.log('Recent jobs error:', error.message); return []; }
      if (!data) return [];
      if (desiredRoles.length === 0) return data;
      const expandedRoles = desiredRoles.map((r: string) => r.toLowerCase());
      const filtered = data.filter((job: any) => {
        const jobText = `${job.title || ''} ${job.description || ''} ${Array.isArray(job.skills) ? job.skills.join(' ') : ''}`.toLowerCase();
        return expandedRoles.some(keyword => jobText.includes(keyword));
      });
      return filtered.length > 0 ? filtered : data;
    },
  });

  const { data: allProfiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['all-profiles'],
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, subscription_type').order('full_name').limit(50);
      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }
      return data || [];
    },
  });

  const filteredProfiles = useMemo(() => {
    let profiles = allProfiles;
    if (friendSearch) {
      profiles = profiles.filter((p: any) => p.full_name?.toLowerCase().includes(friendSearch.toLowerCase()));
    }
    return profiles;
  }, [allProfiles, friendSearch]);

  useEffect(() => {
    setVisibleFriends(10);
  }, [friendSearch]);

  // favoriteCompanies is part of the query key, so React Query auto-refetches when it changes

  const { data: allCompaniesData = [] } = useQuery({
    queryKey: ['fav-companies-data', favoriteCompanies],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (favoriteCompanies.length === 0) return [];
      const { data } = await supabase.from('companies').select('name, logo_url, industry, location').in('name', favoriteCompanies);
      return data || [];
    },
    enabled: favoriteCompanies.length > 0,
  });

  const { data: allCompaniesWithLogos = [], isLoading: isLoadingTopCompanies } = useQuery({
    queryKey: ['top-companies-logos'],
    staleTime: 1000 * 60 * 30, // 30 min
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('name, logo_url').not('logo_url', 'is', null).order('name');
      if (error) {
        console.error('Error fetching top companies:', error);
        return [];
      }
      if (!data) return [];
      const seen = new Set();
      return data.filter((c: any) => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });
    },
  });

  const topCompaniesWithLogos = useMemo(() => {
    if (allCompaniesWithLogos.length <= 10) return allCompaniesWithLogos;
    const shuffled = [...allCompaniesWithLogos].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [allCompaniesWithLogos]);

  const topCompanyJobCounts = useMemo(() => {
    const map: Record<string, number> = {};
    topCompanies.forEach((item: any) => { map[item[0]] = item[1] as number; });
    return map;
  }, [topCompanies]);

  const { data: jobsByCompany = {}, refetch: refetchJobs, isLoading: isLoadingFavJobs } = useQuery({
    queryKey: ['jobs-by-favorite-companies', favoriteCompanies],
    queryFn: async () => {
      if (favoriteCompanies.length === 0) return {};
      const results: Record<string, Job[]> = {};
      const allJobs: any[] = [];
      // Single query: fetch jobs for all favorite companies at once
      for (const company of favoriteCompanies) {
        const { data, error } = await supabase.from('jobs')
          .select('id, title, company_name, location, type, salary_range, created_at')
          .ilike('company_name', company)
          .order('created_at', { ascending: false });
        if (error) { console.log('Fav company jobs error:', error.message); }
        if (data) allJobs.push(...data.map((j: any) => ({ ...j, _matchedCompany: company })));
      }
      for (const company of favoriteCompanies) {
        results[company] = allJobs
          .filter((j: any) => j._matchedCompany === company)
          .map((j: any) => mapSupabaseJobToJob(j));
      }
      return results;
    },
    enabled: favoriteCompanies.length > 0,
  });



  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchJobs();
    setRefreshing(false);
  }, [refetchJobs]);

  const handleAddFavoriteCompany = useCallback(() => {
    router.push({ pathname: '/(tabs)/profile/edit-section' as any, params: { section: 'favoritecompanies' } });
  }, [router]);

  const handleJobPress = useCallback((job: Job) => {
    router.push({ pathname: '/job-details' as any, params: { id: job.id } });
  }, [router]);

  return (
    <TabTransitionWrapper routeName="discover">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AnimatedHeaderScrollView
          scrollRef={animatedScrollRef}
          largeTitle="Discover"
          backgroundColor={colors.background}
          largeTitleColor={colors.secondary}
          largeHeaderTitleStyle={{ fontSize: 34, fontWeight: '800', fontFamily: 'Lora_700Bold' }}
        >


        <View onTouchStart={() => setShowFriendSearch(false)}>
          <View style={[styles.friendsSection, { backgroundColor: sectionColors.friends }]}>
            <View style={styles.friendsHeader}>
              <Users size={20} color={colors.secondary} />
              <Text style={[styles.friendsSectionTitle, { color: colors.secondary }]}>Friends</Text>
              <Pressable style={[styles.iconButton, { backgroundColor: colors.surface }]} onPress={() => setShowFriendSearch(!showFriendSearch)}>
                <Search size={18} color={colors.textPrimary} />
              </Pressable>

              <Pressable style={[styles.inviteButton, { backgroundColor: isLight ? '#000' : '#FFF' }]} onPress={async () => {
                if (!referralStats?.referralCode && supabaseUserId) {
                  const code = await createReferralCode(supabaseUserId, userProfile?.name || 'User');
                  if (code) await refetchReferralStats();
                }
                if (referralStats?.referralCode) {
                  try {
                    await Share.share({ message: `Hey! Check out NextQuark — think of it like Tinder for jobs. You swipe right on jobs you like and AI applies for you automatically. It's the fastest way to apply to hundreds of jobs. Join with my referral code ${referralStats.referralCode} and we both get 5 free swipes to get started. Download it here: https://nextquark.framer.website/#download` });
                  } catch (error) {
                    console.error('Error sharing:', error);
                  }
                }
              }}>
                <Text style={[styles.inviteButtonText, { color: isLight ? '#FFF' : '#000' }]}>Invite</Text>
              </Pressable>
            </View>
            {showFriendSearch && (
              <View style={[styles.searchBar, { backgroundColor: isLight ? 'rgba(118,118,128,0.12)' : '#2C2C2E' }]}>
                <Search size={16} color="#8E8E93" />
                <TextInput style={[styles.searchInput, { color: isLight ? '#000000' : '#FFFFFF' }]} placeholder="Search friends..." placeholderTextColor="#8E8E93" value={friendSearch} onChangeText={setFriendSearch} autoFocus />
                {friendSearch.length > 0 && (
                  <Pressable onPress={() => setFriendSearch('')} hitSlop={8}>
                    <View style={styles.searchClearBtn}>
                      <X size={10} color={isLight ? '#FFFFFF' : '#2C2C2E'} strokeWidth={3} />
                    </View>
                  </Pressable>
                )}
                <Pressable onPress={() => { setShowFriendSearch(false); setFriendSearch(''); }} hitSlop={8}>
                  <Text style={styles.searchCancelText}>Cancel</Text>
                </Pressable>
              </View>
            )}
            {isLoadingProfiles ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                {[1,2,3,4,5].map(i => <SkeletonFriendCircle key={i} />)}
              </ScrollView>
            ) : filteredProfiles.length === 0 ? (
              <Text style={[styles.emptyFriendsText, { color: colors.textSecondary }]}>No friends found</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsRow}>
                {filteredProfiles.slice(0, visibleFriends).map((profile: any, index: number) => {
                  const defaultUnsplash = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d';
                  let avatarUrl;
                  if (profile.avatar_url && !profile.avatar_url.includes(defaultUnsplash)) {
                    avatarUrl = profile.avatar_url.startsWith('http')
                      ? profile.avatar_url
                      : `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${profile.avatar_url}`;
                  } else {
                    avatarUrl = 'https://api.dicebear.com/9.x/adventurer/png?seed=' + encodeURIComponent(profile.id || profile.full_name || 'User') + '&size=200';
                  }
                  
                  const borderColor = profile.subscription_type === 'premium' ? '#E65100' : '#DDD';
                  return (
                    <Pressable
                      key={profile.id}
                      style={[styles.friendBlock, index > 0 && { marginLeft: -20 }]}
                      onPress={() => router.push({ pathname: '/friend-profile' as any, params: { userId: profile.id } })}
                    >
                      <Image source={{ uri: avatarUrl }} style={[styles.friendAvatar, { borderColor }]} />
                    </Pressable>
                  );
                })}
                {filteredProfiles.length > visibleFriends && (
                  <Pressable style={[styles.loadMoreFriend, { borderColor: colors.borderLight }]} onPress={() => setVisibleFriends(prev => prev + 10)}>
                    <Plus size={20} color={colors.secondary} />
                    <Text style={[styles.loadMoreText, { color: colors.secondary }]}>More</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </View>

          <View style={[styles.topCompaniesSection, { backgroundColor: sectionColors.topCompanies }]}>
            <View style={styles.topCompaniesHeader}>
              <Building2 size={20} color={colors.secondary} />
              <Text style={[styles.topCompaniesSectionTitle, { color: colors.secondary }]}>Top Companies Hiring This Week</Text>
            </View>
            {isLoadingTopCompanies ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <SkeletonTopCompaniesRow />
              </ScrollView>
            ) : topCompaniesWithLogos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topCompaniesRow}>
                {topCompaniesWithLogos.slice(0, visibleTopCompanies).map((company: any, index: number) => {
                  const logoUrl = `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/company-logos/logos/${company.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
                  const jobCount = topCompanyJobCounts[company.name] || null;
                  return (
                    <Pressable key={`${company.name}-${index}`} style={[styles.companyLogoTile, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: company.name } })}>
                      <Image source={{ uri: logoUrl }} style={styles.companyLogoImage} contentFit="contain" transition={200} cachePolicy="memory-disk" />
                      <Text style={[styles.companyTileName, { color: colors.textPrimary }]} numberOfLines={1}>{company.name}</Text>
                      {jobCount != null && (
                        <View style={styles.companyTileBadge}>
                          <Text style={styles.companyTileBadgeText}>{jobCount} jobs</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
                {topCompaniesWithLogos.length > visibleTopCompanies && (
                  <Pressable style={[styles.loadMoreCardSmall, { borderColor: colors.borderLight }]} onPress={() => setVisibleTopCompanies(prev => prev + 10)}>
                    <Plus size={20} color={colors.secondary} />
                    <Text style={[styles.loadMoreText, { color: colors.secondary }]}>More</Text>
                  </Pressable>
                )}
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>No companies available</Text>
            )}
          </View>

          <View style={[styles.recentJobsSection, { backgroundColor: sectionColors.recentJobs }]}>
            <View style={styles.recentJobsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color={colors.secondary} />
                <Text style={[styles.recentJobsSectionTitle, { color: colors.secondary }]}>Recently Posted</Text>
              </View>
            </View>
            <View style={styles.recentTimeSelector}>
              {(['24h', '48h', '7d', '30d'] as const).map((range) => (
                <Pressable
                  key={range}
                  style={[styles.recentTimeChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }, recentJobsTimeRange === range && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}
                  onPress={() => setRecentJobsTimeRange(range)}
                >
                  <Text style={[styles.recentTimeText, { color: colors.textPrimary }, recentJobsTimeRange === range && { color: colors.surface }]}>
                    {range === '24h' ? '24h' : range === '48h' ? '48h' : range === '7d' ? '7d' : '30d'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {isLoadingRecentJobs ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <SkeletonRecentJobsRow />
              </ScrollView>
            ) : recentJobs.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentJobsRow}>
                {recentJobs.slice(0, visibleRecentJobs).map((job: any) => {
                  const mappedJob = mapSupabaseJobToJob(job);
                  return (
                    <Pressable key={job.id} style={styles.recentJobCard} onPress={() => handleJobPress(mappedJob)}>
                      <Image source={{ uri: mappedJob.companyLogo }} style={styles.recentJobLogo} />
                      <Text style={styles.recentJobTitle} numberOfLines={2}>{mappedJob.jobTitle}</Text>
                      <Text style={styles.recentJobCompany} numberOfLines={1}>{mappedJob.companyName}</Text>
                      <View style={styles.recentJobFooter}>
                        <Text style={styles.recentJobLocation} numberOfLines={1}>{mappedJob.location}</Text>
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
                {recentJobs.length > visibleRecentJobs && (
                  <Pressable style={[styles.loadMoreCard, { borderColor: colors.borderLight }]} onPress={() => setVisibleRecentJobs(prev => prev + 10)}>
                    <Plus size={24} color={colors.secondary} />
                    <Text style={[styles.loadMoreText, { color: colors.secondary }]}>Load More</Text>
                  </Pressable>
                )}
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>No recent jobs</Text>
            )}
          </View>

          <View style={[styles.analyticsSection, { backgroundColor: sectionColors.insights }]}>
            <View style={styles.analyticsHeader}>
              <TrendingUp size={20} color={colors.secondary} />
              <Text style={[styles.analyticsSectionTitle, { color: colors.secondary }]}>Insights</Text>
            </View>
            <View style={styles.timeRangeSelector}>
              {(['24h', '3d', '7d', '30d', '365d', 'all'] as const).map((range) => (
                <Pressable
                  key={range}
                  style={[styles.timeRangeChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }, analyticsTimeRange === range && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}
                  onPress={() => setAnalyticsTimeRange(range)}
                >
                  <Text style={[styles.timeRangeText as any, { color: colors.textPrimary }, analyticsTimeRange === range && { color: colors.surface }]}>
                    {range === '24h' ? '24h' : range === '3d' ? '3d' : range === '7d' ? '7d' : range === '30d' ? '30d' : range === '365d' ? '1y' : 'All'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.analyticsRow}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsCardTitle}>Top Companies Hiring</Text>
                <Text style={styles.analyticsCardSubtitle}>{getTimeRangeLabel()}</Text>
                {topCompanies.length > 0 ? (
                  <View>
                    {topCompanies.map((item: any, idx: number) => (
                      <View key={idx} style={styles.barRow}>
                        <Text style={styles.barLabel}>{item[0].substring(0, 15)}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.barFill, { width: `${((item[1] as number) / (topCompanies[0][1] as number)) * 100}%`, backgroundColor: '#6366f1' }]} />
                          <Text style={styles.barValue}>{item[1]}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No data available</Text>
                )}
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsCardTitle}>Most Applied Jobs</Text>
                <Text style={styles.analyticsCardSubtitle}>All Time</Text>
                {mostAppliedJobs.length > 0 ? (
                  <View>
                    {mostAppliedJobs.map((job: any, idx: number) => (
                      <View key={idx} style={styles.barRow}>
                        <Text style={styles.barLabel}>{job.job_title.substring(0, 15)}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.barFill, { width: `${(job.right_swipe / mostAppliedJobs[0].right_swipe) * 100}%`, backgroundColor: '#ef4444' }]} />
                          <Text style={styles.barValue}>{job.right_swipe || 0}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No data available</Text>
                )}
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsCardTitle}>Trending Locations</Text>
                <Text style={styles.analyticsCardSubtitle}>{getTimeRangeLabel()}</Text>
                {trendingLocations.length > 0 ? (
                  <View>
                    {trendingLocations.map((item: any, idx: number) => (
                      <View key={idx} style={styles.barRow}>
                        <Text style={styles.barLabel}>{item[0].substring(0, 15)}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.barFill, { width: `${((item[1] as number) / (trendingLocations[0][1] as number)) * 100}%`, backgroundColor: '#22c55e' }]} />
                          <Text style={styles.barValue}>{item[1]}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No data available</Text>
                )}
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsCardTitle}>Hot Jobs</Text>
                <Text style={styles.analyticsCardSubtitle}>{getTimeRangeLabel()}</Text>
                {hotJobs.length > 0 ? (
                  <View>
                    {hotJobs.map((job: any, idx: number) => (
                      <View key={idx} style={styles.barRow}>
                        <Text style={styles.barLabel}>{job.job_title.substring(0, 15)}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.barFill, { width: `${(job.right_swipe / hotJobs[0].right_swipe) * 100}%`, backgroundColor: '#f97316' }]} />
                          <Text style={styles.barValue}>{job.right_swipe || 0}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No data available</Text>
                )}
              </View>
            </ScrollView>
          </View>

          {favoriteCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>No Favorite Companies</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add companies to your favorites to see their job postings here</Text>
              <Pressable style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={handleAddFavoriteCompany}>
                <Plus size={16} color={colors.surface} />
                <Text style={[styles.addButtonText, { color: colors.surface }]}>Add Favorite Companies</Text>
              </Pressable>
            </View>
          ) : isLoadingFavJobs ? (
            <SkeletonFavCompanies />
          ) : (
            <FavCompaniesTabbed
              companies={favoriteCompanies}
              jobsByCompany={jobsByCompany}
              allCompaniesData={allCompaniesData}
              activeCompany={activeFavCompany ?? favoriteCompanies[0]}
              onSelectCompany={setActiveFavCompany}
              onJobPress={handleJobPress}
              onAddCompany={handleAddFavoriteCompany}
              colors={colors}
              router={router}
            />
          )}
          <View style={{ height: 56 + insets.bottom }} />
        </View>
        </AnimatedHeaderScrollView>




      </View>
    </TabTransitionWrapper>
  );
}

function FavCompaniesTabbed({ companies, jobsByCompany, allCompaniesData, activeCompany, onSelectCompany, onJobPress, onAddCompany, colors, router }: {
  companies: string[];
  jobsByCompany: Record<string, Job[]>;
  allCompaniesData: any[];
  activeCompany: string;
  onSelectCompany: (c: string) => void;
  onJobPress: (j: Job) => void;
  onAddCompany: () => void;
  colors: any;
  router: any;
}) {
  const jobs = jobsByCompany[activeCompany] || [];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Building2 size={20} color={colors.secondary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.secondary }}>Favorite Companies</Text>
        </View>
        <Pressable style={[styles.addCompanyBtn, { backgroundColor: colors.secondary }]} onPress={onAddCompany}>
          <Plus size={18} color={colors.surface} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {companies.map(company => {
          const isActive = company === activeCompany;
          const count = (jobsByCompany[company] || []).length;
          return (
            <Pressable
              key={company}
              style={[styles.pill, { backgroundColor: isActive ? colors.secondary : colors.surface, borderColor: isActive ? colors.secondary : colors.borderLight }]}
              onPress={() => onSelectCompany(company)}
            >
              <Text style={[styles.pillText, { color: isActive ? colors.surface : colors.textPrimary }]} numberOfLines={1}>{company}</Text>
              <Text style={[styles.pillCount, { color: isActive ? colors.surface : colors.textTertiary }]}>{count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {jobs.length === 0 ? (
        <Text style={[styles.favEmptyText, { color: colors.textTertiary }]}>No jobs posted yet</Text>
      ) : (
        <>
          <View style={styles.favJobsGrid}>
            {jobs.slice(0, 6).map(job => (
              <Pressable key={job.id} style={[styles.favJobCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => onJobPress(job)}>
                <Image source={{ uri: job.companyLogo }} style={styles.favJobLogo} />
                <Text style={[styles.favJobTitle, { color: colors.textPrimary }]} numberOfLines={2}>{job.jobTitle}</Text>
                <Text style={[styles.favJobLocation, { color: colors.textTertiary }]} numberOfLines={1}>{job.location}</Text>
              </Pressable>
            ))}
          </View>
          {jobs.length > 6 && (
            <Pressable style={[styles.favSeeAll, { borderColor: colors.borderLight }]} onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: activeCompany } })}>
              <Text style={[styles.favSeeAllText, { color: colors.secondary }]}>See all {jobs.length} jobs</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: "#000" },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 100 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: "#000", marginBottom: 8 },
  emptyText: { fontSize: 15, color: "#000", textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  addButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  pillRow: { paddingLeft: 0, paddingRight: 8, gap: 8, marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '700' },
  pillCount: { fontSize: 11, fontWeight: '600', opacity: 0.7 },
  favJobsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 0 },
  favJobCard: { width: '31%' as any, borderRadius: 12, padding: 10, borderWidth: 1 },
  favJobLogo: { width: 28, height: 28, borderRadius: 8, marginBottom: 6 },
  favJobTitle: { fontSize: 11, fontWeight: '700', lineHeight: 15, marginBottom: 3 },
  favJobLocation: { fontSize: 10 },
  favSeeAll: { alignItems: 'center', marginTop: 8, marginHorizontal: 0, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  favSeeAllText: { fontSize: 13, fontWeight: '700' },
  favEmptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 24, fontStyle: 'italic' as const },
  loadMoreCardSmall: { width: 80, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  loadMoreCard: { width: 120, height: 180, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadMoreFriend: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 2, marginLeft: -20 },
  loadMoreText: { fontSize: 13, fontWeight: '700' },
  addCompanyBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  friendsSection: { marginBottom: 12, marginHorizontal: -16, paddingVertical: 16, borderRadius: 16 },
  friendsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 20 },
  friendsSectionTitle: { fontSize: 18, fontWeight: '700', color: "#000", flex: 1 },
  iconButton: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: "#DDD", position: 'relative' },
  iconBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center' },
  iconBadgeText: { fontSize: 9, fontWeight: '700', color: "#000" },
  inviteButton: { backgroundColor: "#000", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  inviteButtonText: { fontSize: 12, fontWeight: '700', color: "#FFF" },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 10, height: 36, marginHorizontal: 20, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 17, padding: 0 },
  searchClearBtn: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#8E8E93', justifyContent: 'center', alignItems: 'center' },
  searchCancelText: { fontSize: 17, color: '#007AFF', marginLeft: 4 },

  friendsRow: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  friendBlock: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  friendAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#FFF", borderWidth: 3, borderColor: '#DDD' },
  loadingText: { fontSize: 13, color: "#000", paddingVertical: 20 },
  emptyFriendsText: { fontSize: 13, color: "#000", fontStyle: 'italic', paddingVertical: 20 },
  topCompaniesSection: { marginBottom: 12, marginHorizontal: -16, paddingVertical: 16, borderRadius: 16 },
  topCompaniesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 20 },
  topCompaniesSectionTitle: { fontSize: 18, fontWeight: '700', color: "#000" },
  topCompaniesRow: { gap: 12, paddingHorizontal: 20 },
  companyLogoTile: { width: 80, height: 100, borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' as const },
  companyLogoImage: { width: 40, height: 40, borderRadius: 8, marginBottom: 4 },
  companyTileName: { fontSize: 10, fontWeight: '600', textAlign: 'center' as const },
  companyTileBadge: { position: 'absolute' as const, top: 4, right: 4, backgroundColor: '#22c55e', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5 },
  companyTileBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFF' },
  analyticsSection: { marginBottom: 12, marginHorizontal: -16, paddingVertical: 16, borderRadius: 16 },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 20 },
  analyticsSectionTitle: { fontSize: 18, fontWeight: '700', color: "#000" },
  timeRangeSelector: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
  timeRangeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  analyticsRow: { gap: 12, paddingHorizontal: 20 },
  analyticsCard: { width: 280, backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#DDD" },
  analyticsCardTitle: { fontSize: 16, fontWeight: '700', color: "#000", marginBottom: 4 },
  analyticsCardSubtitle: { fontSize: 12, color: "#000", marginBottom: 8 },
  noDataText: { fontSize: 13, color: "#000", textAlign: 'center', paddingVertical: 20 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 100, fontSize: 11, color: "#000", fontWeight: '600' },
  barContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 6, height: 24, position: 'relative' },
  barFill: { height: '100%', borderRadius: 6, minWidth: 30 },
  barValue: { position: 'absolute', right: 8, fontSize: 11, fontWeight: '700', color: "#000" },
  recentJobsSection: { marginBottom: 12, marginHorizontal: -16, paddingVertical: 16, borderRadius: 16 },
  recentJobsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 20 },
  recentJobsSectionTitle: { fontSize: 18, fontWeight: '700', color: "#000" },
  recentTimeSelector: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
  recentTimeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  recentTimeText: { fontSize: 11, fontWeight: '600' },
  recentJobsRow: { gap: 12, paddingHorizontal: 20 },
  recentJobCard: { width: 180, backgroundColor: 'slategray', borderRadius: 16, padding: 16 },
  recentJobLogo: { width: 48, height: 48, borderRadius: 12, marginBottom: 10, backgroundColor: "#FFF" },
  recentJobTitle: { fontSize: 15, fontWeight: '700', color: "#FFF", marginBottom: 6, lineHeight: 20 },
  recentJobCompany: { fontSize: 12, color: '#E0E0E0', marginBottom: 8 },
  recentJobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  recentJobLocation: { fontSize: 11, color: '#E0E0E0', flex: 1 },
  newBadge: { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: "#FFF", letterSpacing: 0.5 },
  companiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 6, paddingVertical: 12, borderRadius: 16 },
  companiesSectionTitle: { fontSize: 18, fontWeight: '700', flexDirection: 'row', alignItems: 'center', gap: 8 },
  companySearchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: "#DDD" },
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterTitle: { fontSize: 22, fontWeight: '800' },

  timeRangeText: { fontSize: 12, fontWeight: '600' as const },
});
