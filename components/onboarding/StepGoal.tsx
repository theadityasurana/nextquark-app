import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const GOALS = [
  { key: 'land_asap', label: 'Land a job ASAP', emoji: '⚡', color: '#EF4444' },
  { key: 'more_money', label: 'Make more money', emoji: '💸', color: '#10B981' },
  { key: 'dream_job', label: 'Land my dream job', emoji: '✨', color: '#8B5CF6' },
  { key: 'career_growth', label: 'Accelerate my career growth', emoji: '📈', color: '#3B82F6' },
  { key: 'remote_work', label: 'Find remote opportunities', emoji: '🌍', color: '#14B8A6' },
  { key: 'work_life', label: 'Better work-life balance', emoji: '⚖️', color: '#EC4899' },
  { key: 'learn_skills', label: 'Learn new skills on the job', emoji: '🧠', color: '#F59E0B' },
  { key: 'switch_industry', label: 'Switch to a new industry', emoji: '🔄', color: '#F97316' },
];

export default function StepGoal({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ goal: key });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎯</Text>
        <Text style={styles.title}>What's your goal?</Text>
        <Text style={styles.subtitle}>This will be used to personalize your job matches.</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {GOALS.map(({ key, label, emoji, color }) => {
          const selected = data.goal === key;
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
          style={[styles.nextButton, !data.goal && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!data.goal}
        >
          <Text style={[styles.nextButtonText, !data.goal && styles.nextButtonTextDisabled]}>Next →</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={onNext}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, paddingBottom: 24 },
  header: { paddingTop: 12, marginBottom: 16 },
  headerEmoji: { fontSize: 36, marginBottom: 8 },
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
  footer: { paddingTop: 8, gap: 12 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#333333' },
  nextButtonText: { fontSize: 17, fontWeight: '700', color: '#111111' },
  nextButtonTextDisabled: { color: '#666666' },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipButtonText: { color: '#9E9E9E', fontSize: 15, fontWeight: '600' },
});
