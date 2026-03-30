import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUpScreen() {
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isEmailValid && isPasswordValid && passwordsMatch;

  const handleContinue = async () => {
    if (!isFormValid || loading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setErrorMessage('');

    const result = await signUpWithEmail(email, password, '');

    if (result.success && result.userId) {
      console.log('Sign up successful, navigating to onboarding');
      router.replace('/onboarding' as any);
    } else {
      setErrorMessage(result.error || 'Sign up failed. Please try again.');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  };

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const PasswordRule = ({ met, label }: { met: boolean; label: string }) => (
    <View style={styles.ruleRow}>
      {met ? <Check size={12} color="#10B981" /> : <X size={12} color="#9E9E9E" />}
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={styles.backButton} testID="back-button">
              <ArrowLeft size={24} color="#111111" />
            </Pressable>

            <View style={styles.headerSection}>
              <Text style={styles.title}>Let's Get{'\n'}Started</Text>
              <Text style={styles.subtitle}>Create your account to find your perfect job match</Text>
            </View>

            <View style={styles.formSection}>
              {errorMessage.length > 0 && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={[styles.inputWrapper, emailTouched && !isEmailValid && email.length > 0 && styles.inputError]}>
                  <Mail size={18} color="#9E9E9E" />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="#9E9E9E"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrorMessage(''); }}
                    onBlur={() => setEmailTouched(true)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    returnKeyType="next"
                    testID="email-input"
                  />
                  {emailTouched && isEmailValid && <Check size={18} color="#10B981" />}
                </View>
                {emailTouched && !isEmailValid && email.length > 0 && (
                  <Text style={styles.errorText}>Please enter a valid email address</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={[styles.inputWrapper, passwordTouched && !isPasswordValid && password.length > 0 && styles.inputError]}>
                  <Lock size={18} color="#9E9E9E" />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Create a strong password"
                    placeholderTextColor="#9E9E9E"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onBlur={() => setPasswordTouched(true)}
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    returnKeyType="next"
                    testID="password-input"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} color="#9E9E9E" /> : <Eye size={18} color="#9E9E9E" />}
                  </Pressable>
                </View>
                {password.length > 0 && (
                  <View style={styles.rulesContainer}>
                    <PasswordRule met={hasMinLength} label="Min 8 characters" />
                    <PasswordRule met={hasUppercase} label="1 uppercase letter" />
                    <PasswordRule met={hasNumber} label="1 number" />
                    <PasswordRule met={hasSpecial} label="1 special character" />
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <View style={[styles.inputWrapper, confirmPassword.length > 0 && !passwordsMatch && styles.inputError]}>
                  <Lock size={18} color="#9E9E9E" />
                  <TextInput
                    ref={confirmRef}
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#9E9E9E"
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="done"
                    testID="confirm-password-input"
                  />
                  <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={18} color="#9E9E9E" /> : <Eye size={18} color="#9E9E9E" />}
                  </Pressable>
                </View>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
              </View>
            </View>

            <View style={styles.bottomSection}>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  style={[styles.continueButton, (!isFormValid || loading) && styles.continueButtonDisabled]}
                  onPress={() => { animatePress(); handleContinue(); }}
                  disabled={!isFormValid || loading}
                  testID="continue-button"
                >
                  <Text style={[styles.continueButtonText, (!isFormValid || loading) && styles.continueButtonTextDisabled]}>
                    {loading ? 'Creating Account...' : 'Continue'}
                  </Text>
                </Pressable>
              </Animated.View>

              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1 },
  backButton: { width: 44, height: 44, justifyContent: 'center', marginTop: 8 },
  headerSection: { marginTop: 16, marginBottom: 32 },
  title: { fontSize: 34, fontWeight: '900' as const, color: '#111111', lineHeight: 42 },
  subtitle: { fontSize: 16, color: '#616161', marginTop: 10, lineHeight: 22 },
  formSection: { gap: 20 },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorBannerText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F5F5', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 16, height: 54,
  },
  inputError: { borderColor: '#EF4444' },
  input: { flex: 1, color: '#111111', fontSize: 16 },
  errorText: { color: '#EF4444', fontSize: 12, marginLeft: 4 },
  rulesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: '45%' as any },
  ruleText: { fontSize: 11, color: '#9E9E9E' },
  ruleTextMet: { color: '#10B981' },
  bottomSection: { flex: 1, justifyContent: 'flex-end', gap: 16, paddingTop: 32 },
  continueButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  continueButtonDisabled: { backgroundColor: '#E0E0E0' },
  continueButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  continueButtonTextDisabled: { color: '#9E9E9E' },
  termsText: { textAlign: 'center', fontSize: 12, color: '#9E9E9E', lineHeight: 18 },
  termsLink: { color: '#111111' },
});
