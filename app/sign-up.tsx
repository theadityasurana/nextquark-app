import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated, Image, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, Star } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
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
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isEmailValid && isPasswordValid && passwordsMatch;

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.headerContainer}>
          <Image source={require('@/assets/images/image.png')} style={styles.headerImage} resizeMode="cover" />
          <LinearGradient colors={['transparent', '#111111']} style={styles.headerGradient} />
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.headerTextSection}>
            <Text style={styles.heading}>Create Your Account 🚀</Text>
            <Text style={styles.subheading}>Swipe to discover jobs. AI helps you apply.</Text>
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
                testID="email-input"
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
                testID="password-input"
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
                testID="confirm-password-input"
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
              testID="continue-button"
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

          {/* Testimonial carousel */}
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

  errorBanner: {
    backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
  },
  errorBannerText: { color: '#FF453A', fontSize: 13, textAlign: 'center' },

  inputGroup: { backgroundColor: '#1C1C1E', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 44 },
  rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#38383A', marginLeft: 16 },
  inputLabel: { width: 80, fontSize: 16, color: '#FFFFFF' },
  input: { flex: 1, fontSize: 16, color: '#FFFFFF' },

  hintError: { color: '#FF453A', fontSize: 13, marginBottom: 8, paddingHorizontal: 4 },


  button: { height: 50, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#1C1C1E' },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#111111' },
  buttonTextDisabled: { color: '#555' },

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

  tStars: { flexDirection: 'row', gap: 2 },
});
