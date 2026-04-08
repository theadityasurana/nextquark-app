import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Check } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Male' },
  { value: 'female' as const, label: 'Female' },
  { value: 'prefer_not_to_say' as const, label: 'Prefer not to say' },
];

export default function StepName({ data, onUpdate, onNext }: StepProps) {
  const isValid = data.firstName.trim().length > 0 && data.lastName.trim().length > 0 && data.gender !== '';
  const lastNameRef = useRef<TextInput>(null);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(2000),
        ])
      ),
    ]).start();
  }, []);

  const waveRotate = waveAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.titleRow}>
            <Animated.Text style={[styles.emoji, { transform: [{ rotate: waveRotate }] }]}>👋</Animated.Text>
            <Text style={styles.title}>Hi there!</Text>
          </View>
          <Text style={styles.subtitle}>What's your name?</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FIRST NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Alex"
                placeholderTextColor="#9E9E9E"
                value={data.firstName}
                onChangeText={v => onUpdate({ firstName: v })}
                onSubmitEditing={() => lastNameRef.current?.focus()}
                returnKeyType="next"
                autoFocus
                testID="first-name-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>LAST NAME</Text>
              <TextInput
                ref={lastNameRef}
                style={styles.input}
                placeholder="Rivera"
                placeholderTextColor="#9E9E9E"
                value={data.lastName}
                onChangeText={v => onUpdate({ lastName: v })}
                onSubmitEditing={() => isValid && onNext()}
                returnKeyType="done"
                testID="last-name-input"
              />
            </View>
          </View>

          <View style={styles.genderSection}>
            <Text style={styles.label}>GENDER</Text>
            <View style={styles.genderOptions}>
              {GENDER_OPTIONS.map((opt) => {
                const selected = data.gender === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.genderOption, selected && styles.genderOptionSelected]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      onUpdate({ gender: opt.value });
                    }}
                  >
                    <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>{opt.label}</Text>
                    {selected && <Check size={16} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Use your real name — employers will see this on your profile</Text>
          </View>
        </Animated.View>

        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!isValid}
          testID="next-button"
        >
          <Text style={[styles.nextButtonText, !isValid && styles.nextButtonTextDisabled]}>Next →</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: 'space-between' },
  content: { paddingTop: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 36 },
  title: { fontSize: 32, fontWeight: '900' as const, color: '#111111' },
  subtitle: { fontSize: 18, color: '#616161', marginBottom: 36 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  input: {
    height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 16,
  },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center', marginTop: 32,
  },
  nextButtonDisabled: { backgroundColor: '#E0E0E0' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  nextButtonTextDisabled: { color: '#9E9E9E' },
  genderSection: { marginTop: 24, gap: 8 },
  genderOptions: { gap: 10 },
  genderOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  genderOptionSelected: { borderColor: '#111111', backgroundColor: '#111111' },
  genderOptionText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  genderOptionTextSelected: { color: '#FFFFFF' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
});
