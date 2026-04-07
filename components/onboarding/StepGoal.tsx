import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const GOALS = [
  { key: 'land_asap', label: 'Land a job ASAP', emoji: '⚡' },
  { key: 'more_money', label: 'Make more money', emoji: '💸' },
  { key: 'dream_job', label: 'Land my dream job', emoji: '✨' },
  { key: 'career_growth', label: 'Accelerate my career growth', emoji: '📈' },
  { key: 'remote_work', label: 'Find remote opportunities', emoji: '🌍' },
  { key: 'work_life', label: 'Better work-life balance', emoji: '⚖️' },
  { key: 'learn_skills', label: 'Learn new skills on the job', emoji: '🧠' },
  { key: 'switch_industry', label: 'Switch to a new industry', emoji: '🔄' },
];

export default function StepGoal({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ goal: key });
    setError('');
  };

  const handleNext = () => {
    if (!data.goal) {
      setError('Please select a goal to continue');
      return;
    }
    onNext();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>What's your goal?</Text>
        <Text style={styles.subtitle}>This will personalize your job matches</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        <View style={styles.groupedCard}>
          {GOALS.map(({ key, label, emoji }, idx) => {
            const selected = data.goal === key;
            const isLast = idx === GOALS.length - 1;
            return (
              <Pressable
                key={key}
                style={[styles.row, !isLast && styles.rowBorder]}
                onPress={() => handleSelect(key)}
              >
                <Text style={styles.rowEmoji}>{emoji}</Text>
                <Text style={styles.rowLabel}>{label}</Text>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          style={[styles.nextButton, !data.goal && styles.nextButtonDisabled]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, !data.goal && styles.nextButtonTextDisabled]}>Continue</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={onNext}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingTop: 24, paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 16 },
  groupedCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    minHeight: 50,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  rowEmoji: { fontSize: 22, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 16, color: '#FFFFFF' },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  errorText: { color: '#FF453A', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  nextButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  nextButtonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipButtonText: { color: '#007AFF', fontSize: 16 },
});
