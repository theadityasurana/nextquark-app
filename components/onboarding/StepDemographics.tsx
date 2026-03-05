import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

type DemoType = 'veteran' | 'disability' | 'ethnicity' | 'race';

interface StepDemographicsProps extends StepProps {
  type: DemoType;
}

const VETERAN_OPTIONS = [
  'I am not a protected veteran',
  'I am a veteran',
  'I am a disabled veteran',
  'I am a recently separated veteran',
  'I am an active duty wartime or campaign badge veteran',
  'I am an Armed Forces service medal veteran',
  'Prefer not to disclose',
];

const DISABILITY_OPTIONS = [
  'Yes, I have a disability (or previously had a disability)',
  'No, I do not have a disability',
  'Prefer not to disclose',
];

const ETHNICITY_OPTIONS = [
  'White',
  'Hispanic or Latino',
  'Black or African American',
  'Asian',
  'Southeast Asian',
  'Native Hawaiian or Other Pacific Islander',
  'American Indian or Alaska Native',
  'Prefer not to disclose',
];

const RACE_OPTIONS = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Native Hawaiian or Other Pacific Islander',
  'White',
  'Hispanic or Latino',
  'Two or More Races',
  'Prefer not to disclose',
];

const CONFIG: Record<DemoType, { emoji: string; title: string; subtitle: string; options: string[]; field: string }> = {
  veteran: {
    emoji: '🎖️',
    title: 'What is your veteran status?',
    subtitle: 'This information is voluntary and confidential',
    options: VETERAN_OPTIONS,
    field: 'veteranStatus',
  },
  disability: {
    emoji: '♿',
    title: 'What is your disability status?',
    subtitle: 'This information helps employers with equal opportunity compliance',
    options: DISABILITY_OPTIONS,
    field: 'disabilityStatus',
  },
  ethnicity: {
    emoji: '🌍',
    title: 'What is your ethnicity?',
    subtitle: 'This is used for equal opportunity tracking only',
    options: ETHNICITY_OPTIONS,
    field: 'ethnicity',
  },
  race: {
    emoji: '👤',
    title: 'What is your race?',
    subtitle: 'Select the option that best describes you',
    options: RACE_OPTIONS,
    field: 'race',
  },
};

export default function StepDemographics({ data, onUpdate, onNext, type }: StepDemographicsProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const config = CONFIG[type];
  const currentValue = (data as unknown as Record<string, string>)[config.field] || '';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (option: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ [config.field]: option } as any);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <Text style={styles.title}>{config.title}</Text>
        </View>
        <Text style={styles.subtitle}>{config.subtitle}</Text>

        <View style={styles.optionsList}>
          {config.options.map((option) => {
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
          <Text style={styles.tipIcon}>🔒</Text>
          <Text style={styles.tipText}>This information is kept strictly confidential and will not be shared with employers</Text>
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
