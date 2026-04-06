import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, ScrollView } from 'react-native';
import { Search, Megaphone, Users, UserCheck, Sparkles } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';

const OPTIONS: { key: string; label: string; sub: string; icon: React.ReactNode; iconSelected: React.ReactNode }[] = [
  {
    key: 'linkedin', label: 'LinkedIn', sub: 'Professional network',
    icon: <FontAwesome5 name="linkedin" size={20} color="#9E9E9E" />,
    iconSelected: <FontAwesome5 name="linkedin" size={20} color="#0A66C2" />,
  },
  {
    key: 'twitter', label: 'Twitter / X', sub: 'Posts or threads',
    icon: <FontAwesome5 name="twitter" size={20} color="#9E9E9E" />,
    iconSelected: <FontAwesome5 name="twitter" size={20} color="#1DA1F2" />,
  },
  {
    key: 'instagram', label: 'Instagram', sub: 'Reels or stories',
    icon: <FontAwesome5 name="instagram" size={20} color="#9E9E9E" />,
    iconSelected: <FontAwesome5 name="instagram" size={20} color="#E1306C" />,
  },
  {
    key: 'google', label: 'Google Search', sub: 'Search engine',
    icon: <Search size={20} color="#9E9E9E" />,
    iconSelected: <Search size={20} color="#4285F4" />,
  },
  {
    key: 'friends_colleagues', label: 'Friends or Colleagues', sub: 'Word of mouth',
    icon: <Users size={20} color="#9E9E9E" />,
    iconSelected: <Users size={20} color="#FFFFFF" />,
  },
  {
    key: 'advertisement', label: 'Advertisement', sub: 'Online or offline ads',
    icon: <Megaphone size={20} color="#9E9E9E" />,
    iconSelected: <Megaphone size={20} color="#FFFFFF" />,
  },
  {
    key: 'know_founder', label: 'Friends with the Founder', sub: 'Personal connection',
    icon: <UserCheck size={20} color="#9E9E9E" />,
    iconSelected: <UserCheck size={20} color="#FFFFFF" />,
  },
  {
    key: 'other', label: 'Other', sub: 'Something else',
    icon: <Sparkles size={20} color="#9E9E9E" />,
    iconSelected: <Sparkles size={20} color="#FFFFFF" />,
  },
];

function AnimatedOption({ index, children }: { index: number; children: React.ReactNode }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(100 + index * 120),
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

export default function StepHeardAboutUs({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ heardAboutUs: key });
    setError('');
  };

  const handleContinue = () => {
    if (!data.heardAboutUs) {
      setError('Please select an option to continue');
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>How did you hear about us? <Text style={styles.asterisk}>*</Text></Text>
        </View>
        <Text style={styles.subtitle}>We'd love to know what brought you here!</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {OPTIONS.map(({ key, label, sub, icon, iconSelected }, idx) => {
          const selected = data.heardAboutUs === key;
          return (
            <AnimatedOption key={key} index={idx}>
              <Pressable
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleSelect(key)}
              >
                <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                  {selected ? iconSelected : icon}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{label}</Text>
                  <Text style={styles.optionSub}>{sub}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            </AnimatedOption>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          style={[styles.continueButton, !data.heardAboutUs && styles.continueButtonDisabled]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue →</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={onNext}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  header: { paddingTop: 20 },
  scrollArea: { flex: 1, marginTop: 24 },
  scrollContent: { gap: 8, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  emoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', flex: 1 },
  subtitle: { fontSize: 15, color: '#9E9E9E', marginBottom: 24 },
  asterisk: { color: '#EF4444', fontSize: 26 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  options: { gap: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 12, borderRadius: 14,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#333333',
  },
  optionSelected: { borderColor: '#FFFFFF', backgroundColor: '#1A1A1A' },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: '#FFFFFF15' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  optionSub: { fontSize: 12, color: '#666666', marginTop: 1 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#444444', alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#FFFFFF' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' },
  footer: { gap: 12 },
  continueButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  continueButtonDisabled: { opacity: 0.4 },
  continueButtonText: { fontSize: 17, fontWeight: '700', color: '#111111' },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipButtonText: { color: '#9E9E9E', fontSize: 15, fontWeight: '600' },
});
