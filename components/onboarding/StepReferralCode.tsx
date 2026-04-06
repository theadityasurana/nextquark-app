import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, Alert, Platform } from 'react-native';
import { Gift, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';
import { applyReferralCode } from '@/lib/referral';
import { supabase } from '@/lib/supabase';

export default function StepReferralCode({ data, onUpdate, onNext }: StepProps) {
  const { supabaseUserId } = useAuth();
  const [code, setCode] = useState(data.referralCode || '');
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const validateCode = useCallback(async (value: string) => {
    if (!value.trim()) {
      setIsValid(null);
      setValidating(false);
      return;
    }
    setValidating(true);
    try {
      const { data: referrers } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', value.toUpperCase())
        .limit(1);

      const found = referrers && referrers.length > 0;
      // Also check it's not the user's own code
      if (found && referrers[0].id === supabaseUserId) {
        setIsValid(false);
      } else {
        setIsValid(found);
      }
    } catch {
      setIsValid(false);
    }
    setValidating(false);
  }, [supabaseUserId]);

  const handleCodeChange = (t: string) => {
    const upper = t.toUpperCase();
    setCode(upper);
    setIsValid(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (upper.trim().length >= 4) {
      setValidating(true);
      debounceRef.current = setTimeout(() => validateCode(upper), 500);
    } else {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      onNext();
      return;
    }
    if (!supabaseUserId) {
      Alert.alert('Error', 'Please sign in first.');
      return;
    }
    if (isValid !== true) {
      Alert.alert('Invalid Code', 'That referral code doesn\'t exist. Please check and try again.');
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
      Alert.alert('Error', result.message || 'That referral code didn\'t work. Please try again.');
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onNext();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>🎁</Text>
          <Text style={styles.title}>Got a referral code?</Text>
        </View>
        <Text style={styles.subtitle}>
          If a friend shared their code with you, enter it below to unlock bonus swipes for both of you!
        </Text>

        <View style={[
          styles.inputWrapper,
          isValid === true && styles.inputValid,
          isValid === false && styles.inputInvalid,
        ]}>
          <Gift size={20} color={isValid === true ? '#43A047' : isValid === false ? '#EF4444' : '#666666'} />
          <TextInput
            style={styles.input}
            placeholder="Enter referral code"
            placeholderTextColor="#666666"
            autoCapitalize="characters"
            value={code}
            onChangeText={handleCodeChange}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {validating && <Text style={styles.validatingText}>...</Text>}
          {!validating && isValid === true && <Check size={20} color="#43A047" />}
          {!validating && isValid === false && <X size={20} color="#EF4444" />}
        </View>

        {isValid === true && (
          <View style={styles.validCard}>
            <Text style={styles.validIcon}>🎉</Text>
            <Text style={styles.validText}>Valid code! You'll get 5 bonus swipes</Text>
          </View>
        )}

        {isValid === false && code.trim().length >= 4 && (
          <Text style={styles.invalidText}>This referral code doesn't exist</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Applying...' : code.trim() && isValid === true ? 'Submit & Continue →' : 'Continue →'}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  emoji: { fontSize: 36 },
  title: { fontSize: 26, fontWeight: '900' as const, color: '#FFFFFF', flex: 1 },
  subtitle: { fontSize: 15, color: '#9E9E9E', lineHeight: 22, marginBottom: 28 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 56, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#333333',
  },
  inputValid: { borderColor: '#43A047' },
  inputInvalid: { borderColor: '#EF4444' },
  input: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '700' as const, letterSpacing: 2 },
  validatingText: { color: '#9E9E9E', fontSize: 16, fontWeight: '700' as const },
  validCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A2E1A', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2E7D32', marginTop: 14,
  },
  validIcon: { fontSize: 18 },
  validText: { color: '#81C784', fontSize: 14, fontWeight: '600' as const, flex: 1 },
  invalidText: { color: '#EF4444', fontSize: 13, fontWeight: '600' as const, marginTop: 10, marginLeft: 4 },
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
