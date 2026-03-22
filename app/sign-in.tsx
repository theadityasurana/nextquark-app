import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInScreen() {
  const { signInWithEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isEmailValid && password.length >= 1;

  const handleSignIn = async () => {
    if (!isFormValid || loading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');

    const result = await signInWithEmail(email, password);

    if (result.success) {
      console.log('Sign in successful');
    } else {
      setError(result.error || 'Invalid email or password. Please try again.');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const targetEmail = isEmailValid ? email : '';
    if (Platform.OS === 'web') {
      const input = window.prompt('Enter your email address to reset your password:', targetEmail);
      if (!input) return;
      const result = await resetPassword(input.trim());
      if (result.success) {
        window.alert('Password reset email sent! Check your inbox.');
      } else {
        window.alert(result.error || 'Failed to send reset email.');
      }
      return;
    }
    Alert.prompt(
      'Reset Password',
      'Enter your email address and we\'ll send you a reset link.',
      async (input) => {
        if (!input?.trim()) return;
        const result = await resetPassword(input.trim());
        if (result.success) {
          Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
        } else {
          Alert.alert('Error', result.error || 'Failed to send reset email.');
        }
      },
      'plain-text',
      targetEmail,
      'email-address',
    );
  };

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#111111" />
            </Pressable>

            <View style={styles.headerSection}>
              <Text style={styles.title}>Welcome{'\n'}Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your job search</Text>
            </View>

            <View style={styles.formSection}>
              {error.length > 0 && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color="#9E9E9E" />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="#9E9E9E"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color="#9E9E9E" />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#9E9E9E"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    onSubmitEditing={handleSignIn}
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} color="#9E9E9E" /> : <Eye size={18} color="#9E9E9E" />}
                  </Pressable>
                </View>
              </View>

              <Pressable style={styles.forgotButton} onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>

            <View style={styles.bottomSection}>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  style={[styles.signInButton, (!isFormValid || loading) && styles.signInButtonDisabled]}
                  onPress={() => { animatePress(); handleSignIn(); }}
                  disabled={!isFormValid || loading}
                >
                  <Text style={[styles.signInButtonText, (!isFormValid || loading) && styles.signInButtonTextDisabled]}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Text>
                </Pressable>
              </Animated.View>

              <Pressable onPress={() => { router.back(); setTimeout(() => router.push('/sign-up' as any), 100); }}>
                <Text style={styles.signUpText}>
                  Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
                </Text>
              </Pressable>
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
  headerSection: { marginTop: 16, marginBottom: 40 },
  title: { fontSize: 34, fontWeight: '900' as const, color: '#111111', lineHeight: 42 },
  subtitle: { fontSize: 16, color: '#616161', marginTop: 10 },
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
  input: { flex: 1, color: '#111111', fontSize: 16 },
  forgotButton: { alignSelf: 'flex-end' },
  forgotText: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  bottomSection: { flex: 1, justifyContent: 'flex-end', gap: 16, paddingTop: 40 },
  signInButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  signInButtonDisabled: { backgroundColor: '#E0E0E0' },
  signInButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  signInButtonTextDisabled: { color: '#9E9E9E' },
  signUpText: { textAlign: 'center', color: '#616161', fontSize: 14, paddingTop: 4 },
  signUpLink: { color: '#111111', fontWeight: '600' as const },
});
