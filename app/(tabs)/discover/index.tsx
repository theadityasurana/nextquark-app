import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, RefreshControl, Image, TextInput, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, SlidersHorizontal, X, ChevronDown, Check, Search, Users, Crown, Building2, TrendingUp, Clock, GraduationCap } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { fetchJobsByCompany } from '@/lib/jobs';
import { Job } from '@/types';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { supabase } from '@/lib/supabase';
import { universities } from '@/constants/universities';
import { getReferralStats, createReferralCode } from '@/lib/referral';
import { Share } from 'react-native';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userProfile, supabaseUserId } = useAuth();
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [industryFilter, setIndustryFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [friendSearch, setFriendSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '3d' | '7d' | '30d' | '365d' | 'all'>('7d');
  const [recentJobsTimeRange, setRecentJobsTimeRange] = useState<'24h' | '48h' | '7d' | '30d'>('48h');
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const [universityFilter, setUniversityFilter] = useState<string[]>([]);
  const [universitySearch, setUniversitySearch] = useState('');
  const [showFriendSearch, setShowFriendSearch] = useState(false);

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

  const favoriteCompanies = userProfile?.favoriteCompanies || [];

  const { data: topCompanies = [] } = useQuery({
    queryKey: ['analytics-top-companies', analyticsTimeRange],
    queryFn: async () => {
      const timeRangeDate = getTimeRangeDate();
      const query = supabase.from('jobs').select('company_name');
      if (analyticsTimeRange !== 'all') query.gte('created_at', timeRangeDate);
      const { data } = await query;
      if (!data) return [];
      const counts = data.reduce((acc: any, job) => {
        acc[job.company_name] = (acc[job.company_name] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
    },
  });

  const { data: mostAppliedJobs = [] } = useQuery({
    queryKey: ['analytics-most-applied', analyticsTimeRange],
    queryFn: async () => {
      const { data } = await supabase.from('jobs').select('job_title, company_name, right_swipe').order('right_swipe', { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: trendingLocations = [] } = useQuery({
    queryKey: ['analytics-trending-locations', analyticsTimeRange],
    queryFn: async () => {
      const timeRangeDate = getTimeRangeDate();
      const query = supabase.from('jobs').select('location');
      if (analyticsTimeRange !== 'all') query.gte('created_at', timeRangeDate);
      const { data } = await query;
      if (!data) return [];
      const counts = data.reduce((acc: any, job) => {
        acc[job.location] = (acc[job.location] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
    },
  });

  const { data: hotJobs = [] } = useQuery({
    queryKey: ['analytics-hot-jobs', analyticsTimeRange],
    queryFn: async () => {
      const timeRangeDate = getTimeRangeDate();
      const query = supabase.from('jobs').select('job_title, company_name, right_swipe');
      if (analyticsTimeRange !== 'all') query.gte('created_at', timeRangeDate);
      const { data } = await query.order('right_swipe', { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: recentJobs = [] } = useQuery({
    queryKey: ['recent-jobs', recentJobsTimeRange],
    queryFn: async () => {
      const hours = recentJobsTimeRange === '24h' ? 24 : recentJobsTimeRange === '48h' ? 48 : recentJobsTimeRange === '7d' ? 168 : 720;
      const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from('jobs').select('*').gte('created_at', timeAgo).order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: allProfiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, subscription_type, education').order('full_name');
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
    if (universityFilter.length > 0) {
      profiles = profiles.filter((p: any) => {
        const education = p.education || [];
        return education.some((edu: any) => universityFilter.includes(edu.institution));
      });
    }
    return profiles;
  }, [allProfiles, friendSearch, universityFilter]);

  const filteredUniversities = useMemo(() => {
    if (!universitySearch) return universities;
    return universities.filter(u => u.toLowerCase().includes(universitySearch.toLowerCase()));
  }, [universitySearch]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['jobs-by-favorite-companies'] });
  }, [favoriteCompanies, queryClient]);

  const { data: allCompaniesData = [] } = useQuery({
    queryKey: ['all-companies-data'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('name, logo_url, industry, location').order('name');
      return data || [];
    },
  });

  const { data: jobsByCompany = {}, refetch: refetchJobs } = useQuery({
    queryKey: ['jobs-by-favorite-companies', favoriteCompanies],
    queryFn: async () => {
      const results: Record<string, Job[]> = {};
      for (const company of favoriteCompanies) {
        const jobs = await fetchJobsByCompany(company);
        results[company] = jobs;
      }
      return results;
    },
    enabled: favoriteCompanies.length > 0,
  });

  const filteredCompanies = useMemo(() => {
    let companies = favoriteCompanies;
    if (companySearch) {
      companies = companies.filter(company => company.toLowerCase().includes(companySearch.toLowerCase()));
    }
    if (industryFilter.length === 0 && locationFilter.length === 0) return companies;
    return companies.filter(company => {
      const companyData = allCompaniesData.find((c: any) => c.name === company);
      if (!companyData) return false;
      const matchesIndustry = industryFilter.length === 0 || industryFilter.includes(companyData.industry);
      const matchesLocation = locationFilter.length === 0 || locationFilter.includes(companyData.location);
      return matchesIndustry && matchesLocation;
    });
  }, [favoriteCompanies, industryFilter, locationFilter, allCompaniesData, companySearch]);

  const uniqueIndustries = useMemo(() => [...new Set(allCompaniesData.map((c: any) => c.industry).filter(Boolean))], [allCompaniesData]);
  const uniqueLocations = useMemo(() => [...new Set(allCompaniesData.map((c: any) => c.location).filter(Boolean))], [allCompaniesData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchJobs();
    setRefreshing(false);
  }, [refetchJobs]);

  const handleAddFavoriteCompany = useCallback(() => {
    router.push('/profile' as any);
  }, [router]);

  const handleJobPress = useCallback((job: Job) => {
    router.push({ pathname: '/job-details' as any, params: { id: job.id } });
  }, [router]);

  return (
    <TabTransitionWrapper routeName="discover">
      <View style={[styles.container, { paddingTop: insets.top }]}><View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
        </View>

        {(industryFilter.length > 0 || locationFilter.length > 0) && (
          <View style={styles.activeFiltersRow}>
            {industryFilter.map(f => (
              <Pressable key={f} style={styles.activeFilterChip} onPress={() => setIndustryFilter(prev => prev.filter(i => i !== f))}>
                <Text style={styles.activeFilterText}>{f}</Text>
                <X size={12} color={Colors.surface} />
              </Pressable>
            ))}
            {locationFilter.map(f => (
              <Pressable key={f} style={styles.activeFilterChip} onPress={() => setLocationFilter(prev => prev.filter(l => l !== f))}>
                <Text style={styles.activeFilterText}>{f}</Text>
                <X size={12} color={Colors.surface} />
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />} onTouchStart={() => setShowFriendSearch(false)}>
          <View style={styles.friendsSection}>
            <View style={styles.friendsHeader}>
              <Users size={20} color={Colors.secondary} />
              <Text style={styles.friendsSectionTitle}>Friends</Text>
              <Pressable style={styles.iconButton} onPress={() => setShowFriendSearch(!showFriendSearch)}>
                <Search size={18} color={Colors.textSecondary} />
              </Pressable>
              <Pressable style={styles.iconButton} onPress={() => setShowUniversityModal(true)}>
                <GraduationCap size={18} color={universityFilter.length > 0 ? Colors.primary : Colors.textSecondary} />
                {universityFilter.length > 0 && (
                  <View style={styles.iconBadge}>
                    <Text style={styles.iconBadgeText}>{universityFilter.length}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.inviteButton} onPress={async () => {
                if (!referralStats?.referralCode && supabaseUserId) {
                  const code = await createReferralCode(supabaseUserId, userProfile?.full_name || 'User');
                  if (code) await refetchReferralStats();
                }
                if (referralStats?.referralCode) {
                  try {
                    await Share.share({ message: `Join NextQuark with my referral code ${referralStats.referralCode} and get 5 free job application swipes! Download the app now.` });
                  } catch (error) {
                    console.error('Error sharing:', error);
                  }
                }
              }}>
                <Text style={styles.inviteButtonText}>Invite</Text>
              </Pressable>
            </View>
            {showFriendSearch && (
              <View style={styles.searchBar}>
                <Search size={16} color={Colors.textTertiary} />
                <TextInput style={styles.searchInput} placeholder="Search friends..." placeholderTextColor={Colors.textTertiary} value={friendSearch} onChangeText={setFriendSearch} autoFocus />
                <Pressable onPress={() => { setShowFriendSearch(false); setFriendSearch(''); }}>
                  <X size={18} color={Colors.textSecondary} />
                </Pressable>
              </View>
            )}
            {universityFilter.length > 0 && (
              <View style={styles.activeUniversityFilters}>
                {universityFilter.map(uni => (
                  <Pressable key={uni} style={styles.activeUniversityChip} onPress={() => setUniversityFilter(prev => prev.filter(u => u !== uni))}>
                    <Text style={styles.activeUniversityText} numberOfLines={1}>{uni}</Text>
                    <X size={12} color={Colors.surface} />
                  </Pressable>
                ))}
              </View>
            )}
            {isLoadingProfiles ? (
              <Text style={styles.loadingText}>Loading friends...</Text>
            ) : filteredProfiles.length === 0 ? (
              <Text style={styles.emptyFriendsText}>No friends found</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsRow}>
                {filteredProfiles.map((profile: any) => {
                  const avatarUrl = profile.avatar_url ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${profile.avatar_url}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name || 'User') + '&background=6366f1&color=fff&size=200';
                  const isPremium = profile.subscription_type === 'premium' || profile.subscription_type === 'pro';
                  const badgeColor = profile.subscription_type === 'pro' ? '#FFD700' : '#9C27B0';
                  return (
                    <Pressable key={profile.id} style={styles.friendBlock} onPress={() => router.push({ pathname: '/friend-profile' as any, params: { userId: profile.id } })}>
                      {isPremium && (
                        <View style={[styles.premiumBadge, { backgroundColor: badgeColor }]}>
                          <Crown size={10} color="#FFFFFF" />
                          <Text style={styles.premiumBadgeText}>{profile.subscription_type === 'pro' ? 'PRO' : 'PREMIUM'}</Text>
                        </View>
                      )}
                      <Image source={{ uri: avatarUrl }} style={styles.friendAvatar} />
                      <Text style={styles.friendName} numberOfLines={2}>{profile.full_name || 'Anonymous'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.recentJobsSection}>
            <View style={styles.recentJobsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color={Colors.secondary} />
                <Text style={styles.recentJobsSectionTitle}>Recently Posted</Text>
              </View>
            </View>
            <View style={styles.recentTimeSelector}>
              {(['24h', '48h', '7d', '30d'] as const).map((range) => (
                <Pressable
                  key={range}
                  style={[styles.recentTimeChip, recentJobsTimeRange === range && styles.recentTimeChipActive]}
                  onPress={() => setRecentJobsTimeRange(range)}
                >
                  <Text style={[styles.recentTimeText, recentJobsTimeRange === range && styles.recentTimeTextActive]}>
                    {range === '24h' ? '24h' : range === '48h' ? '48h' : range === '7d' ? '7d' : '30d'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {recentJobs.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentJobsRow}>
                {recentJobs.map((job: any) => {
                  const mappedJob = require('@/lib/jobs').mapSupabaseJobToJob(job);
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
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>No recent jobs</Text>
            )}
          </View>

          <View style={styles.analyticsSection}>
            <View style={styles.analyticsHeader}>
              <TrendingUp size={20} color={Colors.secondary} />
              <Text style={styles.analyticsSectionTitle}>Insights</Text>
            </View>
            <View style={styles.timeRangeSelector}>
              {(['24h', '3d', '7d', '30d', '365d', 'all'] as const).map((range) => (
                <Pressable
                  key={range}
                  style={[styles.timeRangeChip, analyticsTimeRange === range && styles.timeRangeChipActive]}
                  onPress={() => setAnalyticsTimeRange(range)}
                >
                  <Text style={[styles.timeRangeText, analyticsTimeRange === range && styles.timeRangeTextActive]}>
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
                          <View style={[styles.barFill, { width: `${(item[1] / topCompanies[0][1]) * 100}%`, backgroundColor: '#6366f1' }]} />
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
                          <View style={[styles.barFill, { width: `${(item[1] / trendingLocations[0][1]) * 100}%`, backgroundColor: '#22c55e' }]} />
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

          {filteredCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Favorite Companies</Text>
              <Text style={styles.emptyText}>Add companies to your favorites to see their job postings here</Text>
              <Pressable style={styles.addButton} onPress={handleAddFavoriteCompany}>
                <Plus size={16} color={Colors.surface} />
                <Text style={styles.addButtonText}>Add Favorite Companies</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.companiesHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Building2 size={20} color={Colors.secondary} />
                  <Text style={styles.companiesSectionTitle}>Favorite Companies</Text>
                </View>
                <Pressable style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                  <SlidersHorizontal size={20} color={Colors.textSecondary} />
                  {(industryFilter.length + locationFilter.length) > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{industryFilter.length + locationFilter.length}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
              <View style={styles.companySearchBar}>
                <Search size={16} color={Colors.textTertiary} />
                <TextInput style={styles.searchInput} placeholder="Search companies..." placeholderTextColor={Colors.textTertiary} value={companySearch} onChangeText={setCompanySearch} />
              </View>
              {filteredCompanies.map(company => {
                const jobs = jobsByCompany[company] || [];
                const companyData = allCompaniesData.find((c: any) => c.name === company);
                const logoUrl = companyData?.logo_url ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/company-logos/${companyData.logo_url}` : null;
                
                return (
                  <View key={company} style={styles.companySection}>
                    <View style={styles.companySectionHeader}>
                      {logoUrl && <Image source={{ uri: logoUrl }} style={styles.companyLogo} />}
                      <Text style={styles.companyName}>{company}</Text>
                      <Text style={styles.jobCount}>{jobs.length} jobs</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jobsRow}>
                      {jobs.map(job => (
                        <Pressable key={job.id} style={[styles.jobCard, appliedJobs.has(job.id) && styles.jobCardApplied]} onPress={() => handleJobPress(job)}>
                          <Image source={{ uri: job.companyLogo }} style={styles.jobCardLogo} />
                          <Text style={styles.jobCardTitle} numberOfLines={2}>{job.jobTitle}</Text>
                          <Text style={styles.jobCardLocation} numberOfLines={1}>{job.location}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}

              <Pressable style={styles.addMoreButton} onPress={handleAddFavoriteCompany}>
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.addMoreText}>Add More Companies</Text>
              </Pressable>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        <Modal visible={showUniversityModal} animationType="slide" transparent onRequestClose={() => setShowUniversityModal(false)}>
          <View style={styles.filterOverlay}>
            <View style={styles.universityModalContent}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filter by University</Text>
                <Pressable onPress={() => setShowUniversityModal(false)}>
                  <X size={22} color={Colors.textPrimary} />
                </Pressable>
              </View>
              <View style={styles.universitySearchBar}>
                <Search size={16} color={Colors.textTertiary} />
                <TextInput
                  style={styles.universitySearchInput}
                  placeholder="Search universities..."
                  placeholderTextColor={Colors.textTertiary}
                  value={universitySearch}
                  onChangeText={setUniversitySearch}
                />
              </View>
              <ScrollView style={styles.universityModalList} keyboardShouldPersistTaps="handled">
                {filteredUniversities.map(uni => (
                  <Pressable
                    key={uni}
                    style={[styles.universityItem, universityFilter.includes(uni) && styles.universityItemSelected]}
                    onPress={() => {
                      setUniversityFilter(prev =>
                        prev.includes(uni) ? prev.filter(u => u !== uni) : [...prev, uni]
                      );
                    }}
                  >
                    {universityFilter.includes(uni) && <Check size={18} color={Colors.primary} />}
                    <Text style={[styles.universityItemText, universityFilter.includes(uni) && styles.universityItemTextSelected]}>{uni}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable style={styles.applyFiltersButton} onPress={() => setShowUniversityModal(false)}>
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
          <View style={styles.filterOverlay}>
            <View style={styles.filterContent}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filters</Text>
                <Pressable onPress={() => setShowFilterModal(false)}>
                  <X size={22} color={Colors.textPrimary} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScrollView}>
                <Text style={styles.filterSectionTitle}>Industry</Text>
                <View style={styles.chipGrid}>
                  {uniqueIndustries.map(industry => (
                    <Pressable key={industry} style={[styles.filterChip, industryFilter.includes(industry) && styles.filterChipActive]} onPress={() => setIndustryFilter(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry])}>
                      {industryFilter.includes(industry) && <Check size={14} color={Colors.surface} />}
                      <Text style={[styles.filterChipText, industryFilter.includes(industry) && styles.filterChipTextActive]}>{industry}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.filterSectionTitle}>Location</Text>
                <View style={styles.chipGrid}>
                  {uniqueLocations.map(location => (
                    <Pressable key={location} style={[styles.filterChip, locationFilter.includes(location) && styles.filterChipActive]} onPress={() => setLocationFilter(prev => prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location])}>
                      {locationFilter.includes(location) && <Check size={14} color={Colors.surface} />}
                      <Text style={[styles.filterChipText, locationFilter.includes(location) && styles.filterChipTextActive]}>{location}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Pressable style={styles.clearFiltersButton} onPress={() => { setIndustryFilter([]); setLocationFilter([]); setShowFilterModal(false); }}>
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </TabTransitionWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.secondary },
  filterButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.surface },
  activeFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  activeFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.secondary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  activeFilterText: { fontSize: 12, color: Colors.surface, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 100 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.secondary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.secondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addButtonText: { fontSize: 16, fontWeight: '700', color: Colors.surface },
  companySection: { marginBottom: 24, paddingLeft: 20 },
  companySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingRight: 20 },
  companyLogo: { width: 32, height: 32, borderRadius: 8 },
  companyName: { fontSize: 18, fontWeight: '700', color: Colors.secondary, flex: 1 },
  jobCount: { fontSize: 13, color: Colors.textTertiary },
  jobsRow: { gap: 12, paddingRight: 20 },
  jobCard: { width: 180, height: 180, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, justifyContent: 'space-between' },
  jobCardApplied: { opacity: 0.5, borderColor: Colors.accent, borderWidth: 2 },
  jobCardLogo: { width: 48, height: 48, borderRadius: 12, marginBottom: 8 },
  jobCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.secondary, marginBottom: 6, lineHeight: 20 },
  jobCardLocation: { fontSize: 12, color: Colors.textSecondary, marginTop: 'auto' },
  addMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
  addMoreText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  friendsSection: { marginBottom: 24, paddingLeft: 20 },
  friendsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingRight: 20 },
  friendsSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary, flex: 1 },
  iconButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight, position: 'relative' },
  iconBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  iconBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.surface },
  inviteButton: { backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  inviteButtonText: { fontSize: 12, fontWeight: '700', color: Colors.surface },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginRight: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  activeUniversityFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, paddingRight: 20 },
  activeUniversityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  activeUniversityText: { fontSize: 12, color: Colors.surface, fontWeight: '600', maxWidth: 200 },
  universityModalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  universitySearchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  universitySearchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  universityModalList: { maxHeight: 400 },
  universityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  universityItemSelected: { backgroundColor: 'rgba(99, 102, 241, 0.08)' },
  universityItemText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  universityItemTextSelected: { fontWeight: '600', color: Colors.primary },
  applyFiltersButton: { marginTop: 16, paddingVertical: 14, backgroundColor: Colors.secondary, borderRadius: 14, alignItems: 'center' },
  applyFiltersText: { fontSize: 16, fontWeight: '700', color: Colors.surface },
  friendsRow: { gap: 12, paddingRight: 20 },
  friendBlock: { width: 100, height: 120, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight, position: 'relative' },
  premiumBadge: { position: 'absolute', top: 4, right: 4, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6, zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  premiumBadgeText: { fontSize: 7, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  friendAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.borderLight, marginBottom: 8 },
  friendName: { fontSize: 12, fontWeight: '600', color: Colors.secondary, textAlign: 'center', lineHeight: 16 },
  loadingText: { fontSize: 13, color: Colors.textTertiary, paddingVertical: 20 },
  emptyFriendsText: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic', paddingVertical: 20 },
  analyticsSection: { marginBottom: 24, paddingLeft: 20 },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingRight: 20 },
  analyticsSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary },
  timeRangeSelector: { flexDirection: 'row', gap: 6, paddingRight: 20, marginBottom: 12 },
  timeRangeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  timeRangeChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  timeRangeText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  timeRangeTextActive: { color: Colors.surface },
  analyticsRow: { gap: 12, paddingRight: 20 },
  analyticsCard: { width: 280, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  analyticsCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.secondary, marginBottom: 4 },
  analyticsCardSubtitle: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8 },
  noDataText: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 20 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 100, fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  barContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 6, height: 24, position: 'relative' },
  barFill: { height: '100%', borderRadius: 6, minWidth: 30 },
  barValue: { position: 'absolute', right: 8, fontSize: 11, fontWeight: '700', color: Colors.secondary },
  recentJobsSection: { marginBottom: 24, paddingLeft: 20 },
  recentJobsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingRight: 20 },
  recentJobsSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary },
  recentTimeSelector: { flexDirection: 'row', gap: 6, paddingRight: 20, marginBottom: 12 },
  recentTimeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  recentTimeChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  recentTimeText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  recentTimeTextActive: { color: Colors.surface },
  recentJobsRow: { gap: 12, paddingRight: 20 },
  recentJobCard: { width: 180, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  recentJobLogo: { width: 48, height: 48, borderRadius: 12, marginBottom: 10, backgroundColor: Colors.borderLight },
  recentJobTitle: { fontSize: 15, fontWeight: '700', color: Colors.secondary, marginBottom: 6, lineHeight: 20 },
  recentJobCompany: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  recentJobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  recentJobLocation: { fontSize: 11, color: Colors.textTertiary, flex: 1 },
  newBadge: { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.surface, letterSpacing: 0.5 },
  companiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  companiesSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  companySearchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterTitle: { fontSize: 22, fontWeight: '800', color: Colors.secondary },
  filterScrollView: { maxHeight: 500 },
  filterSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.secondary, marginTop: 18, marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight },
  filterChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  filterChipText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  filterChipTextActive: { color: Colors.surface },
  clearFiltersButton: { marginTop: 20, paddingVertical: 14, backgroundColor: Colors.secondary, borderRadius: 14, alignItems: 'center' },
  clearFiltersText: { fontSize: 16, fontWeight: '700', color: Colors.surface },
});
