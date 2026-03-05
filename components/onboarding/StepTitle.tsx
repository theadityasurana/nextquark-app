import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { jobTitleSuggestions } from '@/constants/onboarding';
import { StepProps } from '@/types/onboarding';

export default function StepTitle({ data, onUpdate, onNext }: StepProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const filtered = data.headline.length > 0
    ? jobTitleSuggestions.filter(t => t.toLowerCase().includes(data.headline.toLowerCase())).slice(0, 5)
    : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>💼</Text>
            <Text style={styles.title}>What's your current professional title?</Text>
          </View>
          <Text style={styles.subtitle}>This helps us match you better</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>YOUR HEADLINE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Senior UX Designer"
              placeholderTextColor="#9E9E9E"
              value={data.headline}
              onChangeText={v => { onUpdate({ headline: v }); setShowSuggestions(v.length > 1); }}
              onFocus={() => setShowSuggestions(data.headline.length > 1)}
              maxLength={120}
              autoFocus
              testID="headline-input"
            />
            <Text style={styles.charCount}>{data.headline.length}/120</Text>
          </View>

          {showSuggestions && filtered.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {filtered.map(s => (
                <Pressable key={s} style={styles.suggestionRow} onPress={() => { onUpdate({ headline: s }); setShowSuggestions(false); }}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Examples:</Text>
            {['Software Engineer', 'Marketing Manager', 'Product Designer'].map(ex => (
              <Text key={ex} style={styles.exampleItem}>• {ex}</Text>
            ))}
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>A clear headline helps recruiters find you 40% faster</Text>
          </View>
        </Animated.View>

        <View style={styles.bottomSection}>
          <Pressable style={styles.nextButton} onPress={onNext} testID="next-button">
            <Text style={styles.nextButtonText}>{data.headline.trim() ? 'Next →' : 'Skip for now'}</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1 },
  subtitle: { fontSize: 15, color: '#616161', marginBottom: 32 },
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  input: {
    height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 16,
  },
  charCount: { color: '#9E9E9E', fontSize: 11, alignSelf: 'flex-end' },
  suggestionsContainer: {
    backgroundColor: '#F5F5F5', borderRadius: 14,
    borderWidth: 1, borderColor: '#E0E0E0', marginTop: 8, overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  suggestionText: { color: '#111111', fontSize: 15 },
  examplesSection: { marginTop: 28 },
  examplesTitle: { color: '#616161', fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
  exampleItem: { color: '#9E9E9E', fontSize: 14, lineHeight: 24 },
  bottomSection: { paddingTop: 32 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
});
