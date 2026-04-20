import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Check, X, Pencil, Briefcase, MapPin } from '@/components/ProfileIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import Colors from '@/constants/colors';
import { WorkExperience } from '@/types';
import WizardFooter, { getIncompleteSteps } from '@/components/WizardFooter';

const TAB_BAR_HEIGHT = 56;
const EXP_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const EXP_MODE_OPTIONS = ['Remote', 'Onsite', 'Hybrid'];

export default function EditExperienceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile: supabaseProfile, saveProfile } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const params = useLocalSearchParams<{ wizardMode?: string; wizardIndex?: string; wizardTotal?: string }>();
  const isWizard = params.wizardMode === '1';
  const wizardIndex = parseInt(params.wizardIndex || '0', 10);
  const wizardTotal = parseInt(params.wizardTotal || '0', 10);
  const incompleteSteps = isWizard ? getIncompleteSteps(supabaseProfile) : [];

  const [experiences, setExperiences] = useState<WorkExperience[]>(supabaseProfile?.experience || []);
  const [editing, setEditing] = useState<WorkExperience | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expSkills, setExpSkills] = useState('');
  const [expType, setExpType] = useState('Full-time');
  const [expMode, setExpMode] = useState('Onsite');
  const [expLocation, setExpLocation] = useState('');
  const [formTouched, setFormTouched] = useState(false);

  const resetForm = () => {
    setExpTitle(''); setExpCompany(''); setExpStartDate(''); setExpEndDate('');
    setExpDescription('• '); setExpIsCurrent(false); setExpSkills('');
    setExpType('Full-time'); setExpMode('Onsite'); setExpLocation('');
    setEditing(null); setFormTouched(false);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (exp: WorkExperience) => {
    setEditing(exp);
    setExpTitle(exp.title); setExpCompany(exp.company);
    setExpStartDate(exp.startDate); setExpEndDate(exp.endDate ?? '');
    setExpDescription(exp.description); setExpIsCurrent(exp.isCurrent);
    setExpSkills(exp.skills?.join(', ') ?? '');
    setExpType(exp.employmentType ?? 'Full-time');
    setExpMode(exp.workMode ?? 'Onsite');
    setExpLocation(exp.jobLocation ?? '');
    setShowForm(true);
  };

  const handleSave = () => {
    setFormTouched(true);
    if (!expTitle.trim() || !expCompany.trim()) return;
    const exp: WorkExperience = {
      id: editing?.id ?? `e${Date.now()}`,
      title: expTitle.trim(), company: expCompany.trim(),
      startDate: expStartDate.trim(),
      endDate: expIsCurrent ? null : expEndDate.trim(),
      isCurrent: expIsCurrent, description: expDescription.trim(),
      skills: expSkills.split(',').map(s => s.trim()).filter(Boolean),
      employmentType: expType, workMode: expMode,
      jobLocation: expMode === 'Remote' ? 'Remote' : expLocation.trim(),
    };
    if (editing) {
      setExperiences(prev => prev.map(e => e.id === editing.id ? exp : e));
    } else {
      setExperiences(prev => [...prev, exp]);
    }
    setShowForm(false); resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this experience?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setExperiences(prev => prev.filter(e => e.id !== id)) },
    ]);
  };

  const handleSaveAll = async () => {
    if (supabaseProfile) {
      await saveProfile({ ...supabaseProfile, experience: experiences });
    }
    router.back();
  };

  const handleSaveOnly = async () => {
    if (supabaseProfile) {
      await saveProfile({ ...supabaseProfile, experience: experiences });
    }
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= experiences.length) return;
    const arr = [...experiences];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setExperiences(arr);
  };

  const handleExpDescriptionChange = (text: string) => {
    if (text.endsWith('\n') && !text.endsWith('\n\n')) {
      setExpDescription(text + '• ');
    } else if (text === '' || text === '• ') {
      setExpDescription('');
    } else if (expDescription === '' && text.length > 0 && !text.startsWith('•')) {
      setExpDescription('• ' + text);
    } else {
      setExpDescription(text);
    }
  };

  if (showForm) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => { setShowForm(false); resetForm(); }}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{editing ? 'Edit Experience' : 'Add Experience'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior='padding' style={{ flex: 1 }} keyboardVerticalOffset={100}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.textSecondary }]}>Job Title *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: formTouched && !expTitle.trim() ? '#EF4444' : colors.borderLight }]} placeholder="e.g. Software Engineer" placeholderTextColor={colors.textTertiary} value={expTitle} onChangeText={setExpTitle} />
            {formTouched && !expTitle.trim() && <Text style={styles.fieldError}>Job title is required</Text>}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Company *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: formTouched && !expCompany.trim() ? '#EF4444' : colors.borderLight }]} placeholder="e.g. Google" placeholderTextColor={colors.textTertiary} value={expCompany} onChangeText={setExpCompany} />
            {formTouched && !expCompany.trim() && <Text style={styles.fieldError}>Company is required</Text>}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Employment Type</Text>
            <View style={styles.chipGrid}>
              {EXP_TYPE_OPTIONS.map(t => (
                <Pressable key={t} style={[styles.chip, { backgroundColor: expType === t ? colors.secondary : colors.surface, borderColor: expType === t ? colors.secondary : colors.borderLight }]} onPress={() => setExpType(t)}>
                  {expType === t && <Check size={12} color={colors.surface} />}
                  <Text style={[styles.chipText, { color: expType === t ? colors.surface : colors.textPrimary }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Work Mode</Text>
            <View style={styles.chipGrid}>
              {EXP_MODE_OPTIONS.map(m => (
                <Pressable key={m} style={[styles.chip, { backgroundColor: expMode === m ? colors.secondary : colors.surface, borderColor: expMode === m ? colors.secondary : colors.borderLight }]} onPress={() => setExpMode(m)}>
                  {expMode === m && <Check size={12} color={colors.surface} />}
                  <Text style={[styles.chipText, { color: expMode === m ? colors.surface : colors.textPrimary }]}>{m}</Text>
                </Pressable>
              ))}
            </View>
            {expMode !== 'Remote' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Job Location</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. San Francisco, CA" placeholderTextColor={colors.textTertiary} value={expLocation} onChangeText={setExpLocation} />
              </>
            )}
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Jan 2023" placeholderTextColor={colors.textTertiary} value={expStartDate} onChangeText={setExpStartDate} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>End Date</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }, expIsCurrent && { opacity: 0.5 }]} placeholder="e.g. Dec 2024" placeholderTextColor={colors.textTertiary} value={expIsCurrent ? 'Present' : expEndDate} onChangeText={setExpEndDate} editable={!expIsCurrent} />
              </View>
            </View>
            <Pressable style={styles.checkboxRow} onPress={() => setExpIsCurrent(!expIsCurrent)}>
              <View style={[styles.checkbox, { borderColor: colors.borderLight }, expIsCurrent && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                {expIsCurrent && <Check size={12} color="#FFF" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>I currently work here</Text>
            </Pressable>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Skills (comma-separated)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. React, TypeScript" placeholderTextColor={colors.textTertiary} value={expSkills} onChangeText={setExpSkills} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="Describe your role..." placeholderTextColor={colors.textTertiary} value={expDescription} onChangeText={handleExpDescriptionChange} multiline numberOfLines={4} />
            <View style={{ height: 70 }} />
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT, backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSave}>
            <Check size={16} color={colors.surface} />
            <Text style={[styles.saveBtnText, { color: colors.surface }]}>{editing ? 'Update' : 'Add'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#1B2838', '#2C3E50', colors.background]} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtnGrad} onPress={handleSaveAll}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitleGrad}>Experience</Text>
          <Pressable style={styles.backBtnGrad} onPress={openAdd}>
            <Plus size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=200&fit=crop' }} style={styles.heroBanner} />
        <Text style={[styles.heroSubtext, { color: colors.textPrimary }]}>Add your work history to stand out</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.listContent}>
        {experiences.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Briefcase size={32} color="#1B2838" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No experience yet</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Tap + above to add your work history</Text>
            <Pressable style={[styles.emptyAddBtn, { backgroundColor: colors.secondary }]} onPress={openAdd}>
              <Plus size={16} color={colors.surface} />
              <Text style={[styles.emptyAddBtnText, { color: colors.surface }]}>Add Experience</Text>
            </Pressable>
          </View>
        )}
        {experiences.map((exp, idx) => (
          <View key={exp.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
            <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => openEdit(exp)}>
              <View style={[styles.itemIcon, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#EEEEEE' }]}>
                <Briefcase size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{exp.title}</Text>
                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{exp.company}</Text>
                <Text style={[styles.itemDate, { color: colors.textTertiary }]}>{exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}</Text>
              </View>
            </Pressable>
            <View style={styles.reorderCol}>
              <Pressable onPress={() => moveItem(idx, -1)} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.2 : 1 }}>
                <ArrowLeft size={14} color={colors.textTertiary} style={{ transform: [{ rotate: '90deg' }] }} />
              </Pressable>
              <Pressable onPress={() => moveItem(idx, 1)} disabled={idx === experiences.length - 1} style={{ opacity: idx === experiences.length - 1 ? 0.2 : 1 }}>
                <ArrowLeft size={14} color={colors.textTertiary} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Pressable>
            </View>
            <Pressable onPress={() => handleDelete(exp.id)} hitSlop={8}>
              <X size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {isWizard ? (
        <WizardFooter
          wizardIndex={wizardIndex}
          wizardTotal={wizardTotal}
          incompleteSteps={incompleteSteps}
          onSaveCurrent={handleSaveOnly}
        />
      ) : (
        <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT, backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSaveAll}>
            <Check size={16} color={colors.surface} />
            <Text style={[styles.saveBtnText, { color: colors.surface }]}>Save</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroGradient: { paddingHorizontal: 16, paddingBottom: 18 },
  backBtnGrad: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleGrad: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroSubtext: { fontSize: 15, textAlign: 'center', marginTop: 4, fontWeight: '500', lineHeight: 21 },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { padding: 16, gap: 10 },
  formContent: { padding: 16, paddingBottom: 20 },
  stickyFooter: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700' },
  reorderCol: { gap: 6, alignItems: 'center' },
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: -6, marginBottom: 6 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 13, marginTop: 2 },
  itemDate: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  dateRow: { flexDirection: 'row', gap: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxLabel: { fontSize: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10, marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
});
