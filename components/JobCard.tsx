import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Animated, Share } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Users, Briefcase, Wifi, Building2, Linkedin, GraduationCap, Factory, Shield, Camera, Globe, ExternalLink, Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useColors } from '@/contexts/useColors';
import { Job } from '@/types';
import MatchScoreBadge from './MatchScoreBadge';

interface JobCardProps {
  job: Job;
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

export default function JobCard({ job, backgroundColor, showMatchBadge = true }: JobCardProps) {
  const router = useRouter();
  const colors = useColors();
  const LocationIcon = getLocationIcon(job.locationType);
  const expBanner = getExperienceBanner(job.experienceLevel);
  const cardBg = backgroundColor || colors.surfaceElevated;

  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = useCallback(() => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  }, [isFlipped, flipAnim]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['180deg', '270deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const formatSalary = () => {
    if (job.salaryRangeRaw) return job.salaryRangeRaw;
    if (job.salaryMin === 0 && job.salaryMax === 0) return 'Not disclosed';
    const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`);
    if (job.salaryMin === job.salaryMax) return fmt(job.salaryMin);
    return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)}`;
  };

  const renderFront = () => (
    <Animated.View
      style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border, transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOpacity }, styles.cardFace]}
      pointerEvents={isFlipped ? 'none' : 'auto'}
    >
      {/* Single ScrollView — header tappable to flip, content scrollable */}
      <ScrollView style={styles.frontScrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Pressable onPress={handleFlip}>
        <View style={[styles.fixedHeader, { backgroundColor: cardBg }]}>
          {showMatchBadge && (
            <View style={styles.matchBadgeRow}>
              <MatchScoreBadge score={job.matchScore} />
            </View>
          )}
          <Pressable onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: job.companyName } })} style={styles.logoWrapper} hitSlop={4}>
            <Image source={{ uri: job.companyLogo }} style={styles.companyLogo} contentFit="contain" transition={200} cachePolicy="memory-disk" />
          </Pressable>
          <View style={styles.companyNameRow}>
            <Pressable onPress={() => router.push({ pathname: '/company-profile' as any, params: { companyName: job.companyName } })} hitSlop={4}>
              <Text style={[styles.companyName, { color: colors.textPrimary }]}>{job.companyName}</Text>
            </Pressable>
            {job.companyLinkedIn && (
              <Pressable onPress={() => Linking.openURL(job.companyLinkedIn!).catch(() => {})} hitSlop={8}>
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
            {job.industry && (<View style={[styles.metaChip, { backgroundColor: '#E8EAF6' }]}><Factory size={12} color="#3F51B5" /><Text style={[styles.metaText, { color: '#3F51B5' }]}>{job.industry}</Text></View>)}
            {job.companyType && (<View style={[styles.metaChip, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.metaText, { color: '#2E7D32' }]}>{job.companyType}</Text></View>)}
            <View style={[styles.metaChip, { backgroundColor: '#FFF3E0' }]}><Briefcase size={12} color="#E65100" /><Text style={[styles.metaText, { color: '#E65100' }]}>{job.employmentType}</Text></View>
            <View style={[styles.metaChip, { backgroundColor: Colors.primarySoft }]}><LocationIcon size={12} color={Colors.primary} /><Text style={[styles.metaText, { color: Colors.primary }]}>{job.locationType}</Text></View>
            <View style={[styles.metaChip, { backgroundColor: '#E3F2FD' }]}><GraduationCap size={12} color="#1565C0" /><Text style={[styles.metaText, { color: '#1565C0' }]}>{expBanner}</Text></View>
            <View style={[styles.metaChip, { backgroundColor: Colors.primarySoft }]}><Clock size={12} color={Colors.primary} /><Text style={[styles.metaText, { color: Colors.primary }]}>{job.postedDate}</Text></View>
            <View style={[styles.metaChip, { backgroundColor: '#F3E5F5' }]}><Users size={12} color="#7B1FA2" /><Text style={[styles.metaText, { color: '#7B1FA2' }]}>{job.applicantsCount} applicants</Text></View>
            <View style={[styles.metaChip, { backgroundColor: '#EDF5FF' }]}><Text style={[styles.metaText, { color: Colors.secondary }]}>{formatSalary()} /{job.salaryPeriod}</Text></View>
            {job.jobLevel && (<View style={[styles.metaChip, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.metaText, { color: '#2E7D32' }]}>{job.jobLevel}</Text></View>)}
            {job.jobRequirements?.map((req, i) => (<View key={i} style={[styles.metaChip, { backgroundColor: '#FFF9C4' }]}><Text style={[styles.metaText, { color: '#F57F17' }]}>{req}</Text></View>))}
            {job.educationLevel && (<View style={[styles.metaChip, { backgroundColor: '#E3F2FD' }]}><GraduationCap size={12} color="#1565C0" /><Text style={[styles.metaText, { color: '#1565C0' }]}>{job.educationLevel}</Text></View>)}
            {job.workAuthorization && (<View style={[styles.metaChip, { backgroundColor: '#FFF3E0' }]}><Shield size={12} color="#E65100" /><Text style={[styles.metaText, { color: '#E65100' }]}>{job.workAuthorization}</Text></View>)}
          </View>
        </View>
        </Pressable>

        <View style={styles.frontInnerPadding}>
        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Requirements</Text>
            {job.requirements.slice(0, 4).map((req, i) => (
              <View key={i} style={styles.requirementRow}>
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
              {job.skills.map((s, i) => (<View key={i} style={styles.skillChip}><Text style={styles.skillText}>{s}</Text></View>))}
            </View>
          </View>
        )}
        {job.benefits && job.benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Benefits</Text>
            <View style={styles.skillsRow}>
              {job.benefits.map((b, i) => (<View key={i} style={styles.benefitChip}><Text style={styles.benefitText}>{b}</Text></View>))}
            </View>
          </View>
        )}
        {(!job.requirements || !job.requirements.length) && (!job.skills || !job.skills.length) && (!job.benefits || !job.benefits.length) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>About the Role</Text>
            <Text style={[styles.aboutRoleText, { color: colors.textSecondary }]}>{job.description || 'No description available.'}</Text>
          </View>
        )}
        <View style={{ height: 50 }} />
        </View>
      </ScrollView>

      <Pressable onPress={handleFlip} style={[styles.frontHintBar, { backgroundColor: cardBg }]}>
        <Text style={styles.tapHintText}>Tap to see full details</Text>
      </Pressable>
    </Animated.View>
  );

  const renderBack = () => (
    <Animated.View
      style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border, transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOpacity }, styles.cardFace, styles.cardBack]}
      pointerEvents={isFlipped ? 'auto' : 'none'}
    >
      {/* Scrollable detail content — tap anywhere to flip back */}
      <ScrollView style={styles.backScrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Pressable onPress={handleFlip}>
        <View style={[styles.backHeader, { backgroundColor: cardBg }]}>
          <Image source={{ uri: job.companyLogo }} style={styles.backLogo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.backCompanyName, { color: colors.textPrimary }]}>{job.companyName}</Text>
            <Text style={[styles.backJobTitle, { color: colors.secondary }]} numberOfLines={2}>{job.jobTitle}</Text>
          </View>
          <Pressable
            style={styles.backShareBtn}
            onPress={() => { Share.share({ message: `${job.jobTitle} at ${job.companyName}${job.portalUrl ? `\n${job.portalUrl}` : ''}` }).catch(() => {}); }}
            hitSlop={8}
          >
            <Share2 size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.backInnerPadding}>
        <View style={styles.infoCards}>
          <View style={[styles.infoCard, { backgroundColor: '#FFF8F0' }]}><Briefcase size={16} color="#E65100" /><Text style={styles.infoLabel}>Type</Text><Text style={styles.infoValue}>{job.employmentType}</Text></View>
          <View style={[styles.infoCard, { backgroundColor: '#EDF5FF' }]}><Clock size={16} color="#1565C0" /><Text style={styles.infoLabel}>Level</Text><Text style={styles.infoValue} numberOfLines={1}>{job.experienceLevel}</Text></View>
          <View style={[styles.infoCard, { backgroundColor: '#F3E8FF' }]}><Users size={16} color="#7B1FA2" /><Text style={styles.infoLabel}>Applicants</Text><Text style={styles.infoValue}>{job.applicantsCount}</Text></View>
        </View>

        {job.companySize && (
          <View style={styles.companySizeCard}>
            <Building2 size={16} color="#059669" />
            <View style={{ flex: 1 }}><Text style={styles.companySizeLabel}>Company Size</Text><Text style={styles.companySizeValue}>{job.companySize} employees</Text></View>
          </View>
        )}

        {job.description ? (
          <View style={styles.backSection}><Text style={[styles.backSectionTitle, { color: colors.secondary }]}>About the Role</Text><Text style={[styles.backDescText, { color: colors.textSecondary }]}>{job.description}</Text></View>
        ) : null}

        {job.companyDescription ? (
          <View style={styles.backSection}><Text style={[styles.backSectionTitle, { color: colors.secondary }]}>About {job.companyName}</Text><Text style={[styles.backDescText, { color: colors.textSecondary }]}>{job.companyDescription}</Text></View>
        ) : null}

        {job.detailedRequirements ? (
          <View style={styles.backSection}><Text style={[styles.backSectionTitle, { color: colors.secondary }]}>Detailed Requirements</Text><Text style={[styles.backDescText, { color: colors.textSecondary }]}>{job.detailedRequirements}</Text></View>
        ) : null}

        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.backSection}>
            <Text style={[styles.backSectionTitle, { color: colors.secondary }]}>Key Requirements</Text>
            {job.requirements.map((req, i) => (
              <View key={i} style={styles.reqRow}><View style={[styles.reqBullet, { backgroundColor: colors.accent }]} /><Text style={[styles.reqText, { color: colors.textSecondary }]}>{req}</Text></View>
            ))}
          </View>
        )}

        {job.culturePhotos && job.culturePhotos.length > 0 && (
          <View style={styles.backSection}>
            <View style={styles.cultureHeader}><Camera size={16} color={Colors.secondary} /><Text style={[styles.backSectionTitle, { color: colors.secondary, marginBottom: 0 }]}>Work Culture</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {job.culturePhotos.map((p, i) => (<Image key={i} source={{ uri: p }} style={styles.culturePhoto} contentFit="cover" />))}
            </ScrollView>
          </View>
        )}

        {job.skills && job.skills.length > 0 && (
          <View style={styles.backSection}>
            <Text style={[styles.backSectionTitle, { color: colors.secondary }]}>Skills</Text>
            <View style={styles.tagsWrap}>{job.skills.map((s, i) => (<View key={i} style={[styles.backSkillTag, { backgroundColor: colors.surface }]}><Text style={[styles.backSkillTagText, { color: colors.textPrimary }]}>{s}</Text></View>))}</View>
          </View>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <View style={styles.backSection}>
            <Text style={[styles.backSectionTitle, { color: colors.secondary }]}>Benefits</Text>
            <View style={styles.tagsWrap}>{job.benefits.map((b, i) => (<View key={i} style={[styles.backBenefitTag, { backgroundColor: colors.surface }]}><Text style={[styles.backBenefitTagText, { color: colors.textPrimary }]}>{b}</Text></View>))}</View>
          </View>
        )}

        {job.portal && (
          <View style={styles.backSection}>
            <Text style={[styles.backSectionTitle, { color: colors.secondary }]}>Apply Via</Text>
            <Pressable style={styles.portalCard} onPress={() => { if (job.portalUrl) Linking.openURL(job.portalUrl).catch(() => {}); }}>
              <Globe size={16} color={Colors.primary} />
              <View style={{ flex: 1 }}><Text style={styles.portalName}>{job.portal}</Text>{job.portalUrl && <Text style={styles.portalUrl} numberOfLines={1}>{job.portalUrl}</Text>}</View>
              {job.portalUrl && <ExternalLink size={14} color={Colors.textTertiary} />}
            </Pressable>
          </View>
        )}

        {job.companyWebsite && (
          <Pressable style={styles.websiteCard} onPress={() => { const u = job.companyWebsite!; Linking.openURL(u.startsWith('http') ? u : `https://${u}`).catch(() => {}); }}>
            <Globe size={14} color={Colors.primary} /><Text style={styles.websiteText}>Visit Company Website</Text><ExternalLink size={12} color={Colors.textTertiary} />
          </Pressable>
        )}

        {job.deadline && (
          <View style={styles.deadlineCard}><Clock size={14} color={Colors.warning} /><Text style={styles.deadlineText}>Deadline: {job.deadline}</Text></View>
        )}

        <View style={{ height: 50 }} />
        </View>
        </Pressable>
      </ScrollView>

      <Pressable onPress={handleFlip} style={[styles.backHintBar, { backgroundColor: cardBg }]}>
        <Text style={styles.tapHintText}>Tap anywhere to go back</Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.flipContainer}>
      {renderBack()}
      {renderFront()}
    </View>
  );
}

