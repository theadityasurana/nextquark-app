import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, MapPin, Bookmark, BookmarkX, Wifi, Building2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { Job } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { mapSupabaseJobToJob } from '@/lib/jobs';

export default function SavedJobsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supabaseUserId } = useAuth();

  const { data: savedJobs = [], isLoading, refetch } = useQuery({
    queryKey: ['saved-jobs', supabaseUserId],
    queryFn: async () => {
      if (!supabaseUserId) return [];
      const { data, error } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', supabaseUserId);
      
      if (error || !data) return [];
      
      const jobIds = data.map(d => d.job_id);
      if (jobIds.length === 0) return [];
      
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .in('id', jobIds);
      
      return jobs ? jobs.map(mapSupabaseJobToJob) : [];
    },
    enabled: !!supabaseUserId,
  });

  const handleRemove = async (jobId: string) => {
    Alert.alert(
      'Remove Saved Job',
      'Are you sure you want to remove this job from saved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!supabaseUserId) return;
            await supabase
              .from('saved_jobs')
              .delete()
              .eq('user_id', supabaseUserId)
              .eq('job_id', jobId);
            refetch();
          },
        },
      ]
    );
  };

  const formatSalary = (min: number, max: number) => {
    const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`);
    return `${fmt(min)} - ${fmt(max)}`;
  };

  const renderItem = ({ item }: { item: Job }) => {
    const LocationIcon = item.locationType === 'remote' ? Wifi : item.locationType === 'hybrid' ? Building2 : MapPin;
    return (
      <Pressable
        style={({ pressed }) => [styles.jobCard, pressed && styles.jobCardPressed]}
        onPress={() => router.push({ pathname: '/job-details' as any, params: { id: item.id } })}
      >
        <View style={styles.jobCardTop}>
          <Image source={{ uri: item.companyLogo }} style={styles.logo} />
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>{item.jobTitle}</Text>
            <Text style={styles.companyName}>{item.companyName}</Text>
            <View style={styles.locationRow}>
              <LocationIcon size={12} color={Colors.textTertiary} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          </View>
          <Pressable style={styles.removeBtn} onPress={() => handleRemove(item.id)}>
            <BookmarkX size={20} color={Colors.error} />
          </Pressable>
        </View>
        <View style={styles.jobCardBottom}>
          <Text style={styles.salary}>{formatSalary(item.salaryMin, item.salaryMax)}/{item.salaryPeriod}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.employmentType}</Text>
          </View>
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{item.matchScore}% match</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Saved Jobs</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={savedJobs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={savedJobs.length === 0 ? styles.emptyContainerFill : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Bookmark size={36} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Saved Jobs</Text>
              <Text style={styles.emptyText}>
                Swipe up on jobs in Discover to save them for later.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF5FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCardPressed: {
    opacity: 0.9,
  },
  jobCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
  },
  jobInfo: {
    flex: 1,
    marginLeft: 14,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  companyName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  salary: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  typeBadge: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  matchBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '700' as const,
  },
  emptyContainerFill: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
