import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Plus, Briefcase, MapPin, ChevronDown, Check, X } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { employmentTypes, months, years } from '@/constants/onboarding';
import { StepProps, OnboardingWorkExp } from '@/types/onboarding';

type SubStep = 'list' | 'title' | 'company' | 'type' | 'dates' | 'description' | 'summary';

const emptyExp: Omit<OnboardingWorkExp, 'id'> = {
  title: '', company: '', employmentType: '', location: '',
  isRemote: false, startMonth: '', startYear: '', endMonth: '', endYear: '',
  isCurrent: false, description: '',
};

export default function StepExperience({ data, onUpdate, onNext }: StepProps) {
  const [subStep, setSubStep] = useState<SubStep>('list');
  const [current, setCurrent] = useState<Omit<OnboardingWorkExp, 'id'>>(emptyExp);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showStartMonth, setShowStartMonth] = useState(false);
  const [showEndMonth, setShowEndMonth] = useState(false);
  const [showStartYear, setShowStartYear] = useState(false);
  const [showEndYear, setShowEndYear] = useState(false);
  const startMonthScrollRef = useRef<ScrollView>(null);
  const endMonthScrollRef = useRef<ScrollView>(null);
  const startYearScrollRef = useRef<ScrollView>(null);
  const endYearScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [subStep]);

  const saveExperience = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const exp: OnboardingWorkExp = { ...current, id: editingId || Date.now().toString() };
    if (editingId) {
      onUpdate({ workExperience: data.workExperience.map(e => e.id === editingId ? exp : e) });
    } else {
      onUpdate({ workExperience: [...data.workExperience, exp] });
    }
    setCurrent(emptyExp);
    setEditingId(null);
    setSubStep('summary');
  };

  const startNew = () => {
    setCurrent(emptyExp);
    setEditingId(null);
    setSubStep('title');
  };

  const removeExp = (id: string) => {
    onUpdate({ workExperience: data.workExperience.filter(e => e.id !== id) });
  };

  if (subStep === 'list' && data.workExperience.length === 0) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: '#FFFFFF' }]}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>💼</Text>
            <Text style={styles.titleText}>Tell us about your work experience</Text>
          </View>
          <Text style={styles.subtitle}>Let's start with your most recent job</Text>
        </View>
        <View style={styles.bottomButtons}>
          <Pressable style={styles.primaryButton} onPress={startNew}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Add Your First Job</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onNext}>
            <Text style={styles.secondaryButtonText}>I'm just starting my career</Text>
          </Pressable>
          <Pressable onPress={onNext}><Text style={styles.skipText}>Skip for now</Text></Pressable>
        </View>
      </Animated.View>
    );
  }

  if (subStep === 'summary' || (subStep === 'list' && data.workExperience.length > 0)) {
    const totalMonths = data.workExperience.reduce((acc, e) => {
      const startYear = parseInt(e.startYear) || 2024;
      const startMonth = months.indexOf(e.startMonth) + 1 || 1;
      const endYear = e.isCurrent ? new Date().getFullYear() : (parseInt(e.endYear) || 2026);
      const endMonth = e.isCurrent ? new Date().getMonth() + 1 : (months.indexOf(e.endMonth) + 1 || 12);
      const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
      return acc + monthsDiff;
    }, 0);
    const totalYears = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: '#FFFFFF' }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.titleText}>Great! You've added:</Text>
          {data.workExperience.map(exp => (
            <View key={exp.id} style={styles.expCard}>
              <View style={styles.expCardHeader}>
                <View style={styles.expIconCircle}><Briefcase size={16} color="#111111" /></View>
                <View style={styles.expCardInfo}>
                  <Text style={styles.expCardTitle}>{exp.title}</Text>
                  <Text style={styles.expCardCompany}>{exp.company}</Text>
                  <Text style={styles.expCardDates}>
                    {exp.startMonth} {exp.startYear} - {exp.isCurrent ? 'Present' : `${exp.endMonth} ${exp.endYear}`}
                  </Text>
                </View>
                <Pressable onPress={() => removeExp(exp.id)} style={styles.removeButton}>
                  <X size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))}
          <Text style={styles.totalExp}>Total: {totalYears} {totalYears === 1 ? 'year' : 'years'}{remainingMonths > 0 ? `, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}` : ''}</Text>
        </ScrollView>
        <View style={styles.bottomButtons}>
          <Pressable style={styles.outlineButton} onPress={startNew}>
            <Plus size={16} color="#111111" />
            <Text style={styles.outlineButtonText}>Add Another Job</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={onNext}>
            <Text style={styles.primaryButtonText}>Continue →</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  if (subStep === 'title') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.subStepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subStepLabel}>WORK EXPERIENCE 1/5</Text>
          <View style={styles.titleRow}>
            <Text style={styles.subStepEmoji}>✏️</Text>
            <Text style={styles.subStepTitle}>What was your job title?</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>JOB TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="Senior Product Designer"
              placeholderTextColor="#9E9E9E"
              value={current.title}
              onChangeText={v => setCurrent({ ...current, title: v })}
              autoFocus
            />
          </View>
        </ScrollView>
        <View style={styles.subStepBottom}>
          <Pressable
            style={[styles.primaryButton, !current.title.trim() && styles.buttonDisabled]}
            onPress={() => setSubStep('company')}
            disabled={!current.title.trim()}
          >
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (subStep === 'company') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.subStepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subStepLabel}>WORK EXPERIENCE 2/5</Text>
          <View style={styles.titleRow}>
            <Text style={styles.subStepEmoji}>🏢</Text>
            <Text style={styles.subStepTitle}>Which company?</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>COMPANY NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Google, Meta, etc."
              placeholderTextColor="#9E9E9E"
              value={current.company}
              onChangeText={v => setCurrent({ ...current, company: v })}
              autoFocus
            />
          </View>
        </ScrollView>
        <View style={styles.subStepBottom}>
          <Pressable
            style={[styles.primaryButton, !current.company.trim() && styles.buttonDisabled]}
            onPress={() => setSubStep('type')}
            disabled={!current.company.trim()}
          >
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (subStep === 'type') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.subStepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subStepLabel}>WORK EXPERIENCE 3/5</Text>
          <Text style={styles.typeLabel}>EMPLOYMENT TYPE</Text>
          <View style={styles.chipGrid}>
            {employmentTypes.map(type => (
              <Pressable
                key={type}
                style={[styles.chip, current.employmentType === type && styles.chipSelected]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setCurrent({ ...current, employmentType: type });
                }}
              >
                <Text style={[styles.chipText, current.employmentType === type && styles.chipTextSelected]}>{type}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>LOCATION</Text>
            <View style={styles.inputRow}>
              <MapPin size={16} color="#9E9E9E" />
              <TextInput
                style={styles.inputFlex}
                placeholder="San Francisco, CA"
                placeholderTextColor="#9E9E9E"
                value={current.location}
                onChangeText={v => setCurrent({ ...current, location: v })}
              />
            </View>
          </View>

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setCurrent({ ...current, isRemote: !current.isRemote })}
          >
            <View style={[styles.checkbox, current.isRemote && styles.checkboxChecked]}>
              {current.isRemote && <Check size={12} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>This was a remote position</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.subStepBottom}>
          <Pressable
            style={[styles.primaryButton, !current.employmentType && styles.buttonDisabled]}
            onPress={() => setSubStep('dates')}
            disabled={!current.employmentType}
          >
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (subStep === 'dates') {
    const duration = (() => {
      if (!current.startYear || (!current.isCurrent && !current.endYear)) return '';
      const startYear = parseInt(current.startYear);
      const startMonth = months.indexOf(current.startMonth) + 1 || 1;
      const endYear = current.isCurrent ? new Date().getFullYear() : parseInt(current.endYear);
      const endMonth = current.isCurrent ? new Date().getMonth() + 1 : (months.indexOf(current.endMonth) + 1 || 12);
      const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
      const years = Math.floor(totalMonths / 12);
      const remainingMonths = totalMonths % 12;
      if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
      if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
      return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    })();

    return (
      <ScrollView contentContainerStyle={styles.subStepContent}>
        <Text style={styles.subStepLabel}>WORK EXPERIENCE 4/5</Text>
        <View style={styles.titleRow}>
          <Text style={styles.subStepEmoji}>📅</Text>
          <Text style={styles.subStepTitle}>When did you work here?</Text>
        </View>

        <Text style={styles.dateLabel}>START DATE</Text>
        <View style={styles.dateRow}>
          <Pressable style={styles.dateSelect} onPress={() => setShowStartMonth(!showStartMonth)}>
            <Text style={current.startMonth ? styles.dateValue : styles.datePlaceholder}>
              {current.startMonth || 'Month'}
            </Text>
            <ChevronDown size={14} color="#9E9E9E" />
          </Pressable>
          <Pressable style={styles.dateSelect} onPress={() => setShowStartYear(!showStartYear)}>
            <Text style={current.startYear ? styles.dateValue : styles.datePlaceholder}>
              {current.startYear || 'Year'}
            </Text>
            <ChevronDown size={14} color="#9E9E9E" />
          </Pressable>
        </View>
        <Modal visible={showStartMonth} transparent animationType="slide" onRequestClose={() => setShowStartMonth(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowStartMonth(false)}>
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Month</Text>
                <Pressable onPress={() => setShowStartMonth(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.pickerScroll} ref={startMonthScrollRef}>
                {months.map(m => (
                  <Pressable key={m} style={styles.pickerItem}
                    onPress={() => { setCurrent({ ...current, startMonth: m }); setShowStartMonth(false); }}>
                    <Text style={[styles.pickerItemText, current.startMonth === m && styles.pickerItemSelected]}>{m}</Text>
                    {current.startMonth === m && <Check size={18} color="#111111" />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
        <Modal visible={showStartYear} transparent animationType="slide" onRequestClose={() => setShowStartYear(false)}>
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

        {!current.isCurrent && (
          <>
            <Text style={[styles.dateLabel, { marginTop: 20 }]}>END DATE</Text>
            <View style={styles.dateRow}>
              <Pressable style={styles.dateSelect} onPress={() => setShowEndMonth(!showEndMonth)}>
                <Text style={current.endMonth ? styles.dateValue : styles.datePlaceholder}>
                  {current.endMonth || 'Month'}
                </Text>
                <ChevronDown size={14} color="#9E9E9E" />
              </Pressable>
              <Pressable style={styles.dateSelect} onPress={() => setShowEndYear(!showEndYear)}>
                <Text style={current.endYear ? styles.dateValue : styles.datePlaceholder}>
                  {current.endYear || 'Year'}
                </Text>
                <ChevronDown size={14} color="#9E9E9E" />
              </Pressable>
            </View>
            <Modal visible={showEndMonth} transparent animationType="slide" onRequestClose={() => setShowEndMonth(false)}>
              <Pressable style={styles.modalOverlay} onPress={() => setShowEndMonth(false)}>
                <View style={styles.pickerModal}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Month</Text>
                    <Pressable onPress={() => setShowEndMonth(false)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </Pressable>
                  </View>
                  <ScrollView style={styles.pickerScroll} ref={endMonthScrollRef}>
                    {months.map(m => (
                      <Pressable key={m} style={styles.pickerItem}
                        onPress={() => { setCurrent({ ...current, endMonth: m }); setShowEndMonth(false); }}>
                        <Text style={[styles.pickerItemText, current.endMonth === m && styles.pickerItemSelected]}>{m}</Text>
                        {current.endMonth === m && <Check size={18} color="#111111" />}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
            <Modal visible={showEndYear} transparent animationType="slide" onRequestClose={() => setShowEndYear(false)}>
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
          </>
        )}

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setCurrent({ ...current, isCurrent: !current.isCurrent, endMonth: '', endYear: '' })}
        >
          <View style={[styles.checkbox, current.isCurrent && styles.checkboxChecked]}>
            {current.isCurrent && <Check size={12} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkboxLabel}>I currently work here</Text>
        </Pressable>

        {duration ? <Text style={styles.durationText}>Duration: {duration}</Text> : null}

        <View style={styles.subStepBottom}>
          <Pressable
            style={[styles.primaryButton, (!current.startYear || (!current.isCurrent && !current.endYear)) && styles.buttonDisabled]}
            onPress={() => setSubStep('description')}
            disabled={!current.startYear || (!current.isCurrent && !current.endYear)}
          >
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (subStep === 'description') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.subStepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subStepLabel}>WORK EXPERIENCE 5/5</Text>
          <View style={styles.titleRow}>
            <Text style={styles.subStepEmoji}>✍️</Text>
            <Text style={styles.subStepTitle}>What did you do there?</Text>
          </View>
          <Text style={styles.descSubtitle}>Tell us about your role and achievements</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Detailed descriptions increase interview invitations by 35%</Text>
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Led design team of 8 people, shipped 15+ features..."
            placeholderTextColor="#9E9E9E"
            value={current.description}
            onChangeText={v => setCurrent({ ...current, description: v })}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{current.description.length}/1000</Text>
        </ScrollView>
        <View style={styles.subStepBottom}>
          <Pressable style={styles.primaryButton} onPress={saveExperience}>
            <Text style={styles.primaryButtonText}>Save Experience</Text>
          </Pressable>
          <Pressable onPress={saveExperience}><Text style={styles.skipText}>Skip description</Text></Pressable>
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
  emoji: { fontSize: 36 },
  titleText: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1, textAlign: 'center' as const },
  subtitle: { fontSize: 15, color: '#616161', marginBottom: 32, textAlign: 'center' as const },
  bottomButtons: { gap: 12 },
  primaryButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  buttonDisabled: { backgroundColor: '#E0E0E0' },
  secondaryButton: {
    height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryButtonText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  outlineButton: {
    height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  outlineButtonText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  skipText: { color: '#616161', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  expCard: {
    backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12,
  },
  expCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  expIconCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EEEEEE', alignItems: 'center', justifyContent: 'center',
  },
  expCardInfo: { flex: 1 },
  expCardTitle: { color: '#111111', fontSize: 15, fontWeight: '700' as const },
  expCardCompany: { color: '#616161', fontSize: 13, marginTop: 2 },
  expCardDates: { color: '#9E9E9E', fontSize: 12, marginTop: 4 },
  removeButton: { padding: 4 },
  totalExp: { color: '#616161', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  subStepContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  subStepLabel: { fontSize: 11, fontWeight: '700' as const, color: '#111111', letterSpacing: 1, marginBottom: 16 },
  subStepEmoji: { fontSize: 28 },
  subStepTitle: { fontSize: 22, fontWeight: '900' as const, color: '#111111', flex: 1 },
  descSubtitle: { color: '#616161', fontSize: 14, marginBottom: 20, marginTop: -16 },
  subStepBottom: { paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
  inputGroup: { gap: 8, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  input: {
    height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  inputFlex: { flex: 1, color: '#111111', fontSize: 16 },
  typeLabel: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1, marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  chipSelected: { borderColor: '#111111', backgroundColor: 'rgba(0,0,0,0.05)' },
  chipText: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  chipTextSelected: { color: '#111111' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#111111', borderColor: '#111111' },
  checkboxLabel: { color: '#111111', fontSize: 14 },
  dateLabel: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1, marginBottom: 10 },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dateSelect: {
    flex: 1, height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateValue: { color: '#111111', fontSize: 15 },
  datePlaceholder: { color: '#9E9E9E', fontSize: 15 },
  yearInput: { flex: 1, color: '#111111', fontSize: 15 },
  durationText: { color: '#10B981', fontSize: 14, fontWeight: '600' as const, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  pickerTitle: { fontSize: 18, fontWeight: '700' as const, color: '#111111' },
  pickerDone: { fontSize: 16, fontWeight: '600' as const, color: '#111111' },
  pickerScroll: { maxHeight: 400 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  pickerItemText: { fontSize: 16, color: '#616161' },
  pickerItemSelected: { color: '#111111', fontWeight: '600' as const },
  textArea: {
    minHeight: 140, borderRadius: 14, padding: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 15, lineHeight: 22,
  },
  charCount: { color: '#9E9E9E', fontSize: 11, alignSelf: 'flex-end', marginTop: 6 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
});
