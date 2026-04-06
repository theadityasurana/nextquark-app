import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Check, User, UserRound, ShieldQuestion } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Male', Icon: User, color: '#3B82F6' },
  { value: 'female' as const, label: 'Female', Icon: UserRound, color: '#EC4899' },
  { value: 'prefer_not_to_say' as const, label: 'Prefer not to say', Icon: ShieldQuestion, color: '#9E9E9E' },
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

export default function StepGender({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
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
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>🧑</Text>
          <Text style={styles.title}>What's your gender? <Text style={styles.asterisk}>*</Text></Text>
        </View>
        <Text style={styles.subtitle}>This helps us personalize your experience</Text>

        <View style={styles.options}>
          {GENDER_OPTIONS.map((opt, idx) => {
            const selected = data.gender === opt.value;
            return (
              <AnimatedOption key={opt.value} index={idx}>
                <Pressable
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => handleSelect(opt.value)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: selected ? '#111111' : `${opt.color}15` }]}>
                    <opt.Icon size={20} color={selected ? '#FFFFFF' : opt.color} />
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.label}</Text>
                  {selected && <Check size={20} color="#111111" />}
                </Pressable>
              </AnimatedOption>
            );
          })}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Pressable
        style={[styles.nextButton, !data.gender && styles.nextButtonDisabled]}
        onPress={handleNext}
      >
        <Text style={[styles.nextButtonText, !data.gender && styles.nextButtonTextDisabled]}>Continue →</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  content: { paddingTop: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  emoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', flex: 1 },
  asterisk: { color: '#EF4444', fontSize: 26 },
  subtitle: { fontSize: 15, color: '#9E9E9E', marginBottom: 32, lineHeight: 22 },
  options: { gap: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    height: 60, borderRadius: 16, paddingHorizontal: 20,
    backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#333333',
  },
  optionSelected: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const },
  optionTextSelected: { color: '#111111' },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' as const, marginTop: 12 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#333333' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#111111' },
  nextButtonTextDisabled: { color: '#666666' },
});
