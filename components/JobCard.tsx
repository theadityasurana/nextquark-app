import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Users, Briefcase, Wifi, Building2, Linkedin, GraduationCap, Factory, Building, FileCheck, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useColors } from '@/contexts/useColors';
import { Job } from '@/types';
import MatchScoreBadge from './MatchScoreBadge';

interface JobCardProps {
  job: Job;
  onViewDetails?: () => void;
  backgroundColor?: string;
  showMatchBadge?: boolean;
}

function getLocationIcon(type: string) {
  if (type === 'remote') return Wifi;
  if (type === 'hybrid') return Building2;
  return MapPin;
}

function getExperienceBanner(level: string): string {
  if (level.toLowerCase().includes('fresher') || level.toLowerCase().includes('entry') || level.toLowerCase().includes('0')) return 'Fresher';
  if (level.toLowerCase().includes('1') || level.toLowerCase().includes('junior')) return '0-1 Years';
  if (level.toLowerCase().includes('mid') && level.toLowerCase().includes('2')) return '2-5 Years';
  if (level.toLowerCase().includes('senior') && level.toLowerCase().includes('5')) return '5+ Years';
  if (level.toLowerCase().includes('senior') && level.toLowerCase().includes('7')) return '7+ Years';
  return level;
}

export default function JobCard({ job, onViewDetails, backgroundColor, showMatchBadge = true }: JobCardProps) {
  const router = useRouter();
  const colors = useColors();
  const LocationIcon = getLocationIcon(job.locationType);
  const expBanner = getExperienceBanner(job.experienceLevel);
  const cardBg = backgroundColor || colors.surfaceElevated;

  const formatSalary = () => {
    if (job.salaryRangeRaw) return job.salaryRangeRaw;
    if (job.salaryMin === 0 && job.salaryMax === 0) return 'Not disclosed';
    const fmt = (n: number) => {
      if (n >= 100000) return `${(n / 1000).toFixed(0)}k`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
      return `${n}`;
    };
    if (job.salaryMin === job.salaryMax) return fmt(job.salaryMin);
    return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)}`;
  };

  const handleLinkedIn = () => {
    if (job.companyLinkedIn) {
      Linking.openURL(job.companyLinkedIn).catch(() => {
        console.log('Could not open LinkedIn URL');
      });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
      <View style={[styles.fixedHeader, { backgroundColor: cardBg }]}>
        {showMatchBadge && (
          <View style={styles.matchBadgeRow}>
            <MatchScoreBadge score={job.matchScore} />
          </View>
        )}
        <Pressable onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: job.companyName } })} style={styles.logoWrapper} hitSlop={4}>
          <Image 
            source={{ uri: job.companyLogo }} 
            style={styles.companyLogo}
            contentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
          />
        </Pressable>
        <View style={styles.companyNameRow}>
          <Pressable onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: job.companyName } })} hitSlop={4}>
            <Text style={[styles.companyName, { color: colors.textPrimary }]}>{job.companyName}</Text>
          </Pressable>
          {job.companyLinkedIn && (
            <Pressable onPress={handleLinkedIn} hitSlop={8}>
              <Linkedin size={16} color="#0A66C2" />
            </Pressable>
          )}
        </View>
        <Text style={[styles.jobTitle, { color: colors.secondary }]} numberOfLines={2}>{job.jobTitle}</Text>
        <View style={styles.locationRow}>
          <LocationIcon size={13} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>{job.location}</Text>
        </View>

        <View style={styles.chipsContainer}>
          {job.industry && (
            <View style={[styles.metaChip, { backgroundColor: '#E8EAF6' }]}>
              <Factory size={12} color="#3F51B5" />
              <Text style={[styles.metaText, { color: '#3F51B5' }]}>{job.industry}</Text>
            </View>
          )}
          {job.companyType && (
            <View style={[styles.metaChip, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.metaText, { color: '#2E7D32' }]}>{job.companyType}</Text>
            </View>
          )}
          <View style={[styles.metaChip, { backgroundColor: '#FFF3E0' }]}>
            <Briefcase size={12} color="#E65100" />
            <Text style={[styles.metaText, { color: '#E65100' }]}>{job.employmentType}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: Colors.primarySoft }]}>
            <LocationIcon size={12} color={Colors.primary} />
            <Text style={[styles.metaText, { color: Colors.primary }]}>{job.locationType}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: '#E3F2FD' }]}>
            <GraduationCap size={12} color="#1565C0" />
            <Text style={[styles.metaText, { color: '#1565C0' }]}>{expBanner}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: Colors.primarySoft }]}>
            <Clock size={12} color={Colors.primary} />
            <Text style={[styles.metaText, { color: Colors.primary }]}>{job.postedDate}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: '#F3E5F5' }]}>
            <Users size={12} color="#7B1FA2" />
            <Text style={[styles.metaText, { color: '#7B1FA2' }]}>{job.applicantsCount} applicants</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: '#EDF5FF' }]}>
            <Text style={[styles.metaText, { color: Colors.secondary }]}>{formatSalary()} /{job.salaryPeriod}</Text>
          </View>
          {job.jobLevel && (
            <View style={[styles.metaChip, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.metaText, { color: '#2E7D32' }]}>{job.jobLevel}</Text>
            </View>
          )}
          {job.jobRequirements && job.jobRequirements.length > 0 && job.jobRequirements.map((req, idx) => (
            <View key={idx} style={[styles.metaChip, { backgroundColor: '#FFF9C4' }]}>
              <Text style={[styles.metaText, { color: '#F57F17' }]}>{req}</Text>
            </View>
          ))}
          {job.educationLevel && (
            <View style={[styles.metaChip, { backgroundColor: '#E3F2FD' }]}>
              <GraduationCap size={12} color="#1565C0" />
              <Text style={[styles.metaText, { color: '#1565C0' }]}>{job.educationLevel}</Text>
            </View>
          )}
          {job.workAuthorization && (
            <View style={[styles.metaChip, { backgroundColor: '#FFF3E0' }]}>
              <Shield size={12} color="#E65100" />
              <Text style={[styles.metaText, { color: '#E65100' }]}>{job.workAuthorization}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>

        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Requirements</Text>
            {job.requirements.slice(0, 4).map((req, idx) => (
              <View key={idx} style={styles.requirementRow}>
                <View style={styles.bullet} />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        {job.skills && job.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Skills</Text>
            <View style={styles.skillsRow}>
              {job.skills.map((skill, idx) => (
                <View key={idx} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Benefits</Text>
            <View style={styles.skillsRow}>
              {job.benefits.map((benefit, idx) => (
                <View key={idx} style={styles.benefitChip}>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(!job.requirements || job.requirements.length === 0) &&
         (!job.skills || job.skills.length === 0) &&
         (!job.benefits || job.benefits.length === 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>About the Role</Text>
            <Text style={[styles.aboutRoleText, { color: colors.textSecondary }]}>{job.description || 'No description available.'}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomGradient} pointerEvents="none" />

      <Pressable style={styles.detailsButton} onPress={onViewDetails}>
        <Text style={styles.detailsButtonText}>View Full Details</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    flex: 1,
    margin: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#000000',
  },
  fixedHeader: { padding: 20, paddingBottom: 12, zIndex: 10, alignItems: 'center' as const },
  matchBadgeRow: { position: 'absolute' as const, top: 16, right: 16, zIndex: 20 },
  logoWrapper: { alignItems: 'center' as const, marginBottom: 10 },
  companyLogo: { width: 144, height: 144, borderRadius: 36, backgroundColor: Colors.borderLight },
  companyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  companyName: { fontSize: 17, fontWeight: '700' as const, color: Colors.textPrimary, textAlign: 'center' as const },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { fontSize: 13, color: Colors.textSecondary },
  jobTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.secondary, lineHeight: 30, textAlign: 'center' as const, marginBottom: 4 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' as const, marginTop: 4 },
  scrollContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  metaText: { fontSize: 12, fontWeight: '500' as const },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.secondary, marginBottom: 8 },
  requirementRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 8 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6, marginRight: 10 },
  requirementText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  skillText: { fontSize: 12, color: Colors.textInverse, fontWeight: '600' as const },
  benefitChip: { backgroundColor: Colors.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  benefitText: { fontSize: 12, color: Colors.accent, fontWeight: '600' as const },
  aboutRoleText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  bottomGradient: {
    position: 'absolute' as const,
    bottom: 60,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    opacity: 0.95,
    shadowColor: Colors.surface,
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  detailsButton: { margin: 16, marginTop: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: '#111111', borderRadius: 12 },
  detailsButtonText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
});
