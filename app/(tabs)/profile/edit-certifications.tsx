import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Check, X, Award } from '@/components/ProfileIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import { Certification } from '@/types';
import WizardFooter, { getIncompleteSteps } from '@/components/WizardFooter';

export default function EditCertificationsScreen() {
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

  const [items, setItems] = useState<Certification[]>(supabaseProfile?.certifications || []);
  const [editing, setEditing] = useState<Certification | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [url, setUrl] = useState('');
  const [skills, setSkills] = useState('');

  const resetForm = () => { setName(''); setOrg(''); setUrl(''); setSkills(''); setEditing(null); };
  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (c: Certification) => { setEditing(c); setName(c.name); setOrg(c.issuingOrganization); setUrl(c.credentialUrl); setSkills(c.skills.join(', ')); setShowForm(true); };

  const handleSave = () => {
    if (!name.trim() || !org.trim()) { Alert.alert('Required', 'Fill in name and organization'); return; }
    const c: Certification = { id: editing?.id ?? `c${Date.now()}`, name: name.trim(), issuingOrganization: org.trim(), credentialUrl: url.trim(), skills: skills.split(',').map(s => s.trim()).filter(Boolean) };
    if (editing) { setItems(prev => prev.map(i => i.id === editing.id ? c : i)); } else { setItems(prev => [...prev, c]); }
    setShowForm(false); resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this certification?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) }]);
  };

  const handleSaveAll = async () => { if (supabaseProfile) await saveProfile({ ...supabaseProfile, certifications: items }); router.back(); };
  const handleSaveOnly = async () => { if (supabaseProfile) await saveProfile({ ...supabaseProfile, certifications: items }); };

  if (showForm) {
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={() => { setShowForm(false); resetForm(); }}><ArrowLeft size={22} color={colors.textPrimary} /></Pressable>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{editing ? 'Edit Certification' : 'Add Certification'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
            <Text style={[s.label, { color: colors.textSecondary }]}>Name *</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. AWS Solutions Architect" placeholderTextColor={colors.textTertiary} value={name} onChangeText={setName} />
            <Text style={[s.label, { color: colors.textSecondary }]}>Issuing Organization *</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Amazon Web Services" placeholderTextColor={colors.textTertiary} value={org} onChangeText={setOrg} />
            <Text style={[s.label, { color: colors.textSecondary }]}>Credential URL</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="https://..." placeholderTextColor={colors.textTertiary} value={url} onChangeText={setUrl} autoCapitalize="none" />
            <Text style={[s.label, { color: colors.textSecondary }]}>Skills (comma-separated)</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. AWS, Cloud" placeholderTextColor={colors.textTertiary} value={skills} onChangeText={setSkills} />
            <Pressable style={[s.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSave}><Check size={18} color={colors.surface} /><Text style={[s.saveBtnText, { color: colors.surface }]}>{editing ? 'Update' : 'Add'}</Text></Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={handleSaveAll}><ArrowLeft size={22} color={colors.textPrimary} /></Pressable>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Licenses & Certifications</Text>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={openAdd}><Plus size={22} color={colors.textPrimary} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.listContent}>
        {items.length === 0 && <Text style={[s.emptyText, { color: colors.textTertiary }]}>No certifications yet. Tap + to add.</Text>}
        {items.map(c => (
          <Pressable key={c.id} style={[s.itemCard, { backgroundColor: colors.surface }]} onPress={() => openEdit(c)}>
            <View style={[s.itemIcon, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#FFF3E0' }]}><Award size={18} color={colors.warning} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemTitle, { color: colors.textPrimary }]}>{c.name}</Text>
              <Text style={[s.itemSub, { color: colors.textSecondary }]}>{c.issuingOrganization}</Text>
            </View>
            <Pressable onPress={() => handleDelete(c.id)} hitSlop={8}><X size={16} color={colors.textTertiary} /></Pressable>
          </Pressable>
        ))}
      </ScrollView>
      {isWizard && (
        <WizardFooter
          wizardIndex={wizardIndex}
          wizardTotal={wizardTotal}
          incompleteSteps={incompleteSteps}
          onSaveCurrent={handleSaveOnly}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }, headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { padding: 16, gap: 10 }, formContent: { padding: 16, paddingBottom: 40 }, emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700' }, itemSub: { fontSize: 13, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
