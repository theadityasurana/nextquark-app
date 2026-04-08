import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, ScrollView } from 'react-native';
import { Check } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const OPTIONS = [
  { key: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { key: 'twitter', label: 'Twitter / X', emoji: '🐦' },
  { key: 'instagram', label: 'Instagram', emoji: '📸' },
  { key: 'google', label: 'Google Search', emoji: '🔍' },
  { key: 'friends_colleagues', label: 'Friends or Colleagues', emoji: '👥' },
  { key: 'advertisement', label: 'Advertisement', emoji: '📢' },
  { key: 'know_founder', label: 'Friends with the Founder', emoji: '🤝' },
  { key: 'other', label: 'Other', emoji: '✨' },
];

export default function StepHeardAboutUs({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ heardAboutUs: key });
    setError('');
  };

  const handleContinue = () => {
    if (!data.heardAboutUs) {
      setError('Please select an option to continue');
      return;
    }
    onNext();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>How did you hear about us?</Text>
        <Text style={styles.subtitle}>We'd love to know what brought you here</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.groupedCard}>
          {OPTIONS.map(({ key, label, emoji }, idx) => {
            const selected = data.heardAboutUs === key;
            const isLast = idx === OPTIONS.length - 1;
            return (
              <Pressable
                key={key}
                style={[styles.row, !isLast && styles.rowBorder]}
                onPress={() => handleSelect(key)}
              >
                <Text style={styles.rowEmoji}>{emoji}</Text>
                <Text style={styles.rowLabel}>{label}</Text>
                {selected && <Check size={20} color="#007AFF" strokeWidth={3} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          style={[styles.continueButton, !data.heardAboutUs && styles.continueButtonDisabled]}
          onPress={handleContinue}
        >
          <Text style={[styles.continueButtonText, !data.heardAboutUs && styles.continueButtonTextDisabled]}>Continue</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={onNext}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'space-between' },
  header: { paddingTop: 24, paddingHorizontal: 20 },
  scrollArea: { flex: 1, marginTop: 20 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
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
  errorText: { color: '#FF453A', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  continueButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  continueButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  continueButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  continueButtonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipButtonText: { color: '#007AFF', fontSize: 16 },
});
