import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          <Text style={styles.heroSubtext}>Report any issue and our team will get back to you.</Text>
        </View>

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
