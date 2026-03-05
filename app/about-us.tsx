import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Target, Eye, Heart, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function AboutUsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.brandName}>NEXTQUARK</Text>
          <Text style={styles.tagline}>Swipe Right on Your Dream Job</Text>
        </View>

        <Image source={{ uri: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=300&fit=crop' }} style={styles.heroImage} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Story</Text>
          <Text style={styles.bodyText}>
            NextQuark was born from a simple frustration: job searching should not feel like a chore. In 2024, our founding team — a group of engineers, designers, and recruiters — came together with a bold vision: to reimagine how people find meaningful work.
          </Text>
          <Text style={styles.bodyText}>
            We believed that the same intuitive, engaging experience that revolutionized social connections could transform professional ones. By combining the simplicity of swiping with the power of AI, we created a platform where finding your next opportunity feels natural, even enjoyable.
          </Text>
        </View>

        <View style={styles.valuesGrid}>
          <View style={styles.valueCard}>
            <View style={[styles.valueIcon, { backgroundColor: '#E3F2FD' }]}>
              <Target size={24} color="#1565C0" />
            </View>
            <Text style={styles.valueTitle}>Mission</Text>
            <Text style={styles.valueText}>To connect every professional with opportunities that match their skills, aspirations, and values.</Text>
          </View>
          <View style={styles.valueCard}>
            <View style={[styles.valueIcon, { backgroundColor: '#FFF8E1' }]}>
              <Eye size={24} color="#FF8F00" />
            </View>
            <Text style={styles.valueTitle}>Vision</Text>
            <Text style={styles.valueText}>A world where finding the right job is as effortless as a swipe, powered by intelligent matching.</Text>
          </View>
        </View>

        <Image source={{ uri: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&h=300&fit=crop' }} style={styles.heroImage} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What We Believe</Text>
          <Text style={styles.bodyText}>
            We believe that everyone deserves a job they love. We believe technology should remove barriers, not create them. We believe in transparency — both for job seekers who deserve honest job descriptions and companies who deserve authentic candidate profiles.
          </Text>
          <Text style={styles.bodyText}>
            Our AI does not just match keywords. It understands context, career trajectories, and cultural fit. When a company shows interest in you, it means their team genuinely believes you could thrive there.
          </Text>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>2M+</Text>
            <Text style={styles.statLabel}>Job Seekers</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>50k+</Text>
            <Text style={styles.statLabel}>Companies</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>500k+</Text>
            <Text style={styles.statLabel}>Hires Made</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Goals</Text>
          <View style={styles.goalRow}>
            <Zap size={18} color={Colors.accent} />
            <Text style={styles.goalText}>Expand to 100+ countries by 2027</Text>
          </View>
          <View style={styles.goalRow}>
            <Heart size={18} color={Colors.error} />
            <Text style={styles.goalText}>Help 10 million people find meaningful work</Text>
          </View>
          <View style={styles.goalRow}>
            <Target size={18} color="#1565C0" />
            <Text style={styles.goalText}>Achieve 95%+ match satisfaction rate</Text>
          </View>
          <View style={styles.goalRow}>
            <Eye size={18} color="#FF8F00" />
            <Text style={styles.goalText}>Pioneer AI-driven career development tools</Text>
          </View>
        </View>

        <Image source={{ uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=300&fit=crop' }} style={styles.heroImage} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join Our Journey</Text>
          <Text style={styles.bodyText}>
            Whether you are a job seeker looking for your next adventure or a company searching for exceptional talent, NextQuark is here to make that connection happen. We are just getting started, and the best is yet to come.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  scrollContent: { paddingHorizontal: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 24 },
  brandName: { fontSize: 32, fontWeight: '900' as const, color: Colors.secondary, letterSpacing: 3 },
  tagline: { fontSize: 15, color: Colors.textSecondary, marginTop: 6, fontWeight: '500' as const },
  heroImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16, backgroundColor: Colors.borderLight },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary, marginBottom: 12 },
  bodyText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24, marginBottom: 10 },
  valuesGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  valueCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center' },
  valueIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  valueTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.secondary, marginBottom: 6 },
  valueText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  statsSection: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 16, padding: 18, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '900' as const, color: Colors.textInverse },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500' as const },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  goalText: { fontSize: 15, color: Colors.textSecondary, flex: 1 },
});
