import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, Alert, Platform } from 'react-native';
import { Gift } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';
import { applyReferralCode } from '@/lib/referral';

export default function StepReferralCode({ data, onUpdate, onNext }: StepProps) {
  const { supabaseUserId } = useAuth();
  const [code, setCode] = useState(data.referralCode || '');
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSubmit = async () => {
    if (!code.trim()) {
      onNext();
      return;
    }
    if (!supabaseUserId) {
      Alert.alert('Error', 'Please sign in first.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    const result = await applyReferralCode(supabaseUserId, code.trim());
    setSubmitting(false);
    if (result.success) {
      onUpdate({ referralCode: code.trim().toUpperCase() });
      Alert.alert('🎉 Success!', result.message, [{ text: 'Awesome!', onPress: onNext }]);
    } else {
      Alert.alert('Invalid Code', result.message || 'That referral code didn\'t work. Please check and try again.');
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onNext();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎁</Text>
        <Text style={styles.title}>Got a referral code?</Text>
        <Text style={styles.subtitle}>
          If a friend shared their code with you, enter it below to unlock bonus swipes for both of you!
        </Text>

        <View style={styles.benefitsCard}>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>🎴</Text>
            <Text style={styles.benefitText}>You get 5 free application swipes</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>🤝</Text>
            <Text style={styles.benefitText}>Your friend also gets 5 free swipes</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <Text style={styles.benefitText}>Start applying to more jobs right away</Text>
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Gift size={20} color="#43A047" />
          <TextInput
            style={styles.input}
            placeholder="Enter referral code"
            placeholderTextColor="#666666"
            autoCapitalize="characters"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {code.length > 0 && (
          <Text style={styles.hint}>You'll get 5 bonus swipes! 🎉</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Applying...' : code.trim() ? 'Submit & Continue →' : 'Continue →'}
          </Text>
        </Pressable>
        {code.trim().length > 0 && (
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>
        )}
        {!code.trim() && (
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>I don't have a code</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  content: { paddingTop: 20 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900' as const, color: '#FFFFFF', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#9E9E9E', lineHeight: 22, marginBottom: 24 },
  benefitsCard: {
    backgroundColor: '#1A2E1A', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2E7D32', marginBottom: 28, gap: 12,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: { fontSize: 18 },
  benefitText: { fontSize: 14, color: '#81C784', fontWeight: '500' as const, flex: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 56, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#333333',
  },
  input: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '700' as const, letterSpacing: 2 },
  hint: { color: '#43A047', fontSize: 13, fontWeight: '600' as const, marginTop: 10, marginLeft: 4 },
  footer: { gap: 12 },
  submitButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#111111' },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipButtonText: { color: '#9E9E9E', fontSize: 15, fontWeight: '600' as const },
});
