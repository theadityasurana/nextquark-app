import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_OPENED_KEY = 'nextquark_app_opened';

export default function WelcomeBack() {
  const router = useRouter();

  const handleContinue = async () => {
    await AsyncStorage.setItem(APP_OPENED_KEY, 'true');
    router.replace('/(tabs)/(home)' as any);
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
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue Swiping</Text>
        </TouchableOpacity>
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
});
