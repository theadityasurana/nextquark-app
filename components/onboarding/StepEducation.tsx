import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Plus, GraduationCap, X, ChevronDown, Search, Check } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { degreeTypes, years } from '@/constants/onboarding';
import { universities } from '@/constants/universities';
import { StepProps, OnboardingEducation } from '@/types/onboarding';

type SubStep = 'list' | 'school' | 'degree' | 'field' | 'dates' | 'summary';

const emptyEdu: Omit<OnboardingEducation, 'id'> = {
  institution: '', degree: '', field: '', startYear: '', endYear: '',
};

export default function StepEducation({ data, onUpdate, onNext }: StepProps) {
  const [subStep, setSubStep] = useState<SubStep>('list');
  const [current, setCurrent] = useState<Omit<OnboardingEducation, 'id'>>(emptyEdu);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showStartYear, setShowStartYear] = useState(false);
  const [showEndYear, setShowEndYear] = useState(false);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universitySearch, setUniversitySearch] = useState('');
  const startYearScrollRef = useRef<ScrollView>(null);
  const endYearScrollRef = useRef<ScrollView>(null);

  const filteredUniversities = useMemo(() => {
    if (!universitySearch) return universities;
    return universities.filter(u => u.toLowerCase().includes(universitySearch.toLowerCase()));
  }, [universitySearch]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [subStep]);

  const saveEducation = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const edu: OnboardingEducation = { ...current, id: Date.now().toString() };
    onUpdate({ education: [...data.education, edu] });
    setCurrent(emptyEdu);
    setSubStep('summary');
  };

  const startNew = () => { setCurrent(emptyEdu); setSubStep('school'); };
  const removeEdu = (id: string) => { onUpdate({ education: data.education.filter(e => e.id !== id) }); };

  if (subStep === 'list' && data.education.length === 0) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>🎓</Text>
            <Text style={styles.titleText}>What's your education?</Text>
          </View>
          <Text style={styles.subtitle}>Let's add your highest degree first</Text>
        </View>
        <View style={styles.bottomButtons}>
          <Pressable style={styles.primaryButton} onPress={startNew}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Add Education</Text>
          </Pressable>
          <Pressable onPress={onNext}><Text style={styles.skipText}>Skip for now</Text></Pressable>
        </View>
      </Animated.View>
    );
  }

  if (subStep === 'summary' || (subStep === 'list' && data.education.length > 0)) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.titleText}>Education added:</Text>
          {data.education.map(edu => (
            <View key={edu.id} style={styles.eduCard}>
              <View style={styles.eduCardHeader}>
                <View style={styles.eduIconCircle}><GraduationCap size={16} color="#111111" /></View>
                <View style={styles.eduCardInfo}>
                  <Text style={styles.eduCardTitle}>{edu.degree} in {edu.field}</Text>
                  <Text style={styles.eduCardSchool}>{edu.institution}</Text>
                  <Text style={styles.eduCardDates}>{edu.startYear} - {edu.endYear}</Text>
                </View>
                <Pressable onPress={() => removeEdu(edu.id)} style={styles.removeButton}>
                  <X size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.bottomButtons}>
          <Pressable style={styles.outlineButton} onPress={startNew}>
            <Plus size={16} color="#111111" />
            <Text style={styles.outlineButtonText}>Add Another</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={onNext}>
            <Text style={styles.primaryButtonText}>Continue →</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  if (subStep === 'school') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.subStepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subStepLabel}>EDUCATION 1/4</Text>
          <View style={styles.titleRow}>
            <Text style={styles.subStepEmoji}>🏫</Text>
            <Text style={styles.subStepTitle}>Where did you study?</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SCHOOL / UNIVERSITY</Text>
            <View style={styles.dateSelect}>
              <TextInput
                style={styles.searchInputMain}
                placeholder="Select or type university"
                placeholderTextColor="#9E9E9E"
                value={universitySearch}
                onChangeText={(text) => {
                  setUniversitySearch(text);
                  setShowUniversityDropdown(true);
                }}
                onFocus={() => setShowUniversityDropdown(true)}
              />
              <ChevronDown size={14} color="#9E9E9E" />
            </View>
          </View>
          {showUniversityDropdown && filteredUniversities.length > 0 && (
            <View style={styles.dropdownContainer}>
              <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
                {universitySearch && !filteredUniversities.some(u => u.toLowerCase() === universitySearch.toLowerCase()) && (
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCurrent({ ...current, institution: universitySearch });
                      setShowUniversityDropdown(false);
                    }}
                  >
                    <Plus size={16} color="#6366f1" />
                    <Text style={styles.dropdownItemTextAdd}>Add "{universitySearch}"</Text>
                  </Pressable>
                )}
                {filteredUniversities.map(uni => (
                  <Pressable
                    key={uni}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCurrent({ ...current, institution: uni });
                      setUniversitySearch(uni);
                      setShowUniversityDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{uni}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
        <View style={styles.subStepBottom}>
          <Pressable style={[styles.primaryButton, !current.institution.trim() && styles.buttonDisabled]} onPress={() => { setShowUniversityDropdown(false); setSubStep('degree'); }} disabled={!current.institution.trim()}>
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (subStep === 'degree') {
    return (
      <ScrollView contentContainerStyle={styles.subStepContent}>
        <Text style={styles.subStepLabel}>EDUCATION 2/4</Text>
        <View style={styles.titleRow}>
          <Text style={styles.subStepEmoji}>📜</Text>
          <Text style={styles.subStepTitle}>What degree?</Text>
        </View>
        <View style={styles.chipGrid}>
          {degreeTypes.map(d => (
            <Pressable key={d} style={[styles.chip, current.degree === d && styles.chipSelected]} onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); setCurrent({ ...current, degree: d }); }}>
              <Text style={[styles.chipText, current.degree === d && styles.chipTextSelected]}>{d}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.subStepBottom}>
          <Pressable style={[styles.primaryButton, !current.degree && styles.buttonDisabled]} onPress={() => setSubStep('field')} disabled={!current.degree}>
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (subStep === 'field') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.subStepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subStepLabel}>EDUCATION 3/4</Text>
          <View style={styles.titleRow}>
            <Text style={styles.subStepEmoji}>📚</Text>
            <Text style={styles.subStepTitle}>Field of study?</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FIELD OF STUDY</Text>
            <TextInput style={styles.input} placeholder="Computer Science" placeholderTextColor="#9E9E9E" value={current.field} onChangeText={v => setCurrent({ ...current, field: v })} autoFocus />
          </View>
        </ScrollView>
        <View style={styles.subStepBottom}>
          <Pressable style={[styles.primaryButton, !current.field.trim() && styles.buttonDisabled]} onPress={() => setSubStep('dates')} disabled={!current.field.trim()}>
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (subStep === 'dates') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.subStepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subStepLabel}>EDUCATION 4/4</Text>
          <View style={styles.titleRow}>
            <Text style={styles.subStepEmoji}>📅</Text>
            <Text style={styles.subStepTitle}>When did you attend?</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>START YEAR</Text>
            <Pressable style={styles.dateSelect} onPress={() => setShowStartYear(!showStartYear)}>
              <Text style={current.startYear ? styles.dateValue : styles.datePlaceholder}>
                {current.startYear || 'Select year'}
              </Text>
              <ChevronDown size={14} color="#9E9E9E" />
            </Pressable>
          </View>
          <Modal visible={showStartYear} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setShowStartYear(false)}>
              <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Year</Text>
                  <Pressable onPress={() => setShowStartYear(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </Pressable>
                </View>
                <ScrollView style={styles.pickerScroll} ref={startYearScrollRef}>
                  {years.map(y => (
                    <Pressable key={y} style={styles.pickerItem}
                      onPress={() => { setCurrent({ ...current, startYear: y }); setShowStartYear(false); }}>
                      <Text style={[styles.pickerItemText, current.startYear === y && styles.pickerItemSelected]}>{y}</Text>
                      {current.startYear === y && <Check size={18} color="#111111" />}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>END YEAR</Text>
            <Pressable style={styles.dateSelect} onPress={() => setShowEndYear(!showEndYear)}>
              <Text style={current.endYear ? styles.dateValue : styles.datePlaceholder}>
                {current.endYear || 'Select year'}
              </Text>
              <ChevronDown size={14} color="#9E9E9E" />
            </Pressable>
          </View>
          <Modal visible={showEndYear} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setShowEndYear(false)}>
              <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Year</Text>
                  <Pressable onPress={() => setShowEndYear(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </Pressable>
                </View>
                <ScrollView style={styles.pickerScroll} ref={endYearScrollRef}>
                  {years.map(y => (
                    <Pressable key={y} style={styles.pickerItem}
                      onPress={() => { setCurrent({ ...current, endYear: y }); setShowEndYear(false); }}>
                      <Text style={[styles.pickerItemText, current.endYear === y && styles.pickerItemSelected]}>{y}</Text>
                      {current.endYear === y && <Check size={18} color="#111111" />}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Adding education details improves recruiter trust by 25%</Text>
          </View>
        </ScrollView>
        <View style={styles.subStepBottom}>
          <Pressable style={[styles.primaryButton, (!current.startYear || !current.endYear) && styles.buttonDisabled]} onPress={saveEducation} disabled={!current.startYear || !current.endYear}>
            <Text style={styles.primaryButtonText}>Save Education</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  content: { paddingTop: 20, alignItems: 'center' as const },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, justifyContent: 'center' as const },
  emoji: { fontSize: 36, marginBottom: 16 },
  titleText: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1, textAlign: 'center' as const },
  subtitle: { fontSize: 15, color: '#616161', marginBottom: 32, textAlign: 'center' as const },
  bottomButtons: { gap: 12 },
  primaryButton: { height: 56, borderRadius: 16, backgroundColor: '#111111', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  buttonDisabled: { backgroundColor: '#E0E0E0' },
  outlineButton: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outlineButtonText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  skipText: { color: '#616161', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  eduCard: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12 },
  eduCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eduIconCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center', justifyContent: 'center' },
  eduCardInfo: { flex: 1 },
  eduCardTitle: { color: '#111111', fontSize: 15, fontWeight: '700' as const },
  eduCardSchool: { color: '#616161', fontSize: 13, marginTop: 2 },
  eduCardDates: { color: '#9E9E9E', fontSize: 12, marginTop: 4 },
  removeButton: { padding: 4 },
  subStepContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  subStepLabel: { fontSize: 11, fontWeight: '700' as const, color: '#111111', letterSpacing: 1, marginBottom: 16 },
  subStepEmoji: { fontSize: 28 },
  subStepTitle: { fontSize: 22, fontWeight: '900' as const, color: '#111111', flex: 1 },
  subStepBottom: { paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
  inputGroup: { gap: 8, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  input: { height: 54, borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0', color: '#111111', fontSize: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0' },
  chipSelected: { borderColor: '#111111', backgroundColor: 'rgba(0,0,0,0.05)' },
  chipText: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  chipTextSelected: { color: '#111111' },
  dateSelect: {
    height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateValue: { color: '#111111', fontSize: 16 },
  datePlaceholder: { color: '#9E9E9E', fontSize: 16 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  pickerTitle: { fontSize: 18, fontWeight: '700' as const, color: '#111111' },
  pickerDone: { fontSize: 16, fontWeight: '600' as const, color: '#111111' },
  pickerScroll: { maxHeight: 400 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  pickerItemText: { fontSize: 16, color: '#616161' },
  pickerItemSelected: { color: '#111111', fontWeight: '600' as const },
  dropdownContainer: { backgroundColor: '#F5F5F5', borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', marginBottom: 16, maxHeight: 300 },
  searchInputMain: { flex: 1, fontSize: 16, color: '#111111' },
  dropdownList: { maxHeight: 250 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  dropdownItemText: { fontSize: 15, color: '#111111' },
  dropdownItemTextAdd: { fontSize: 15, color: '#6366f1', fontWeight: '600' as const },
});
