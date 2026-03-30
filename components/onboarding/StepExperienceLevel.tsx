import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const LEVELS = [
  { key: 'internship', label: 'Internship', emoji: '🎒', color: '#8B5CF6' },
  { key: 'entry_level', label: 'Entry Level & Graduate', emoji: '🎓', color: '#3B82F6' },
  { key: 'junior', label: 'Junior (1-2 years)', emoji: '🌱', color: '#10B981' },
  { key: 'mid', label: 'Mid Level (3-5 years)', emoji: '💼', color: '#F59E0B' },
  { key: 'senior', label: 'Senior (6-9 years)', emoji: '🚀', color: '#EF4444' },
  { key: 'expert', label: 'Expert & Leadership\n(10+ years)', emoji: '👑', color: '#EC4899' },
];

export default function StepExperienceLevel({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ experienceLevel: key });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>💼</Text>
        <Text style={styles.title}>How much experience do you have?</Text>
        <Text style={styles.subtitle}>Select your experience level below.</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {LEVELS.map(({ key, label, emoji, color }) => {
          const selected = data.experienceLevel === key;
          return (
            <Pressable
              key={key}
              style={[styles.option, selected && { borderColor: color, backgroundColor: '#1A1A1A' }]}
              onPress={() => handleSelect(key)}
            >
              <View style={[styles.emojiWrap, { backgroundColor: `${color}15` }]}>
                <Text style={styles.optionEmoji}>{emoji}</Text>
              </View>
              <Text style={[styles.optionLabel, selected && { color: '#FFFFFF' }]}>{label}</Text>
              <View style={[styles.radio, selected && { borderColor: color }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: color }]} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !data.experienceLevel && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!data.experienceLevel}
        >
          <Text style={[styles.nextButtonText, !data.experienceLevel && styles.nextButtonTextDisabled]}>Next →</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, paddingBottom: 24 },
  header: { paddingTop: 12, marginBottom: 16 },
  emoji: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#9E9E9E', lineHeight: 22 },
  list: { flex: 1 },
  listContent: { gap: 8, paddingBottom: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  emojiWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  optionEmoji: { fontSize: 20 },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#BBBBBB' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  footer: { paddingTop: 8 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#333333' },
  nextButtonText: { fontSize: 17, fontWeight: '700', color: '#111111' },
  nextButtonTextDisabled: { color: '#666666' },
});
