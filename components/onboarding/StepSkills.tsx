import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, ScrollView, Platform } from 'react-native';
import { Search, X, Plus } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { suggestedSkills } from '@/constants/onboarding';
import { StepProps, OnboardingSkill } from '@/types/onboarding';

export default function StepSkills({ data, onUpdate, onNext }: StepProps) {
  const [query, setQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const MIN_SKILLS = 5;
  const MAX_SKILLS = 30;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const addedNames = data.skills.map(s => s.name);
  const filtered = query.length > 0
    ? suggestedSkills.filter(s => s.toLowerCase().includes(query.toLowerCase()) && !addedNames.includes(s)).slice(0, 8)
    : suggestedSkills.filter(s => !addedNames.includes(s)).slice(0, 10);

  const addSkill = (name: string) => {
    if (data.skills.length >= MAX_SKILLS) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const skill: OnboardingSkill = { name, level: 'intermediate', yearsOfExperience: 1 };
    onUpdate({ skills: [...data.skills, skill] });
    setQuery('');
  };

  const addCustomSkill = () => {
    if (query.trim() && !addedNames.includes(query.trim()) && data.skills.length < MAX_SKILLS) {
      addSkill(query.trim());
    }
  };

  const removeSkill = (name: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onUpdate({ skills: data.skills.filter(s => s.name !== name) });
  };

  const isValid = data.skills.length >= MIN_SKILLS;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>⚡</Text>
          <Text style={styles.titleText}>What are your superpowers?</Text>
        </View>
        <Text style={styles.subtitle}>Add at least {MIN_SKILLS} skills for best matches (max {MAX_SKILLS})</Text>

        <View style={styles.searchWrapper}>
          <Search size={18} color="#9E9E9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills or type..."
            placeholderTextColor="#9E9E9E"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={addCustomSkill}
            returnKeyType="done"
            testID="skills-search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}><X size={16} color="#9E9E9E" /></Pressable>
          )}
        </View>

        {query.length > 0 && !suggestedSkills.some(s => s.toLowerCase() === query.toLowerCase()) && data.skills.length < MAX_SKILLS && (
          <Pressable style={styles.addCustomRow} onPress={addCustomSkill}>
            <Plus size={14} color="#111111" />
            <Text style={styles.addCustomText}>Add "{query}"</Text>
          </Pressable>
        )}

        {filtered.length > 0 && data.skills.length < MAX_SKILLS && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsLabel}>{query ? 'RESULTS' : 'SUGGESTIONS'}</Text>
            <View style={styles.chipGrid}>
              {filtered.map(s => (
                <Pressable key={s} style={styles.suggestionChip} onPress={() => addSkill(s)}>
                  <Plus size={12} color="#111111" />
                  <Text style={styles.suggestionChipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>Adding 5+ skills improves your match quality by 60%</Text>
        </View>

        {data.skills.length > 0 && (
          <View style={styles.addedSection}>
            <Text style={styles.addedLabel}>
              ADDED ({data.skills.length}/{MAX_SKILLS}) {isValid ? '✓' : ''}
            </Text>
            <View style={styles.chipGrid}>
              {data.skills.map(s => (
                <View key={s.name} style={styles.addedChip}>
                  <Text style={styles.addedChipText}>{s.name}</Text>
                  <Pressable onPress={() => removeSkill(s.name)} hitSlop={8}>
                    <X size={12} color="#616161" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomSection}>
        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!isValid}
          testID="next-button"
        >
          <Text style={[styles.nextButtonText, !isValid && styles.nextButtonTextDisabled]}>
            {isValid ? 'Next →' : `Add ${MIN_SKILLS - data.skills.length} more skill${MIN_SKILLS - data.skills.length !== 1 ? 's' : ''}`}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 36 },
  titleText: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1 },
  subtitle: { fontSize: 15, color: '#616161', marginBottom: 24 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 50, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: '#111111', fontSize: 15 },
  addCustomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8,
  },
  addCustomText: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  suggestionsSection: { marginBottom: 20 },
  suggestionsLabel: { fontSize: 11, fontWeight: '700' as const, color: '#9E9E9E', letterSpacing: 1, marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  suggestionChipText: { color: '#111111', fontSize: 13, fontWeight: '500' as const },
  addedSection: { marginTop: 8 },
  addedLabel: { fontSize: 11, fontWeight: '700' as const, color: '#10B981', letterSpacing: 1, marginBottom: 10 },
  addedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#111111',
  },
  addedChipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' as const },
  bottomSection: { paddingHorizontal: 24, paddingBottom: 24 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#E0E0E0' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  nextButtonTextDisabled: { color: '#9E9E9E' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
});
