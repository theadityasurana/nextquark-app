import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { X, MapPin, Briefcase, GraduationCap, Trophy, Award, Heart } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { fetchJobById } from '@/lib/jobs';

export default function FriendProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['friend-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: appliedJobs = [] } = useQuery({
    queryKey: ['friend-applied-jobs', userId],
    queryFn: async () => {
      if (!profile?.swiped_job_ids || profile.swiped_job_ids.length === 0) return [];
      const jobs = await Promise.all(
        profile.swiped_job_ids.map((jobId: string) => fetchJobById(jobId).catch(() => null))
      );
      return jobs.filter(Boolean);
    },
    enabled: !!profile?.swiped_job_ids,
  });

  const { data: favoriteCompaniesData = [] } = useQuery({
    queryKey: ['friend-favorite-companies', profile?.favorite_companies],
    queryFn: async () => {
      if (!profile?.favorite_companies || profile.favorite_companies.length === 0) return [];
      const { data } = await supabase
        .from('companies')
        .select('name, logo_url')
        .in('name', profile.favorite_companies);
      return data || [];
    },
    enabled: !!profile?.favorite_companies,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  const avatarUrl = profile.avatar_url
    ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${profile.avatar_url}`
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name || 'User') + '&background=6366f1&color=fff&size=400';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <X size={22} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <Text style={styles.name}>{profile.full_name || 'Anonymous'}</Text>
          {profile.headline && <Text style={styles.headline}>{profile.headline}</Text>}
          {profile.location && (
            <View style={styles.locationRow}>
              <MapPin size={14} color={Colors.textSecondary} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {profile.experience && profile.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {profile.experience.map((exp: any, idx: number) => (
              <View key={idx} style={styles.expItem}>
                <View style={styles.expIcon}>
                  <Briefcase size={18} color={Colors.accent} />
                </View>
                <View style={styles.expContent}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expCompany}>{exp.company}</Text>
                  <Text style={styles.expDate}>
                    {exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}
                  </Text>
                  {exp.description && <Text style={styles.expDesc} numberOfLines={3}>{exp.description}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {profile.education && profile.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {profile.education.map((edu: any, idx: number) => (
              <View key={idx} style={styles.expItem}>
                <View style={styles.expIcon}>
                  <GraduationCap size={18} color={Colors.accent} />
                </View>
                <View style={styles.expContent}>
                  <Text style={styles.expTitle}>{edu.degree} in {edu.field}</Text>
                  <Text style={styles.expCompany}>{edu.institution}</Text>
                  <Text style={styles.expDate}>{edu.startDate} — {edu.endDate}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {profile.achievements && profile.achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {profile.achievements.map((ach: any, idx: number) => (
              <View key={idx} style={styles.expItem}>
                <View style={[styles.expIcon, { backgroundColor: '#FFF8E1' }]}>
                  <Trophy size={18} color="#FFD700" />
                </View>
                <View style={styles.expContent}>
                  <Text style={styles.expTitle}>{ach.title}</Text>
                  <Text style={styles.expCompany}>{ach.issuer}</Text>
                  <Text style={styles.expDate}>{ach.date}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {appliedJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applied Jobs</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jobsRow}>
              {appliedJobs.map((job: any) => (
                <Pressable
                  key={job.id}
                  style={styles.jobTile}
                  onPress={() => router.push({ pathname: '/job-details' as any, params: { id: job.id } })}
                >
                  <Image source={{ uri: job.companyLogo }} style={styles.jobLogo} />
                  <Text style={styles.jobCompany} numberOfLines={1}>{job.companyName}</Text>
                  <Text style={styles.jobTitle} numberOfLines={2}>{job.jobTitle}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {favoriteCompaniesData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Companies</Text>
            <View style={styles.companiesGrid}>
              {favoriteCompaniesData.map((company: any, idx: number) => {
                const logoUrl = company.logo_url
                  ? `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/company-logos/${company.logo_url}`
                  : null;
                return (
                  <View key={idx} style={styles.companyChip}>
                    {logoUrl && <Image source={{ uri: logoUrl }} style={styles.companyLogo} />}
                    <Text style={styles.companyName}>{company.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8 },
  closeButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  profileSection: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.borderLight, marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '800', color: Colors.secondary, marginBottom: 4 },
  headline: { fontSize: 16, color: Colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  locationText: { fontSize: 14, color: Colors.textSecondary },
  bio: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 8, paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary, marginBottom: 12 },
  expItem: { flexDirection: 'row', marginBottom: 16 },
  expIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accentSoft, justifyContent: 'center', alignItems: 'center' },
  expContent: { flex: 1, marginLeft: 12 },
  expTitle: { fontSize: 15, fontWeight: '700', color: Colors.secondary },
  expCompany: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  expDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  expDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, lineHeight: 17 },
  jobsRow: { gap: 12, paddingRight: 20 },
  jobTile: { width: 160, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.borderLight },
  jobLogo: { width: 40, height: 40, borderRadius: 10, marginBottom: 10, backgroundColor: Colors.borderLight },
  jobCompany: { fontSize: 12, color: Colors.textTertiary, marginBottom: 4 },
  jobTitle: { fontSize: 14, fontWeight: '700', color: Colors.secondary, lineHeight: 18 },
  companiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  companyChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight },
  companyLogo: { width: 20, height: 20, borderRadius: 4 },
  companyName: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  errorText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
