import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Users, Briefcase, Wifi, Building2, Linkedin, GraduationCap, Factory } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Job } from '@/types';
import MatchScoreBadge from './MatchScoreBadge';

interface JobCardProps {
  job: Job;
  onViewDetails?: () => void;
  backgroundColor?: string;
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

export default function JobCard({ job, onViewDetails, backgroundColor }: JobCardProps) {
  const router = useRouter();
  const LocationIcon = getLocationIcon(job.locationType);
  const expBanner = getExperienceBanner(job.experienceLevel);

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
    <View style={[styles.card, backgroundColor && { backgroundColor }]}>
      <View style={[styles.fixedHeader, backgroundColor && { backgroundColor }]}>
        <View style={styles.companyRow}>
          <Pressable onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: job.companyName } })} hitSlop={4}>
            <Image 
              source={{ uri: job.companyLogo }} 
              style={styles.companyLogo}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
            />
          </Pressable>
          <View style={styles.companyInfo}>
            <View style={styles.companyNameRow}>
              <Pressable onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: job.companyName } })} hitSlop={4}>
                <Text style={styles.companyName}>{job.companyName}</Text>
              </Pressable>
              {job.companyLinkedIn && (
                <Pressable onPress={handleLinkedIn} hitSlop={8}>
                  <Linkedin size={14} color="#0A66C2" />
                </Pressable>
              )}
            </View>
            <View style={styles.locationRow}>
              <LocationIcon size={13} color={Colors.textSecondary} />
              <Text style={styles.locationText}>{job.location}</Text>
            </View>
          </View>
          <View style={styles.matchAndExp}>
            <MatchScoreBadge score={job.matchScore} />
          </View>
        </View>
        {job.industry && (
          <View style={styles.industryRow}>
            <View style={styles.industryChip}>
              <Factory size={11} color="#3F51B5" />
              <Text style={styles.industryText}>{job.industry}</Text>
            </View>
          </View>
        )}
        <Text style={styles.jobTitle} numberOfLines={2}>{job.jobTitle}</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <View style={styles.metaSectionContainer}>
          <Text style={styles.metaSectionTitle}>Job Details</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: '#FFF3E0' }]}>
              <Briefcase size={12} color="#E65100" />
              <Text style={[styles.metaText, { color: '#E65100' }]}>{job.employmentType}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: Colors.primarySoft }]}>
              <LocationIcon size={12} color={Colors.primary} />
              <Text style={[styles.metaText, { color: Colors.primary }]}>{job.locationType}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaSectionContainer}>
          <Text style={styles.metaSectionTitle}>Experience Level</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: '#E3F2FD' }]}>
              <GraduationCap size={12} color="#1565C0" />
              <Text style={[styles.metaText, { color: '#1565C0' }]}>{expBanner}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaSectionContainer}>
          <Text style={styles.metaSectionTitle}>Posted & Applicants</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: Colors.primarySoft }]}>
              <Clock size={12} color={Colors.primary} />
              <Text style={[styles.metaText, { color: Colors.primary }]}>{job.postedDate}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: '#F3E5F5' }]}>
              <Users size={12} color="#7B1FA2" />
              <Text style={[styles.metaText, { color: '#7B1FA2' }]}>{job.applicantsCount} applicants</Text>
            </View>
          </View>
        </View>

        {(job.jobLevel || job.jobRequirements) && (
          <View style={styles.metaSectionContainer}>
            <Text style={styles.metaSectionTitle}>Additional Info</Text>
            <View style={styles.metaRow}>
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
            </View>
          </View>
        )}

        <View style={styles.metaSectionContainer}>
          <Text style={styles.metaSectionTitle}>Compensation</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: '#EDF5FF' }]}>
              <Text style={[styles.metaText, { color: Colors.secondary }]}>{formatSalary()} /{job.salaryPeriod}</Text>
            </View>
          </View>
        </View>

        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {job.requirements.slice(0, 4).map((req, idx) => (
              <View key={idx} style={styles.requirementRow}>
                <View style={styles.bullet} />
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        {job.skills && job.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
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
            <Text style={styles.sectionTitle}>Benefits</Text>
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
            <Text style={styles.sectionTitle}>About the Role</Text>
            <Text style={styles.aboutRoleText}>{job.description || 'No description available.'}</Text>
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
    borderRadius: 0,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  fixedHeader: { padding: 20, paddingBottom: 12, zIndex: 10 },
  companyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  companyLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.borderLight },
  companyInfo: { flex: 1, marginLeft: 12 },
  companyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  companyName: { fontSize: 17, fontWeight: '700' as const, color: Colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  locationText: { fontSize: 12, color: Colors.textPrimary },
  industryRow: { marginBottom: 8, marginTop: -4 },
  industryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8EAF6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  industryText: { fontSize: 11, color: '#3F51B5', fontWeight: '600' as const },
  industryRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  industryTextCompact: { fontSize: 11, color: '#3F51B5', fontWeight: '600' as const },
  matchAndExp: { alignItems: 'flex-end', gap: 4 },
  jobTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.secondary, lineHeight: 30 },
  scrollContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  metaSectionContainer: { marginBottom: 10 },
  metaSectionTitle: { fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
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
