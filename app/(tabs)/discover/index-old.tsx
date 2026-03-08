import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, RefreshControl, Image, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, SlidersHorizontal, X, ChevronDown, Check, Search, Users } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { fetchJobsByCompany } from '@/lib/jobs';
import { Job } from '@/types';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { supabase } from '@/lib/supabase';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userProfile, swipedJobIds } = useAuth();
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [industryFilter, setIndustryFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [friendSearch, setFriendSearch] = useState('');

  const favoriteCompanies = userProfile?.favoriteCompanies || [];

  const { data: allProfiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      console.log('Fetching all profiles...');
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');
      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }
      console.log('Fetched profiles:', data?.length || 0);
      return data || [];
    },
  });

  const filteredProfiles = useMemo(() => {
    if (!friendSearch) return allProfiles;
    return allProfiles.filter((p: any) => 
      p.full_name?.toLowerCase().includes(friendSearch.toLowerCase())
    );
  }, [allProfiles, friendSearch]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['jobs-by-favorite-companies'] });
  }, [favoriteCompanies, queryClient]);

  const { data: allCompaniesData = [] } = useQuery({
    queryKey: ['all-companies-data'],
    queryFn: async () => {
      const { data } = await require('@/lib/supabase').supabase.from('companies').select('name, logo_url, industry, location').order('name');
      return data || [];
    },
  });

  const { data: jobsByCompany = {}, refetch: refetchJobs } = useQuery({
    queryKey: ['jobs-by-favorite-companies', favoriteCompanies],
    queryFn: async () => {
      const results: Record<string, Job[]> = {};
      for (const company of favoriteCompanies) {
        const jobs = await fetchJobsByCompany(company);
        console.log(`Fetched ${jobs.length} jobs for ${company}`);
        results[company] = jobs;
      }
      return results;
    },
    enabled: favoriteCompanies.length > 0,
  });

  const filteredCompanies = useMemo(() => {
    if (industryFilter.length === 0 && locationFilter.length === 0) return favoriteCompanies;
    return favoriteCompanies.filter(company => {
      const companyData = allCompaniesData.find((c: any) => c.name === company);
      if (!companyData) return false;
      const matchesIndustry = industryFilter.length === 0 || industryFilter.includes(companyData.industry);
      const matchesLocation = locationFilter.length === 0 || locationFilter.includes(companyData.location);
      return matchesIndustry && matchesLocation;
    });
  }, [favoriteCompanies, industryFilter, locationFilter, allCompaniesData]);

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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Pressable style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <SlidersHorizontal size={20} color={Colors.textSecondary} />
            {(industryFilter.length + locationFilter.length) > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{industryFilter.length + locationFilter.length}</Text>
              </View>
            )}
          </Pressable>
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

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        >
          <View style={styles.friendsSection}>
            <View style={styles.friendsHeader}>
              <Users size={20} color={Colors.secondary} />
              <Text style={styles.friendsSectionTitle}>Friends</Text>
            </View>
            <View style={styles.searchBar}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search friends..."
                placeholderTextColor={Colors.textTertiary}
                value={friendSearch}
                onChangeText={setFriendSearch}
              />
            </View>
            {isLoadingProfiles ? (
              <Text style={styles.loadingText}>Loading friends...</Text>
            ) : filteredProfiles.length === 0 ? (
              <Text style={styles.emptyFriendsText}>No friends found</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsRow}>
                {filteredProfiles.map((profile: any) => {
                  const avatarUrl = profile.avatar_url
                    ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${profile.avatar_url}`
                    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name || 'User') + '&background=6366f1&color=fff&size=200';
                  return (
                    <Pressable
                      key={profile.id}
                      style={styles.friendBlock}
                      onPress={() => router.push({ pathname: '/friend-profile' as any, params: { userId: profile.id } })}
                    >
                      <Image source={{ uri: avatarUrl }} style={styles.friendAvatar} />
                      <Text style={styles.friendName} numberOfLines={2}>{profile.full_name || 'Anonymous'}</Text>
                    </Pressable>
                  );
                })}}
              </ScrollView>
            )}
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
                        <Pressable 
                          key={job.id} 
                          style={[styles.jobCard, appliedJobs.has(job.id) && styles.jobCardApplied]} 
                          onPress={() => handleJobPress(job)}
                        >
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
                    <Pressable 
                      key={industry} 
                      style={[styles.filterChip, industryFilter.includes(industry) && styles.filterChipActive]} 
                      onPress={() => setIndustryFilter(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry])}
                    >
                      {industryFilter.includes(industry) && <Check size={14} color={Colors.surface} />}
                      <Text style={[styles.filterChipText, industryFilter.includes(industry) && styles.filterChipTextActive]}>{industry}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.filterSectionTitle}>Location</Text>
                <View style={styles.chipGrid}>
                  {uniqueLocations.map(location => (
                    <Pressable 
                      key={location} 
                      style={[styles.filterChip, locationFilter.includes(location) && styles.filterChipActive]} 
                      onPress={() => setLocationFilter(prev => prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location])}
                    >
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
  friendsSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginRight: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  friendsRow: { gap: 12, paddingRight: 20 },
  friendBlock: { width: 100, height: 120, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  friendAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.borderLight, marginBottom: 8 },
  friendName: { fontSize: 12, fontWeight: '600', color: Colors.secondary, textAlign: 'center', lineHeight: 16 },
  loadingText: { fontSize: 13, color: Colors.textTertiary, paddingVertical: 20 },
  emptyFriendsText: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic', paddingVertical: 20 },
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
