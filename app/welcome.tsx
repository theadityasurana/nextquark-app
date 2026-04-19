import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';

export default function Welcome() {
  const router = useRouter();

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
});
