import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft } from '@/components/ProfileIcons';
import { LinkedInIcon, TwitterIcon, GithubIcon, WebsiteIcon, InstagramIcon } from '@/components/SocialIcons';
import { darkColors } from '@/constants/colors';
import { Linking } from 'react-native';

export default function AboutUsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = darkColors;

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', colors.background]} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>About Us</Text>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={require('@/assets/images/image.png')} style={styles.heroBanner} />
        <View style={styles.heroSection}>
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>NEXTQUARK</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Building the future of job hunting</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About NextQuark</Text>
          <Text style={styles.bodyText}>
            Applying for jobs today is slow, repetitive, and unnecessarily frustrating. Candidates spend hours filling out the same forms across different company portals, uploading resumes again and again, and navigating outdated application systems.
          </Text>
          <Text style={styles.bodyText}>
            NextQuark changes that.
          </Text>
          <Text style={styles.bodyText}>
            Our platform turns job applications into a simple, intuitive experience. Instead of filling out countless forms, users can discover opportunities and apply with a single swipe. Behind the scenes, intelligent automation handles the heavy lifting — filling application forms, uploading resumes, and submitting applications across company portals in real time.
          </Text>
          <Text style={styles.bodyText}>
            The goal is simple: make job hunting faster, smarter, and less painful.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.bodyText}>
            We believe the process of finding a job should be as seamless as discovering one.
          </Text>
          <Text style={styles.bodyText}>
            Our mission is to remove friction from the job search process and empower candidates to focus on what actually matters — preparing for interviews, learning new skills, and building meaningful careers.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Founder</Text>
          <Text style={styles.bodyText}>
            NextQuark was founded by Aditya Surana.
          </Text>
          <Text style={styles.bodyText}>
            Aditya is a 2025 graduate from IIT BHU, where he completed a B.Tech + M.Tech in Engineering Physics. During his time at IIT BHU, he developed a strong interest in building technology-driven products and exploring how intelligent systems can simplify complex processes.
          </Text>
          <Text style={styles.bodyText}>
            Rather than following a traditional path, Aditya has always been drawn to creating things — experimenting with ideas, building products from scratch, and solving problems using technology.
          </Text>
          <Text style={styles.bodyText}>
            NextQuark started from a simple observation: applying to jobs online is unnecessarily tedious. That insight led to building a product that reimagines the entire job application experience.
          </Text>

          <View style={styles.socialSection}>
            <Text style={styles.socialTitle}>Connect with the Founder</Text>
            <View style={styles.socialIcons}>
              <Pressable style={styles.socialBtn} onPress={() => openLink('https://linkedin.com/in/adityasurana7')}>
                <LinkedInIcon size={22} />
              </Pressable>
              <Pressable style={styles.socialBtn} onPress={() => openLink('https://twitter.com/theadityasurana')}>
                <TwitterIcon size={22} />
              </Pressable>
              <Pressable style={styles.socialBtn} onPress={() => openLink('https://github.com/theadityasurana')}>
                <GithubIcon size={22} />
              </Pressable>
              <Pressable style={styles.socialBtn} onPress={() => openLink('https://nextquark.in')}>
                <WebsiteIcon size={22} />
              </Pressable>
              <Pressable style={styles.socialBtn} onPress={() => openLink('https://www.instagram.com/adityasurana7/')}>
                <InstagramIcon size={22} />
              </Pressable>
            </View>
          </View>

          <Image source={require('@/assets/images/aditya.png')} style={styles.founderImage} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroGradient: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 24 },
  brandName: { fontSize: 32, fontWeight: '900' as const, letterSpacing: 3 },
  tagline: { fontSize: 15, color: undefined, marginTop: 0, fontWeight: '500' as const },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  heroImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF', marginBottom: 12 },
  bodyText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 24, marginBottom: 10 },
  valuesGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  valueCard: { flex: 1, backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, alignItems: 'center' },
  valueIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  valueTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 6 },
  valueText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 19 },
  statsSection: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#1E1E1E', borderRadius: 16, padding: 18, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500' as const },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  goalText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', flex: 1 },
  socialSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  socialTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  socialIcons: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  socialBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  founderImage: { width: '100%', height: 300, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
});
