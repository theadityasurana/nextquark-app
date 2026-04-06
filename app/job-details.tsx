import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Alert, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { X, MapPin, Briefcase, Clock, Users, Heart, Bookmark, Share2, Wifi, Building2, Camera, ExternalLink, Globe } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import { fetchJobById, incrementRightSwipe, addToLiveApplicationQueue } from '@/lib/jobs';
import { useAuth } from '@/contexts/AuthContext';
import { decrementApplicationCount } from '@/lib/subscription';
import { useQueryClient } from '@tanstack/react-query';

export default function JobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, hideApply } = useLocalSearchParams<{ id: string; hideApply?: string }>();
  const { supabaseUserId, userProfile, addSwipedJobId } = useAuth();
  const queryClient = useQueryClient();
  const colors = useColors();

  const [isSaved, setIsSaved] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { data: supabaseJob, isLoading } = useQuery({
    queryKey: ['job-detail', id],
    queryFn: () => fetchJobById(id || ''),
    enabled: !!id,
  });

  const job = supabaseJob;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.surface }]}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const LocationIcon = job.locationType === 'remote' ? Wifi : job.locationType === 'hybrid' ? Building2 : MapPin;

  const handleApplyNow = async () => {
    if (!job || isApplying) return;
    
    setIsApplying(true);
    addSwipedJobId(job.id);
    
    await incrementRightSwipe(job.id);

    if (supabaseUserId) {
      decrementApplicationCount(supabaseUserId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['subscription-status', supabaseUserId] });
      });
    }
    
    if (supabaseUserId && userProfile) {
      await addToLiveApplicationQueue(supabaseUserId, job, userProfile);
    }
    
    Alert.alert('Applied!', `Successfully applied to ${job.jobTitle} at ${job.companyName}`);
    setIsApplying(false);
    router.back();
  };

  const formatSalary = () => {
    if (job.salaryRangeRaw) return job.salaryRangeRaw;
    const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`);
    return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable style={[styles.closeButton, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable style={[styles.headerActionBtn, { backgroundColor: colors.surface }]}>
            <Share2 size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable style={[styles.headerActionBtn, { backgroundColor: colors.surface }]} onPress={() => {
            setIsSaved(!isSaved);
            Alert.alert(isSaved ? 'Removed' : 'Saved', isSaved ? 'Job removed from saved jobs.' : 'Job saved successfully!');
            console.log(isSaved ? 'Job unsaved:' : 'Job saved:', job?.jobTitle);
          }}>
            <Bookmark size={20} color={isSaved ? '#111111' : colors.textSecondary} fill={isSaved ? '#111111' : 'transparent'} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topSection}>
          <Image source={{ uri: job.companyLogo }} style={styles.logo} />
          <Text style={[styles.companyName, { color: colors.textPrimary }]}>{job.companyName}</Text>
          <Text style={[styles.jobTitle, { color: colors.secondary }]}>{job.jobTitle}</Text>
          <View style={styles.locationRow}>
            <LocationIcon size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>{job.location}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{job.locationType}</Text>
            </View>
          </View>

        </View>

        <View style={styles.infoCards}>
          <View style={[styles.infoCard, { backgroundColor: '#FFF8F0' }]}>
            <Briefcase size={18} color="#E65100" />
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{job.employmentType}</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: '#EDF5FF' }]}>
            <Clock size={18} color="#1565C0" />
            <Text style={styles.infoLabel}>Level</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{job.experienceLevel}</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: '#F3E8FF' }]}>
            <Users size={18} color="#7B1FA2" />
            <Text style={styles.infoLabel}>Applicants</Text>
            <Text style={styles.infoValue}>{job.applicantsCount}</Text>
          </View>
        </View>

        {job.companySize && (
          <View style={styles.companySizeCard}>
            <Building2 size={18} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.companySizeLabel}>Company Size</Text>
              <Text style={styles.companySizeValue}>{job.companySize} employees</Text>
            </View>
          </View>
        )}



        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondary }]}>About the Role</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{job.description}</Text>
        </View>

        {job.companyDescription && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>About {job.companyName}</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{job.companyDescription}</Text>
          </View>
        )}

        {job.detailedRequirements ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Detailed Requirements</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{job.detailedRequirements}</Text>
          </View>
        ) : null}

        {job.requirements && job.requirements.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Key Requirements</Text>
            {job.requirements.map((req, idx) => (
              <View key={idx} style={styles.reqRow}>
                <View style={[styles.reqBullet, { backgroundColor: colors.accent }]} />
                <Text style={[styles.reqText, { color: colors.textSecondary }]}>{req}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {job.culturePhotos && job.culturePhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.cultureHeader}>
              <Camera size={18} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>Work Culture & Office</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {job.culturePhotos.map((photo, idx) => (
                <Image key={idx} source={{ uri: photo }} style={styles.culturePhoto} contentFit="cover" />
              ))}
            </ScrollView>
          </View>
        )}

        {job.skills && job.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Skills</Text>
            <View style={styles.tagsWrap}>
              {job.skills.map((skill, idx) => (
                <View key={idx} style={[styles.skillTag, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.skillTagText, { color: colors.textPrimary }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Benefits</Text>
          <View style={styles.tagsWrap}>
            {job.benefits.map((benefit, idx) => (
              <View key={idx} style={[styles.benefitTag, { backgroundColor: colors.surface }]}>
                <Text style={[styles.benefitTagText, { color: colors.textPrimary }]}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        {job.portal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apply Via</Text>
            <Pressable
              style={styles.portalCard}
              onPress={() => {
                if (job.portalUrl) {
                  Linking.openURL(job.portalUrl).catch(() => console.log('Could not open portal URL'));
                }
              }}
            >
              <Globe size={18} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.portalName}>{job.portal}</Text>
                {job.portalUrl && <Text style={styles.portalUrl} numberOfLines={1}>{job.portalUrl}</Text>}
              </View>
              {job.portalUrl && <ExternalLink size={16} color={Colors.textTertiary} />}
            </Pressable>
          </View>
        )}

        {job.companyWebsite && (
          <Pressable
            style={styles.websiteCard}
            onPress={() => {
              console.log('Opening website:', job.companyWebsite);
              const url = job.companyWebsite!;
              // Ensure URL has protocol
              const formattedUrl = url.startsWith('http://') || url.startsWith('https://') 
                ? url 
                : `https://${url}`;
              console.log('Formatted URL:', formattedUrl);
              Linking.openURL(formattedUrl).catch((err) => {
                console.log('Could not open website:', err);
                Alert.alert('Error', 'Could not open website. Please check the URL.');
              });
            }}
          >
            <Globe size={16} color={Colors.primary} />
            <Text style={styles.websiteText}>Visit Company Website</Text>
            <ExternalLink size={14} color={Colors.textTertiary} />
          </Pressable>
        )}

        {job.deadline && (
          <View style={styles.deadlineCard}>
            <Clock size={16} color={Colors.warning} />
            <Text style={styles.deadlineText}>Application deadline: {job.deadline}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {hideApply !== 'true' && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
          <Pressable style={[styles.passBtn, { backgroundColor: '#EF4444' }]}>
            <X size={22} color="#FFFFFF" />
            <Text style={[styles.passBtnText, { color: '#FFFFFF' }]}>Pass</Text>
          </Pressable>
          <Pressable style={[styles.applyBtn, { backgroundColor: '#10B981' }]} onPress={handleApplyNow} disabled={isApplying}>
            <Heart size={22} color="#FFFFFF" />
            <Text style={[styles.applyBtnText, { color: '#FFFFFF' }]}>{isApplying ? 'Applying...' : 'Apply Now'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#FFF",
    marginBottom: 14,
  },
  companyName: {
    fontSize: 14,
    color: "#000",
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: "#000",
    textAlign: 'center',
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  locationText: {
    fontSize: 14,
    color: "#000",
  },
  typeBadge: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    color: "#000",
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: "#000",
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: "#000",
    textAlign: 'center',
  },

  companySizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  companySizeLabel: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  companySizeValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#059669',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: "#000",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: "#000",
    lineHeight: 23,
  },
  cultureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  photosScroll: {
    marginHorizontal: -4,
  },
  culturePhoto: {
    width: 220,
    height: 150,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: "#FFF",
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reqBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 12,
  },
  reqText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  skillTagText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  benefitTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  benefitTagText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
  },
  deadlineText: {
    fontSize: 14,
    color: "#000",
    fontWeight: '600' as const,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  passBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  passBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  errorText: {
    fontSize: 16,
    color: "#000",
    textAlign: 'center',
    marginTop: 40,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  portalName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: "#000",
  },
  portalUrl: {
    fontSize: 12,
    color: "#000",
    marginTop: 2,
  },
  websiteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  websiteText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: "#000",
  },
});
