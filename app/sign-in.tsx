import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, Star } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

const CARD_HEIGHT = 110;
const CARD_GAP = 10;

const TESTIMONIALS = [
  { quote: 'Got 3 interview calls within my first week. The AI auto-apply is a game changer!', name: 'Priya S.', role: 'Software Engineer', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/women/44.jpg' } },
  { quote: 'Went from 0 callbacks to 5 interviews in 2 weeks. Smart matching is incredibly accurate.', name: 'Rahul M.', role: 'Product Manager', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/men/32.jpg' } },
  { quote: 'The profile boost alone was worth it. Recruiters started reaching out directly!', name: 'Ananya K.', role: 'UX Designer', rating: 4, avatar: { uri: 'https://randomuser.me/api/portraits/women/68.jpg' } },
  { quote: 'Applied to 150 jobs in one weekend. Manually that would have taken me a month!', name: 'Vikram T.', role: 'Data Scientist', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/men/75.jpg' } },
  { quote: 'I was skeptical at first, but it paid for itself after my first offer letter.', name: 'Arjun D.', role: 'Backend Developer', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/men/46.jpg' } },
];

export default function SignInScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isEmailValid && password.length >= 1;

  useEffect(() => {
    const totalScroll = TESTIMONIALS.length * (CARD_HEIGHT + CARD_GAP);
    Animated.loop(
      Animated.timing(scrollY, {
        toValue: -totalScroll,
        duration: TESTIMONIALS.length * 3500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

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
            <Text style={styles.heading}>Welcome Back 👋</Text>
            <Text style={styles.subheading}>Sign in to continue</Text>
          </View>

          {error.length > 0 && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
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
                onChangeText={(t) => { setEmail(t); setError(''); }}
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
                placeholder="Required"
                placeholderTextColor="#555"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onSubmitEditing={handleSignIn}
                returnKeyType="done"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? <Ionicons name="eye-off-outline" size={18} color="#555" /> : <Eye size={18} color="#555" />}
              </Pressable>
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
              onPress={() => { animatePress(); handleSignIn(); }}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Text style={[styles.buttonText, (!isFormValid || loading) && styles.buttonTextDisabled]}>
                  Sign In
                </Text>
              )}
            </Pressable>
          </Animated.View>

          <Pressable onPress={() => router.replace('/sign-up' as any)} style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
            </Text>
          </Pressable>

          {/* Testimonial carousel */}
          <View style={styles.carouselWrap}>
            <LinearGradient colors={['#111111', 'transparent']} style={styles.fadeTop} pointerEvents="none" />
            <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
                <View key={idx} style={styles.tCard}>
                  <Ionicons name="chatbubble-outline" size={16} color="rgba(255,255,255,0.15)" style={styles.tQuoteIcon} />
                  <Text style={styles.tQuote} numberOfLines={2}>"{t.quote}"</Text>
                  <View style={styles.tFooter}>
                    <Image source={t.avatar} style={styles.tAvatar} />
                    <View style={styles.tInfo}>
                      <Text style={styles.tName}>{t.name}</Text>
                      <Text style={styles.tRole}>{t.role}</Text>
                    </View>
                    <View style={styles.tStars}>
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} size={10} color="#FFD700" fill="#FFD700" />
                      ))}
                    </View>
                  </View>
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
  headerImage: { width: '100%', height: 250 },
  headerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  backButton: { position: 'absolute', top: 54, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },

  headerTextSection: { alignItems: 'center', marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subheading: { fontSize: 14, color: '#777', marginTop: 6, textAlign: 'center' },

  errorBanner: {
    backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
  },
  errorBannerText: { color: '#FF453A', fontSize: 13, textAlign: 'center' },

  inputGroup: { backgroundColor: '#1C1C1E', borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 44 },
  rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#38383A', marginLeft: 16 },
  inputLabel: { width: 80, fontSize: 16, color: '#FFFFFF' },
  input: { flex: 1, fontSize: 16, color: '#FFFFFF' },

  button: { height: 50, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: '#1C1C1E' },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#111111' },
  buttonTextDisabled: { color: '#555' },

  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { color: '#777', fontSize: 14 },
  footerLink: { color: '#0A84FF', fontWeight: '600' },

  carouselWrap: { height: (CARD_HEIGHT + CARD_GAP) * 2.5, overflow: 'hidden', marginTop: 32, position: 'relative' },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  tCard: { backgroundColor: '#1C1C1E', borderRadius: 14, padding: 14, height: CARD_HEIGHT, marginBottom: CARD_GAP, justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
  tQuoteIcon: { position: 'absolute', top: 12, right: 14 },
  tQuote: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 20, paddingRight: 20 },
  tFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  tInfo: { flex: 1 },
  tName: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  tRole: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  tStars: { flexDirection: 'row', gap: 2 },
});
