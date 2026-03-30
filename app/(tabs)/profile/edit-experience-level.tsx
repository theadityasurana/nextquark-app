import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Briefcase, GraduationCap, Rocket, TrendingUp, Award, Crown } from 'lucide-react-native';
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

  const handleSave = async () => {
    if (!userProfile) return;
    await saveProfile({ ...userProfile, experienceLevel: selected });
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Experience Level</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
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
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={[styles.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSave}>
          <Check size={18} color={colors.surface} />
          <Text style={[styles.saveBtnText, { color: colors.surface }]}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { flex: 1, padding: 16, gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
