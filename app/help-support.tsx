import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Flag, FileText, ChevronRight, Shield, Bug, Star } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const supportOptions = [
    { icon: Mail, label: 'Contact Us', description: 'Email our support team', color: '#1565C0', onPress: () => Linking.openURL('mailto:founders.nextquark@gmail.com') },
    { icon: Flag, label: 'Report a Problem', description: 'Report bugs or issues', color: Colors.error, onPress: () => router.push('/report-ticket?type=problem' as any) },
    { icon: Bug, label: 'Report a Bug', description: 'Found a technical issue?', color: '#FF6F00', onPress: () => router.push('/report-ticket?type=bug' as any) },
    { icon: Shield, label: 'Safety & Security', description: 'Report suspicious activity', color: '#1A1A2E', onPress: () => router.push('/report-ticket?type=safety' as any) },
    { icon: Star, label: 'Rate Us', description: 'Love the app? Leave a review', color: '#FFD700', onPress: () => {} },
    { icon: FileText, label: 'Terms of Service', description: 'Read our terms', color: Colors.textSecondary, onPress: () => router.push('/terms-of-service' as any) },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSubtext}>Choose an option below or reach out to our team directly.</Text>
        </View>

        <View style={styles.optionsCard}>
          {supportOptions.map((option, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [styles.optionItem, pressed && styles.optionPressed, idx < supportOptions.length - 1 && styles.optionBorder]}
              onPress={option.onPress}
            >
              <View style={[styles.optionIcon, { backgroundColor: `${option.color}15` }]}>
                <option.icon size={20} color={option.color} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF5FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  scrollContent: { paddingHorizontal: 16 },
  heroCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.secondary },
  heroSubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  optionsCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden' },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  optionPressed: { backgroundColor: Colors.background },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  optionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionContent: { flex: 1, marginLeft: 14 },
  optionLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  optionDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
});
