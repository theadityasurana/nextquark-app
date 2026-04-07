import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Briefcase, GraduationCap, Rocket, TrendingUp, Award, Crown } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';

const LEVELS = [
  { key: 'internship', label: 'Internship', icon: GraduationCap, color: '#8B5CF6' },
  { key: 'entry_level', label: 'Entry Level & Graduate', icon: Rocket, color: '#3B82F6' },
  { key: 'junior', label: 'Junior (1-2 years)', icon: Briefcase, color: '#10B981' },
  { key: 'mid', label: 'Mid Level (3-5 years)', icon: TrendingUp, color: '#F59E0B' },
  { key: 'senior', label: 'Senior (6-9 years)', icon: Award, color: '#EF4444' },
  { key: 'expert', label: 'Expert & Leadership (10+ years)', icon: Crown, color: '#EC4899' },
];

export default function EditExperienceLevelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile, saveProfile } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const [selected, setSelected] = useState(userProfile?.experienceLevel || '');
  const hasChanges = selected !== (userProfile?.experienceLevel || '');

  const handleSave = async () => {
    if (!userProfile) return;
    await saveProfile({ ...userProfile, experienceLevel: selected });
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#1A365D', '#2A4A7F', colors.background]} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtnGrad} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitleGrad}>Experience Level</Text>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=200&fit=crop' }} style={styles.heroBanner} />
        <Text style={[styles.heroSubtext, { color: colors.textPrimary }]}>Select your current professional level</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {LEVELS.map(({ key, label, icon: Icon, color }) => {
          const sel = selected === key;
          return (
            <Pressable
              key={key}
              style={[styles.option, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setSelected(key);
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
                <Icon size={20} color={color} />
              </View>
              <Text style={[styles.optionText, { color: sel ? colors.surface : colors.textPrimary }]}>{label}</Text>
              {sel && <Check size={16} color={colors.surface} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={[styles.saveBtn, { backgroundColor: colors.secondary }, !hasChanges && { opacity: 0.4 }]} onPress={handleSave} disabled={!hasChanges}>
          <Check size={18} color={colors.surface} />
          <Text style={[styles.saveBtnText, { color: colors.surface }]}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroGradient: { paddingHorizontal: 16, paddingBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtnGrad: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleGrad: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroSubtext: { fontSize: 15, textAlign: 'center', marginTop: 4, fontWeight: '500' as const, lineHeight: 21 },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { padding: 16, gap: 10, paddingBottom: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
});
