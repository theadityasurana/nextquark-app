import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image as RNImage, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  Star,
  Link2,
  Target,
  FileText,
  Trophy,
  Linkedin,
  Github,
  Share2,
  DollarSign,
} from '@/components/ProfileIcons';
import { darkColors } from '@/constants/colors';
import { CURRENCIES } from '@/constants/cities';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePreviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile } = useAuth();
  const colors = darkColors;
  const user = userProfile;

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <Text style={styles.emptyText}>No profile data available</Text>
      </View>
    );
  }

  const currencySymbol = CURRENCIES.find((c) => c.code === user.salaryCurrency)?.symbol ?? '$';
  const formatSalary = (v: number) => {
    if (v >= 1000000) return `${currencySymbol}${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${currencySymbol}${(v / 1000).toFixed(0)}k`;
    return `${currencySymbol}${v}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', colors.background]} style={styles.heroGradientHeader}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Profile Preview</Text>
          <Pressable style={styles.backBtn} onPress={() => Share.share({ message: `Check out ${user?.name}'s profile on NextQuark!`, title: 'Share Profile' })}>
            <Share2 size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=200&fit=crop' }} style={styles.heroBanner} />
        <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>This is how recruiters see your profile</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.headline}>{user.headline}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.locationText}>{user.location}</Text>
          </View>
        </View>

        {user.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        ) : null}

        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Mail size={16} color="#111111" />
            </View>
            <Text style={styles.contactText}>{user.email}</Text>
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Phone size={16} color="#111111" />
            </View>
            <Text style={styles.contactText}>{user.phone}</Text>
          </View>
          {user.linkedinUrl ? (
            <>
              <View style={styles.contactDivider} />
              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <Linkedin size={16} color="#111111" />
                </View>
                <Text style={styles.contactText} numberOfLines={1}>{user.linkedinUrl}</Text>
              </View>
            </>
          ) : null}
          {user.githubUrl ? (
            <>
              <View style={styles.contactDivider} />
              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <Github size={16} color="#111111" />
                </View>
                <Text style={styles.contactText} numberOfLines={1}>{user.githubUrl}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.contactDivider} />
          <Pressable style={styles.resumeButton}>
            <FileText size={18} color={colors.surface} />
            <Text style={styles.resumeButtonText}>Resume</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user.totalApplications}</Text>
            <Text style={styles.statLabel}>Applied</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user.interviewsScheduled}</Text>
            <Text style={styles.statLabel}>Interviews</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user.matchRate}%</Text>
            <Text style={styles.statLabel}>Match</Text>
          </View>
        </View>

        {user.jobPreferences.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Target size={18} color={colors.secondary} />
              <Text style={styles.cardTitle}>Job Preferences</Text>
            </View>
            <View style={styles.prefsWrap}>
              {user.jobPreferences.map((pref, idx) => (
                <View key={idx} style={styles.prefChip}>
                  <Text style={styles.prefChipText}>{pref}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.cardHeader}>
            <DollarSign size={18} color="#FFFFFF" />
            <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Salary Expectation</Text>
          </View>
          <Text style={styles.salaryText}>
            {formatSalary(user.salaryMinPref)} — {formatSalary(user.salaryMaxPref)} / year
          </Text>
        </View>

        {user.topSkills.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Star size={18} color="#D4A017" />
              <Text style={styles.cardTitle}>Top Skills</Text>
            </View>
            <View style={styles.skillsWrap}>
              {user.topSkills.map((skill, idx) => (
                <View key={idx} style={styles.topSkillChip}>
                  <Star size={12} color="#D4A017" />
                  <Text style={styles.topSkillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Award size={18} color={colors.secondary} />
            <Text style={styles.cardTitle}>All Skills</Text>
          </View>
          <View style={styles.skillsWrap}>
            {user.skills.map((skill, idx) => (
              <View key={idx} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Briefcase size={18} color={colors.secondary} />
            <Text style={styles.cardTitle}>Experience</Text>
          </View>
          {user.experience.map((exp, idx) => (
            <View key={exp.id} style={[styles.timelineItem, idx === user.experience.length - 1 && styles.lastTimelineItem]}>
              <View style={styles.timelineDot} />
              {idx < user.experience.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{exp.title}</Text>
                <Text style={styles.timelineCompany}>{exp.company}</Text>
                {exp.jobLocation ? (
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={colors.textTertiary} />
                    <Text style={styles.jobLocationText}>{exp.jobLocation}</Text>
                  </View>
                ) : null}
                <Text style={styles.timelineDate}>
                  {exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}
                </Text>
                {exp.description ? (
                  <Text style={styles.timelineDesc}>{exp.description}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <GraduationCap size={18} color={colors.secondary} />
            <Text style={styles.cardTitle}>Education</Text>
          </View>
          {user.education.map((edu, idx) => (
            <View key={edu.id} style={[styles.timelineItem, idx === user.education.length - 1 && styles.lastTimelineItem]}>
              <View style={[styles.timelineDot, { backgroundColor: "#FFF" }]} />
              {idx < user.education.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{edu.degree} in {edu.field}</Text>
                <Text style={styles.timelineCompany}>{edu.institution}</Text>
                <Text style={styles.timelineDate}>{edu.startDate} — {edu.endDate}</Text>
                {edu.description ? (
                  <Text style={styles.timelineDesc}>{edu.description}</Text>
                ) : null}
                {edu.achievements ? (
                  <View style={styles.eduExtraSection}>
                    <Text style={styles.eduExtraLabel}>Achievements</Text>
                    <Text style={styles.timelineDesc}>{edu.achievements}</Text>
                  </View>
                ) : null}
                {edu.extracurriculars ? (
                  <View style={styles.eduExtraSection}>
                    <Text style={styles.eduExtraLabel}>Extracurriculars</Text>
                    <Text style={styles.timelineDesc}>{edu.extracurriculars}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {user.coverLetter ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FileText size={18} color={colors.secondary} />
              <Text style={styles.cardTitle}>Cover Letter</Text>
            </View>
            <Text style={styles.bioText}>{user.coverLetter}</Text>
          </View>
        ) : null}

        {(user.veteranStatus || user.disabilityStatus || user.ethnicity || user.gender || user.workAuthorizationStatus) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Award size={18} color={colors.secondary} />
              <Text style={styles.cardTitle}>Additional Information</Text>
            </View>
            {user.workAuthorizationStatus ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Work Authorization:</Text>
                <Text style={styles.infoValue}>{user.workAuthorizationStatus}</Text>
              </View>
            ) : null}
            {user.veteranStatus ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Veteran Status:</Text>
                <Text style={styles.infoValue}>{user.veteranStatus}</Text>
              </View>
            ) : null}
            {user.disabilityStatus ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Disability Status:</Text>
                <Text style={styles.infoValue}>{user.disabilityStatus}</Text>
              </View>
            ) : null}
            {user.ethnicity ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ethnicity:</Text>
                <Text style={styles.infoValue}>{user.ethnicity}</Text>
              </View>
            ) : null}
            {user.gender ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gender:</Text>
                <Text style={styles.infoValue}>{user.gender}</Text>
              </View>
            ) : null}
          </View>
        )}

        {user.achievements && user.achievements.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Trophy size={18} color="#D4A017" />
              <Text style={styles.cardTitle}>Achievements & Honors</Text>
            </View>
            {user.achievements.map((ach, idx) => (
              <View key={ach.id} style={[styles.certItem, idx < user.achievements.length - 1 && styles.certItemBorder]}>
                <Text style={styles.certName}>{ach.title}</Text>
                <Text style={styles.certOrg}>{ach.issuer} • {ach.date}</Text>
                {ach.description ? <Text style={styles.timelineDesc}>{ach.description}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {user.certifications.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Award size={18} color={colors.warning} />
              <Text style={styles.cardTitle}>Licenses & Certifications</Text>
            </View>
            {user.certifications.map((cert, idx) => (
              <View key={cert.id} style={[styles.certItem, idx < user.certifications.length - 1 && styles.certItemBorder]}>
                <Text style={styles.certName}>{cert.name}</Text>
                <Text style={styles.certOrg}>{cert.issuingOrganization}</Text>
                {cert.credentialUrl ? (
                  <View style={styles.certUrlRow}>
                    <Link2 size={12} color={colors.accent} />
                    <Text style={styles.certUrlText} numberOfLines={1}>{cert.credentialUrl}</Text>
                  </View>
                ) : null}
                {cert.skills.length > 0 && (
                  <View style={styles.certSkillsWrap}>
                    {cert.skills.map((s, i) => (
                      <View key={i} style={styles.certSkillBadge}>
                        <Text style={styles.certSkillBadgeText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradientHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroBanner: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#111111',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#111111',
  },
  name: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  headline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600' as const,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  contactCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  contactDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  resumeButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  bioText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 23,
    marginTop: 8,
  },
  prefsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  prefChipText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  salaryText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#D4A017',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  topSkillChipText: {
    fontSize: 13,
    color: '#8B6914',
    fontWeight: '700' as const,
  },
  skillChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  skillChipText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginBottom: 20,
    position: 'relative',
  },
  lastTimelineItem: {
    marginBottom: 0,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 9,
    top: 20,
    bottom: -16,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 14,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  timelineCompany: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
  },
  timelineDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },
  eduExtraSection: {
    marginTop: 8,
  },
  eduExtraLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  certItem: {
    paddingBottom: 14,
    marginBottom: 14,
  },
  certItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  certName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  certOrg: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  certUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  certUrlText: {
    fontSize: 12,
    color: '#64B5F6',
    flex: 1,
  },
  certSkillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  certSkillBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  certSkillBadgeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600' as const,
  },
  darkCard: {
    backgroundColor: '#111111',
  },
  jobLocationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
});