const styles = StyleSheet.create({
  flipContainer: { flex: 1, margin: 10 },
  cardFace: { backfaceVisibility: 'hidden' },
  cardBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    flex: 1,
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
  companyName: { fontSize: 17, fontWeight: '700' as const, textAlign: 'center' as const },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { fontSize: 13 },
  jobTitle: { fontSize: 24, fontWeight: '800' as const, lineHeight: 30, textAlign: 'center' as const, marginBottom: 4 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' as const, marginTop: 4 },
  scrollContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  frontScrollContent: { flex: 1 },
  frontInnerPadding: { paddingHorizontal: 20, paddingTop: 8 },
  backScrollContent: { flex: 1 },
  backInnerPadding: { paddingHorizontal: 20, paddingTop: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  metaText: { fontSize: 12, fontWeight: '500' as const },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700' as const, marginBottom: 8 },
  requirementRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 8 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6, marginRight: 10 },
  requirementText: { flex: 1, fontSize: 13, lineHeight: 18 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  skillText: { fontSize: 12, color: Colors.textInverse, fontWeight: '600' as const },
  benefitChip: { backgroundColor: Colors.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  benefitText: { fontSize: 12, color: Colors.accent, fontWeight: '600' as const },
  aboutRoleText: { fontSize: 13, lineHeight: 20 },
  tapHintBar: { paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  frontHintBar: { paddingVertical: 10, alignItems: 'center', position: 'absolute' as const, bottom: 0, left: 0, right: 0 },
  backHintBar: { paddingVertical: 10, alignItems: 'center', position: 'absolute' as const, bottom: 0, left: 0, right: 0 },
  tapHintText: { fontSize: 12, fontWeight: '600' as const, color: '#888', letterSpacing: 0.3 },
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8 },
  backLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.borderLight },
  backShareBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  backCompanyName: { fontSize: 14, fontWeight: '700' as const },
  backJobTitle: { fontSize: 18, fontWeight: '800' as const, lineHeight: 22, marginTop: 2 },
  infoCards: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  infoCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  infoLabel: { fontSize: 10, color: '#666', fontWeight: '500' as const },
  infoValue: { fontSize: 12, fontWeight: '700' as const, color: '#000', textAlign: 'center' },
  companySizeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 12 },
  companySizeLabel: { fontSize: 11, color: '#065F46', fontWeight: '600' as const },
  companySizeValue: { fontSize: 13, fontWeight: '700' as const, color: '#059669' },
  backSection: { marginBottom: 16 },
  backSectionTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 8 },
  backDescText: { fontSize: 13, lineHeight: 20 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  reqBullet: { width: 5, height: 5, borderRadius: 3, marginTop: 6, marginRight: 10 },
  reqText: { flex: 1, fontSize: 13, lineHeight: 19 },
  cultureHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  culturePhoto: { width: 180, height: 120, borderRadius: 12, marginRight: 8, backgroundColor: '#EEE' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  backSkillTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backSkillTagText: { fontSize: 12, fontWeight: '600' as const },
  backBenefitTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backBenefitTagText: { fontSize: 12, fontWeight: '600' as const },
  portalCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E3F2FD' },
  portalName: { fontSize: 14, fontWeight: '600' as const, color: '#000' },
  portalUrl: { fontSize: 11, color: '#888', marginTop: 2 },
  websiteCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F7FF', borderRadius: 10, padding: 12, marginBottom: 12 },
  websiteText: { flex: 1, fontSize: 13, fontWeight: '600' as const, color: '#000' },
  deadlineCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', padding: 12, borderRadius: 10, marginBottom: 12 },
  deadlineText: { fontSize: 13, color: '#000', fontWeight: '600' as const },
});
