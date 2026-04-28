import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated, Image, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Eye } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

const CARD_GAP = 10;

const TESTIMONIALS = [
  { quote: 'Apply to hundreds of jobs with a single swipe — save hours every week.' },
  { quote: 'AI auto-fill handles repetitive fields so you can focus on what matters.' },
  { quote: 'Get your profile seen by more recruiters with enhanced visibility.' },
  { quote: 'Upload multiple resumes and use the right one for each application.' },
  { quote: 'Track all your applications in one place with real-time status updates.' },
];

export default function SignUpScreen() {
  const { signUpWithEmail, signInWithApple, signInWithGoogle, isAuthenticated, isOnboardingComplete, isSwitchingAccount } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isEmailValid && isPasswordValid && passwordsMatch;
  const anySocialLoading = appleLoading || googleLoading;
  const signInInitiated = useRef(false);

  // Navigate after a fresh social sign-in completes on this screen
  useEffect(() => {
    if (!signInInitiated.current || isSwitchingAccount) return;
    if (isAuthenticated) {
      signInInitiated.current = false;
      if (isOnboardingComplete) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/onboarding' as any);
      }
    }
  }, [isAuthenticated, isOnboardingComplete, isSwitchingAccount]);

  useEffect(() => {
    const totalScroll = TESTIMONIALS.length * (70 + CARD_GAP);
    Animated.loop(
      Animated.timing(scrollY, {
        toValue: -totalScroll,
        duration: TESTIMONIALS.length * 3500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleAppleSignIn = async () => {
    if (appleLoading || anySocialLoading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppleLoading(true);
    setErrorMessage('');
    signInInitiated.current = true;
    const result = await signInWithApple();
    if (!result.success && result.error !== 'Cancelled') {
      setErrorMessage(result.error || 'Apple Sign In failed');
      signInInitiated.current = false;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setAppleLoading(false);
  };

  const handleContinue = async () => {
    if (!isFormValid || loading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setErrorMessage('');

    const result = await signUpWithEmail(email, password, '');

    if (result.success && result.userId) {
      router.replace('/onboarding' as any);
    } else {
      let msg = result.error || 'Sign up failed. Please try again.';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        msg = 'This email already has an account.';
      }
      setErrorMessage(msg);
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.headerContainer}>
          <Image source={require('@/assets/images/image.png')} style={styles.headerImage} resizeMode="cover" />
          <LinearGradient colors={['transparent', '#111111']} style={styles.headerGradient} />
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/welcome' as any)} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.headerTextSection}>
            <Text style={styles.heading}>Create Your Account 🚀</Text>
            <Text style={styles.subheading}>Swipe right on jobs you love. AI helps you apply.</Text>
            <Text style={styles.funnyText}>swipe-based job discovery — find your{'\n'}next opportunity in seconds 🚀</Text>
          </View>

          {errorMessage.length > 0 && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrorMessage(''); }}
                onBlur={() => setEmailTouched(true)}
                onSubmitEditing={() => passwordRef.current?.focus()}
                returnKeyType="next"
              />
            </View>
            <View style={styles.rowSeparator} />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Min 6 characters"
                placeholderTextColor="#555"
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => confirmRef.current?.focus()}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? <Ionicons name="eye-off-outline" size={18} color="#555" /> : <Eye size={18} color="#555" />}
              </Pressable>
            </View>
            <View style={styles.rowSeparator} />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Confirm</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="#555"
                secureTextEntry={!showConfirm}
                autoComplete="password-new"
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                {showConfirm ? <Ionicons name="eye-off-outline" size={18} color="#555" /> : <Eye size={18} color="#555" />}
              </Pressable>
            </View>
          </View>

          {emailTouched && !isEmailValid && email.length > 0 && (
            <Text style={styles.hintError}>Please enter a valid email address</Text>
          )}
          {password.length > 0 && password.length < 6 && (
            <Text style={styles.hintError}>Password must be at least 6 characters</Text>
          )}
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={styles.hintError}>Passwords do not match</Text>
          )}

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
              onPress={() => { animatePress(); handleContinue(); }}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Text style={[styles.buttonText, (!isFormValid || loading) && styles.buttonTextDisabled]}>
                  Continue
                </Text>
              )}
            </Pressable>
          </Animated.View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            {Platform.OS === 'ios' && (
            <Pressable
              style={styles.socialIcon}
              onPress={handleAppleSignIn}
              disabled={appleLoading || anySocialLoading}
            >
              {appleLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={styles.socialInner}>
                  <Ionicons name="logo-apple" size={22} color="#FFF" />
                  <Text style={styles.socialLabel}>Apple</Text>
                </View>
              )}
            </Pressable>
            )}

            <Pressable
              style={[styles.socialIcon, { backgroundColor: '#1C1C1E' }]}
              onPress={async () => {
                if (googleLoading || anySocialLoading) return;
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setGoogleLoading(true);
                setErrorMessage('');
                signInInitiated.current = true;
                const result = await signInWithGoogle();
                if (!result.success && result.error !== 'Cancelled') {
                  setErrorMessage(result.error || 'Google Sign In failed');
                  signInInitiated.current = false;
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
                setGoogleLoading(false);
              }}
              disabled={googleLoading || anySocialLoading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={styles.socialInner}>
                  <Svg width={18} height={18} viewBox="0 0 48 48">
                    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <Path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
                    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </Svg>
                  <Text style={styles.socialLabel}>Google</Text>
                </View>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => router.replace('/sign-in' as any)} style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Sign In</Text>
            </Text>
          </Pressable>

          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL('https://nextquark.framer.website/terms')}>Terms</Text>
            {' '}and{' '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL('https://nextquark.framer.website/privacy')}>Privacy Policy</Text>
          </Text>

          <View style={styles.carouselWrap}>
            <LinearGradient colors={['#111111', 'transparent']} style={styles.fadeTop} pointerEvents="none" />
            <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
                <View key={idx} style={styles.tCard}>
                  <Text style={styles.tQuote}>"{t.quote}"</Text>
                </View>
              ))}
            </Animated.View>
            <LinearGradient colors={['transparent', '#111111']} style={styles.fadeBottom} pointerEvents="none" />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerContainer: { position: 'relative' },
  headerImage: { width: '100%', height: 200 },
  headerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  backButton: { position: 'absolute', top: 54, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  headerTextSection: { alignItems: 'center', marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subheading: { fontSize: 14, color: '#777', marginTop: 6, textAlign: 'center' },
  funnyText: { fontSize: 12, color: '#555', marginTop: 10, textAlign: 'center', fontStyle: 'italic', lineHeight: 18 },
  errorBanner: { backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)' },
  errorBannerText: { color: '#FF453A', fontSize: 13, textAlign: 'center' },
  inputGroup: { backgroundColor: '#1C1C1E', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 44, overflow: 'hidden' },
  rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#38383A', marginLeft: 16 },
  inputLabel: { width: 80, fontSize: 16, color: '#FFFFFF' },
  input: { flex: 1, fontSize: 16, color: '#FFFFFF', padding: 0 },
  hintError: { color: '#FF453A', fontSize: 13, marginBottom: 8, paddingHorizontal: 4 },
  button: { height: 50, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#1C1C1E' },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#111111' },
  buttonTextDisabled: { color: '#555' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#38383A' },
  dividerText: { color: '#555', fontSize: 13, marginHorizontal: 12 },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialIcon: { flex: 1, height: 52, borderRadius: 12, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  socialInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialLabel: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { color: '#777', fontSize: 14 },
  footerLink: { color: '#0A84FF', fontWeight: '600' },
  termsText: { textAlign: 'center', fontSize: 12, color: '#555', lineHeight: 18, marginTop: 12 },
  termsLink: { color: '#0A84FF' },
  carouselWrap: { height: 80 * 2.5, overflow: 'hidden', marginTop: 28, position: 'relative' },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  tCard: { backgroundColor: '#1C1C1E', borderRadius: 14, padding: 14, marginBottom: CARD_GAP, justifyContent: 'center' },
  tQuote: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 20 },
});
