import React, { useRef, useEffect } from 'react';
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

export default function StepHeardAboutUs({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ heardAboutUs: key });
  };

  const handleContinue = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>How did you hear about us?</Text>
        <Text style={styles.subtitle}>We'd love to know what brought you here!</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {OPTIONS.map(({ key, label, sub, icon, iconSelected }) => {
          const selected = data.heardAboutUs === key;
          return (
            <Pressable
              key={key}
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
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, !data.heardAboutUs && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!data.heardAboutUs}
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
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9E9E9E', marginBottom: 24 },
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
