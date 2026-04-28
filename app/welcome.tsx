import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function Welcome() {
  const router = useRouter();
  const { isAuthenticated, isOnboardingComplete, userEmail, logout } = useAuth();

  // Show "Continue as" only if user is still authenticated with incomplete onboarding
  const showContinue = isAuthenticated && !isOnboardingComplete && !!userEmail;

  const handleContinue = () => {
    router.replace('/onboarding');
  };

  return (
    <View style={styles.container}>
      <Video
        source={require('@/assets/videos/bgvid.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Image source={require('@/assets/images/header.png')} style={styles.logo} resizeMode="contain" />

        {showContinue && (
          <View style={styles.continueCard}>
            <BlurView intensity={40} tint="dark" style={styles.continueBlur}>
              <View style={styles.continueInner}>
                <Pressable onPress={handleContinue} style={styles.continueTapArea}>
                  <View style={styles.continueIconWrap}>
                    <Ionicons name="person-outline" size={20} color="#fff" />
                  </View>
                  <View style={styles.continueTextWrap}>
                    <Text style={styles.continueLabel} numberOfLines={1}>
                      Continue as
                    </Text>
                    <Text style={styles.continueEmail} numberOfLines={1}>
                      {userEmail}
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={(e) => { e.stopPropagation(); logout(); }} hitSlop={12} style={styles.closeButton}>
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>
            </BlurView>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={() => router.push('/sign-up')}>
          <Text style={styles.buttonText}>Sign up for free</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/sign-in')}>
          <Text style={styles.linkText}>Already a user? Sign in</Text>
        </TouchableOpacity>
        <Text style={styles.legalText}>
          By signing up, you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL('https://nextquark.framer.website/privacy')}>Privacy Policy</Text>
          {' '}and{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL('https://nextquark.framer.website/terms')}>Terms of Service</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'none' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 40 },
  logo: { width: '91%', height: 65, alignSelf: 'center', marginBottom: 10 },
  button: { backgroundColor: '#fff', padding: 18, borderRadius: 12, width: '100%', marginBottom: 16 },
  buttonText: { color: '#000', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#fff', textAlign: 'center', fontSize: 14 },
  legalText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 11, marginTop: 16, lineHeight: 16 },
  legalLink: { textDecorationLine: 'underline' },

  continueCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  continueBlur: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  continueInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  continueTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  continueLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  continueEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
