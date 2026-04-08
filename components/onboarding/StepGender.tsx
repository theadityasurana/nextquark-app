import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Check } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Male', emoji: '👨' },
  { value: 'female' as const, label: 'Female', emoji: '👩' },
  { value: 'prefer_not_to_say' as const, label: 'Prefer not to say', emoji: '🤐' },
];

export default function StepGender({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (value: 'male' | 'female' | 'prefer_not_to_say') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ gender: value });
    setError('');
  };

  const handleNext = () => {
    if (!data.gender) {
      setError('Please select your gender to continue');
      return;
    }
    onNext();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <Text style={styles.title}>What's your gender?</Text>
        <Text style={styles.subtitle}>This helps us personalize your experience</Text>

        <View style={styles.groupedCard}>
          {GENDER_OPTIONS.map((opt, idx) => {
            const selected = data.gender === opt.value;
            const isLast = idx === GENDER_OPTIONS.length - 1;
            return (
              <Pressable
                key={opt.value}
                style={[styles.row, !isLast && styles.rowBorder]}
                onPress={() => handleSelect(opt.value)}
              >
                <Text style={styles.rowEmoji}>{opt.emoji}</Text>
                <Text style={styles.rowLabel}>{opt.label}</Text>
                {selected && <Check size={20} color="#007AFF" strokeWidth={3} />}
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !data.gender && styles.nextButtonDisabled]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, !data.gender && styles.nextButtonTextDisabled]}>Continue</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'space-between' },
  content: { paddingTop: 24, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 32 },
  groupedCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    minHeight: 50,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  rowEmoji: { fontSize: 22, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 17, color: '#FFFFFF' },
  errorText: { color: '#FF453A', fontSize: 13, marginTop: 12, marginLeft: 4 },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  nextButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  nextButtonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
});
