import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, ScrollView } from 'react-native';
import { Check } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

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

export default function StepDemographics({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleVeteranSelect = (value: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ veteranStatus: data.veteranStatus === value ? '' : value });
  };

  const handleDisabilitySelect = (value: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ disabilityStatus: data.disabilityStatus === value ? '' : value });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.emoji}>📋</Text>
          <Text style={styles.title}>Voluntary self-identification</Text>
          <Text style={styles.subtitle}>
            This information is collected for compliance purposes. It will not affect your job matches.
          </Text>

          <Text style={styles.sectionTitle}>Are you a protected veteran?</Text>
          <View style={styles.options}>
            {VETERAN_OPTIONS.map((opt) => {
              const selected = data.veteranStatus === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => handleVeteranSelect(opt)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={2}>{opt}</Text>
                  {selected && <Check size={18} color="#111111" />}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Do you have a disability?</Text>
          <View style={styles.options}>
            {DISABILITY_OPTIONS.map((opt) => {
              const selected = data.disabilityStatus === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => handleDisabilitySelect(opt)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={2}>{opt}</Text>
                  {selected && <Check size={18} color="#111111" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.nextButton} onPress={onNext}>
        <Text style={styles.nextButtonText}>Continue →</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  scrollView: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 20 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9E9E9E', lineHeight: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '800' as const, color: '#FFFFFF', marginBottom: 12, marginTop: 8 },
  options: { gap: 8, marginBottom: 24 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#333333',
  },
  optionSelected: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  optionText: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const, marginRight: 8 },
  optionTextSelected: { color: '#111111' },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#111111' },
});
