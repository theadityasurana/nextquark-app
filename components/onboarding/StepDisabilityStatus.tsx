import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const DISABILITY_OPTIONS = [
  'Yes, I have a disability (or previously had a disability)',
  'No, I do not have a disability',
  'Prefer not to disclose',
];

function AnimatedOption({ index, children }: { index: number; children: React.ReactNode }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(100 + index * 120),
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

export default function StepDisabilityStatus({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (value: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ disabilityStatus: data.disabilityStatus === value ? '' : value });
  };

  const canContinue = !!data.disabilityStatus;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>📋</Text>
            <Text style={styles.title}>Voluntary self-identification</Text>
          </View>
          <Text style={styles.subtitle}>
            This information is collected for compliance purposes. It will not affect your job matches.
          </Text>
          <Text style={styles.sectionTitle}>Do you have a disability?</Text>
          <View style={styles.options}>
            {DISABILITY_OPTIONS.map((opt, idx) => {
              const selected = data.disabilityStatus === opt;
              return (
                <AnimatedOption key={opt} index={idx}>
                  <Pressable
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(opt)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={2}>{opt}</Text>
                    {selected && <Check size={18} color="#111111" />}
                  </Pressable>
                </AnimatedOption>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Pressable
        style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
        onPress={canContinue ? onNext : undefined}
        disabled={!canContinue}
      >
        <Text style={[styles.nextButtonText, !canContinue && styles.nextButtonTextDisabled]}>Continue →</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  scrollView: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  emoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', flex: 1 },
  subtitle: { fontSize: 14, color: '#9E9E9E', lineHeight: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '800' as const, color: '#FFFFFF', marginBottom: 12 },
  options: { gap: 8 },
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
  nextButtonDisabled: { backgroundColor: '#333333' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#111111' },
  nextButtonTextDisabled: { color: '#666666' },
});
