import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const WORK_AUTH_OPTIONS = [
  'Yes, I am a U.S. Citizen',
  'Yes, I am a Permanent Resident (Green Card)',
  'Yes, I have H1B visa',
  'Yes, I have L1 visa',
  'Yes, I have OPT/CPT (F1 visa)',
  'Yes, I have TN visa',
  'Yes, I have O1 visa',
  'Yes, I have other work authorization',
  'No, I need sponsorship',
  'Prefer not to disclose',
];

export default function StepWorkAuthorization({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const currentValue = data.workAuthorizationStatus || '';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (option: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ workAuthorizationStatus: option } as any);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>🇺🇸</Text>
          <Text style={styles.title}>Are you eligible to work in the United States?</Text>
        </View>
        <Text style={styles.subtitle}>This helps employers understand your work authorization status</Text>

        <View style={styles.optionsList}>
          {WORK_AUTH_OPTIONS.map((option) => {
            const selected = currentValue === option;
            return (
              <Pressable
                key={option}
                style={[styles.optionCard, selected && styles.optionCardSelected]}
                onPress={() => handleSelect(option)}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={2}>{option}</Text>
                {selected && <Check size={18} color="#FFFFFF" />}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>Your work authorization status helps match you with relevant opportunities</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Pressable
          style={[styles.nextButton, !currentValue && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!currentValue}
        >
          <Text style={styles.nextButtonText}>Next →</Text>
        </Pressable>
        <Pressable onPress={onNext}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingBottom: 24 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 28 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1 },
  subtitle: { fontSize: 14, color: '#616161', marginBottom: 24 },
  optionsList: { gap: 10 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 52, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  optionCardSelected: { borderColor: '#111111', backgroundColor: '#111111' },
  optionText: { color: '#111111', fontSize: 15, fontWeight: '500' as const, flex: 1, marginRight: 8 },
  optionTextSelected: { color: '#FFFFFF', fontWeight: '600' as const },
  bottomButtons: { paddingHorizontal: 24, gap: 8 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#E0E0E0' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  skipText: { color: '#616161', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
});
