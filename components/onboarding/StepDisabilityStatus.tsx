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

export default function StepDisabilityStatus({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (value: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ disabilityStatus: data.disabilityStatus === value ? '' : value });
  };

  const canContinue = !!data.disabilityStatus;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Voluntary Self-Identification</Text>
        <Text style={styles.subtitle}>
          This information is collected for compliance purposes. It will not affect your job matches.
        </Text>
        <Text style={styles.sectionHeader}>DO YOU HAVE A DISABILITY?</Text>

        <View style={styles.groupedCard}>
          {DISABILITY_OPTIONS.map((opt, idx) => {
            const selected = data.disabilityStatus === opt;
            const isLast = idx === DISABILITY_OPTIONS.length - 1;
            return (
              <Pressable
                key={opt}
                style={[styles.row, !isLast && styles.rowBorder]}
                onPress={() => handleSelect(opt)}
              >
                <Text style={styles.rowLabel} numberOfLines={2}>{opt}</Text>
                {selected && <Check size={20} color="#007AFF" strokeWidth={3} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          onPress={canContinue ? onNext : undefined}
          disabled={!canContinue}
        >
          <Text style={[styles.nextButtonText, !canContinue && styles.nextButtonTextDisabled]}>Continue</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'space-between' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 21, marginBottom: 28 },
  sectionHeader: {
    fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5, marginBottom: 8, marginLeft: 4,
  },
  groupedCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    minHeight: 48,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  rowLabel: { flex: 1, fontSize: 16, color: '#FFFFFF', marginRight: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  nextButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  nextButtonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
});
