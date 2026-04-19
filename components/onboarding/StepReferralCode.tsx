import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Gift, Check, X } from '@/components/ProfileIcons';
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
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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
    if (!code.trim()) { onNext(); return; }
    if (!supabaseUserId) { Alert.alert('Error', 'Please sign in first.'); return; }
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kavContainer} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Got a referral code?</Text>
        <Text style={styles.subtitle}>
          Enter a friend's code to unlock bonus swipes for both of you
        </Text>

        <View style={styles.groupedCard}>
          <View style={styles.inputRow}>
            <Gift size={20} color={isValid === true ? '#34C759' : isValid === false ? '#FF453A' : 'rgba(255,255,255,0.4)'} />
            <TextInput
              style={styles.input}
              placeholder="Enter referral code"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="characters"
              value={code}
              onChangeText={handleCodeChange}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {validating && <Text style={styles.validatingText}>...</Text>}
            {!validating && isValid === true && <Check size={20} color="#34C759" />}
            {!validating && isValid === false && <X size={20} color="#FF453A" />}
          </View>
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
            {submitting ? 'Applying...' : code.trim() && isValid === true ? 'Submit & Continue' : 'Continue'}
          </Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{code.trim() ? 'Skip for now' : "I don't have a code"}</Text>
        </Pressable>
      </View>
    </Animated.View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kavContainer: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 16 },
  content: { paddingTop: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 22, marginBottom: 28 },
  groupedCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    minHeight: 50,
  },
  input: { flex: 1, color: '#FFFFFF', fontSize: 17, fontWeight: '600', letterSpacing: 2 },
  validatingText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '700' },
  validCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: 12, padding: 14, marginTop: 14,
  },
  validIcon: { fontSize: 18 },
  validText: { color: '#34C759', fontSize: 14, fontWeight: '500', flex: 1 },
  invalidText: { color: '#FF453A', fontSize: 13, marginTop: 10, marginLeft: 4 },
  footer: { gap: 12 },
  submitButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipButtonText: { color: '#007AFF', fontSize: 16 },
});
