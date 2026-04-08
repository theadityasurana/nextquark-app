import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Camera } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StepProps } from '@/types/onboarding';

export default function StepPhoto({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pickImage = async (useCamera: boolean) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      }
      if (!result.canceled && result.assets[0]) {
        onUpdate({ profilePicture: result.assets[0].uri });
      }
    } catch (e) {
      console.log('Image pick error:', e);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>📸</Text>
          <Text style={styles.title}>Looking good, {data.firstName || 'there'}!</Text>
        </View>
        <Text style={styles.subtitle}>Add a profile photo</Text>

        <Animated.View style={[styles.photoContainer, { transform: [{ scale: data.profilePicture ? 1 : pulseAnim }] }]}>
          {data.profilePicture ? (
            <Pressable onPress={() => pickImage(false)}>
              <Image source={{ uri: data.profilePicture }} style={styles.photo} contentFit="cover" />
            </Pressable>
          ) : (
            <Pressable onPress={() => pickImage(false)} style={styles.photoPlaceholder}>
              <Camera size={36} color="#9E9E9E" />
              <Text style={styles.placeholderText}>Tap to add</Text>
            </Pressable>
          )}
        </Animated.View>

        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>Profiles with photos get 3x more views</Text>
        </View>

        <View style={styles.buttonGroup}>
          <Pressable style={styles.actionButton} onPress={() => pickImage(true)}>
            <Camera size={18} color="#111111" />
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => pickImage(false)}>
            <Ionicons name="image-outline" size={18} color="#111111" />
            <Text style={styles.actionButtonText}>Choose from Gallery</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <Pressable style={styles.nextButton} onPress={onNext} testID="next-button">
          <Text style={styles.nextButtonText}>{data.profilePicture ? 'Next →' : 'Skip for now'}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  content: { paddingTop: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1 },
  subtitle: { fontSize: 16, color: '#616161', marginBottom: 32 },
  photoContainer: { alignSelf: 'center', marginBottom: 20 },
  photo: { width: 150, height: 150, borderRadius: 75 },
  photoPlaceholder: {
    width: 150, height: 150, borderRadius: 75,
    borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  placeholderText: { color: '#9E9E9E', fontSize: 13 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginBottom: 28 },
  tipIcon: { fontSize: 16 },
  tipText: { color: '#616161', fontSize: 13 },
  buttonGroup: { gap: 12 },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  actionButtonText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  bottomSection: {},
  nextButton: {
    height: 56, borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
});
