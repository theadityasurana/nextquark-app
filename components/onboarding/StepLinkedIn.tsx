import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Linkedin, Github, Link2 } from '@/components/ProfileIcons';
import { StepProps } from '@/types/onboarding';

export default function StepLinkedIn({ data, onUpdate, onNext }: StepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [linkedinUrl, setLinkedinUrl] = useState(data.linkedInUrl || '');
  const [githubUrl, setGithubUrl] = useState(data.githubUrl || '');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleNext = () => {
    onUpdate({ linkedInUrl: linkedinUrl, githubUrl: githubUrl });
    onNext();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.linkedInIcon}>
            <Linkedin size={36} color="#0A66C2" />
          </View>

          <Text style={styles.title}>Connect your{'\n'}LinkedIn & GitHub</Text>

          <View style={styles.buttonGroup}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>LINKEDIN PROFILE URL</Text>
              <View style={styles.inputWrapper}>
                <Linkedin size={16} color="#0A66C2" />
                <TextInput
                  style={styles.input}
                  placeholder="linkedin.com/in/yourprofile"
                  placeholderTextColor="#9E9E9E"
                  value={linkedinUrl}
                  onChangeText={setLinkedinUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                  testID="linkedin-input"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GITHUB PROFILE URL</Text>
              <View style={styles.inputWrapper}>
                <Github size={16} color="#111111" />
                <TextInput
                  style={styles.input}
                  placeholder="github.com/yourprofile"
                  placeholderTextColor="#9E9E9E"
                  value={githubUrl}
                  onChangeText={setGithubUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                  testID="github-input"
                />
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSection}>
          <Pressable style={styles.nextButton} onPress={handleNext} testID="next-button">
            <Text style={styles.nextButtonText}>{linkedinUrl || githubUrl ? 'Next →' : 'Skip for now'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: 'space-between' },
  content: { paddingTop: 20 },
  linkedInIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(10,102,194,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '900' as const, color: '#111111', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#616161', lineHeight: 22, marginBottom: 24 },
  buttonGroup: { gap: 20, marginTop: 24 },
  inputGroup: { gap: 8, width: '100%' },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  input: { flex: 1, color: '#111111', fontSize: 15 },
  bottomSection: { paddingTop: 24 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },

});
