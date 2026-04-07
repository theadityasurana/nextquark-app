import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle } from '@/components/ProfileIcons';
import { darkColors } from '@/constants/colors';

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = darkColors;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', colors.background]} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=200&fit=crop' }} style={styles.heroBanner} />
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>How can we help?</Text>
          <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>Report any issue and our team will get back to you.</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable
          style={({ pressed }) => [styles.optionItem, pressed && styles.optionPressed]}
          onPress={() => router.push('/report-ticket' as any)}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#1565C015' }]}>
            <HelpCircle size={20} color="#1565C0" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionLabel}>Report an Issue</Text>
            <Text style={styles.optionDesc}>Bugs, problems, safety concerns & more</Text>
          </View>
        </Pressable>

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
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800' as const },
  heroSubtext: { fontSize: 13, textAlign: 'center', marginTop: 0 },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  optionsCard: { backgroundColor: '#1E1E1E', borderRadius: 16, overflow: 'hidden' },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  optionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionContent: { flex: 1, marginLeft: 14 },
  optionLabel: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF' },
  optionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});
