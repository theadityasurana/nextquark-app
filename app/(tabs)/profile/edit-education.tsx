import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Check, X, GraduationCap, ChevronDown } from '@/components/ProfileIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import Colors from '@/constants/colors';
import { Education } from '@/types';
import { universities } from '@/constants/universities';
import WizardFooter, { getIncompleteSteps } from '@/components/WizardFooter';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

export default function EditEducationScreen() {
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

  const [items, setItems] = useState<Education[]>(supabaseProfile?.education || []);
  const [editing, setEditing] = useState<Education | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [field, setField] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [achievements, setAchievements] = useState('');
  const [extracurriculars, setExtracurriculars] = useState('');
  const [uniSearch, setUniSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  const resetForm = () => {
    setInstitution(''); setDegree(''); setField(''); setStartDate(''); setEndDate('');
    setDescription(''); setAchievements(''); setExtracurriculars('');
    setUniSearch(''); setShowDropdown(false); setEditing(null); setFormTouched(false);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (edu: Education) => {
    setEditing(edu);
    setInstitution(edu.institution); setDegree(edu.degree); setField(edu.field);
    setStartDate(edu.startDate); setEndDate(edu.endDate);
    setDescription(edu.description ?? ''); setAchievements(edu.achievements ?? '');
    setExtracurriculars(edu.extracurriculars ?? ''); setUniSearch(edu.institution);
    setShowForm(true);
  };

  const handleSave = () => {
    setFormTouched(true);
    if (!institution.trim() || !degree.trim()) return;
    const edu: Education = {
      id: editing?.id ?? `ed${Date.now()}`, institution: institution.trim(), degree: degree.trim(),
      field: field.trim(), startDate: startDate.trim(), endDate: endDate.trim(),
      description: description.trim() || undefined, achievements: achievements.trim() || undefined,
      extracurriculars: extracurriculars.trim() || undefined,
    };
    if (editing) { setItems(prev => prev.map(e => e.id === editing.id ? edu : e)); }
    else { setItems(prev => [...prev, edu]); }
    setShowForm(false); resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this education?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(e => e.id !== id)) },
    ]);
  };

  const handleSaveAll = async () => {
    if (supabaseProfile) { await saveProfile({ ...supabaseProfile, education: items }); }
    router.back();
  };

  const handleSaveOnly = async () => {
    if (supabaseProfile) { await saveProfile({ ...supabaseProfile, education: items }); }
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const arr = [...items];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setItems(arr);
  };

  if (showForm) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => { setShowForm(false); resetForm(); }}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{editing ? 'Edit Education' : 'Add Education'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.textSecondary }]}>Institution *</Text>
            <View style={[styles.uniInputWrap, { backgroundColor: colors.surface, borderColor: formTouched && !institution.trim() ? '#EF4444' : colors.borderLight }]}>
              <TextInput style={[styles.uniInput, { color: colors.textPrimary }]} placeholder="Select or type university" placeholderTextColor={colors.textTertiary} value={uniSearch} onChangeText={t => { setUniSearch(t); setInstitution(t); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
              <ChevronDown size={14} color={colors.textTertiary} />
            </View>
            {formTouched && !institution.trim() && <Text style={styles.fieldError}>Institution is required</Text>}
            {showDropdown && (
              <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {uniSearch && !universities.some(u => u.toLowerCase() === uniSearch.toLowerCase()) && (
                    <Pressable style={styles.dropdownItem} onPress={() => { setInstitution(uniSearch); setShowDropdown(false); }}>
                      <Plus size={14} color={colors.accent} /><Text style={[styles.dropdownAdd, { color: colors.accent }]}>Add "{uniSearch}"</Text>
                    </Pressable>
                  )}
                  {universities.filter(u => !uniSearch || u.toLowerCase().includes(uniSearch.toLowerCase())).slice(0, 30).map(uni => (
                    <Pressable key={uni} style={styles.dropdownItem} onPress={() => { setInstitution(uni); setUniSearch(uni); setShowDropdown(false); }}>
                      <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>{uni}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Degree *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: formTouched && !degree.trim() ? '#EF4444' : colors.borderLight }]} placeholder="e.g. Bachelor's" placeholderTextColor={colors.textTertiary} value={degree} onChangeText={setDegree} />
            {formTouched && !degree.trim() && <Text style={styles.fieldError}>Degree is required</Text>}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Field of Study</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Computer Science" placeholderTextColor={colors.textTertiary} value={field} onChangeText={setField} />
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.textSecondary }]}>Start Year</Text><TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. 2016" placeholderTextColor={colors.textTertiary} value={startDate} onChangeText={setStartDate} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.textSecondary }]}>End Year</Text><TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. 2020" placeholderTextColor={colors.textTertiary} value={endDate} onChangeText={setEndDate} /></View>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="Describe your time..." placeholderTextColor={colors.textTertiary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Achievements</Text>
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="Dean's List, Awards..." placeholderTextColor={colors.textTertiary} value={achievements} onChangeText={setAchievements} multiline numberOfLines={2} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Extracurriculars</Text>
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="Clubs, Sports..." placeholderTextColor={colors.textTertiary} value={extracurriculars} onChangeText={setExtracurriculars} multiline numberOfLines={2} />
            <View style={{ height: 70 }} />
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT, backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSave}>
            <Check size={16} color={colors.surface} /><Text style={[styles.saveBtnText, { color: colors.surface }]}>{editing ? 'Update' : 'Add'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0C2D48', '#145374', colors.background]} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtnGrad} onPress={handleSaveAll}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitleGrad}>Education</Text>
          <Pressable style={styles.backBtnGrad} onPress={openAdd}>
            <Plus size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=200&fit=crop' }} style={styles.heroBanner} />
        <Text style={[styles.heroSubtext, { color: colors.textPrimary }]}>Your academic background and qualifications</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.listContent}>
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <GraduationCap size={32} color="#0C2D48" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No education yet</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Tap + above to add your academic background</Text>
            <Pressable style={[styles.emptyAddBtn, { backgroundColor: colors.secondary }]} onPress={openAdd}>
              <Plus size={16} color={colors.surface} />
              <Text style={[styles.emptyAddBtnText, { color: colors.surface }]}>Add Education</Text>
            </Pressable>
          </View>
        )}
        {items.map((edu, idx) => (
          <View key={edu.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
            <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => openEdit(edu)}>
              <View style={[styles.itemIcon, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#EEEEEE' }]}>
                <GraduationCap size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{edu.degree} in {edu.field}</Text>
                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{edu.institution}</Text>
                <Text style={[styles.itemDate, { color: colors.textTertiary }]}>{edu.startDate} — {edu.endDate}</Text>
              </View>
            </Pressable>
            <View style={styles.reorderCol}>
              <Pressable onPress={() => moveItem(idx, -1)} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.2 : 1 }}>
                <ArrowLeft size={14} color={colors.textTertiary} style={{ transform: [{ rotate: '90deg' }] }} />
              </Pressable>
              <Pressable onPress={() => moveItem(idx, 1)} disabled={idx === items.length - 1} style={{ opacity: idx === items.length - 1 ? 0.2 : 1 }}>
                <ArrowLeft size={14} color={colors.textTertiary} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Pressable>
            </View>
            <Pressable onPress={() => handleDelete(edu.id)} hitSlop={8}><X size={16} color={colors.textTertiary} /></Pressable>
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
  emptyIconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
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
  dateRow: { flexDirection: 'row', gap: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10, marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  uniInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, borderWidth: 1 },
  uniInput: { flex: 1, fontSize: 15 },
  dropdown: { borderRadius: 12, borderWidth: 1, marginBottom: 8, maxHeight: 220 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  dropdownText: { fontSize: 14 },
  dropdownAdd: { fontSize: 14, fontWeight: '600' },
});
