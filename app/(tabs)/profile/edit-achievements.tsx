import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Check, X, Trophy } from '@/components/ProfileIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import { Achievement } from '@/types';
import WizardFooter, { getIncompleteSteps } from '@/components/WizardFooter';

export default function EditAchievementsScreen() {
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

  const [items, setItems] = useState<Achievement[]>(supabaseProfile?.achievements || []);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => { setTitle(''); setIssuer(''); setDate(''); setDescription(''); setEditing(null); };
  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (a: Achievement) => { setEditing(a); setTitle(a.title); setIssuer(a.issuer); setDate(a.date); setDescription(a.description ?? ''); setShowForm(true); };

  const handleSave = () => {
    if (!title.trim() || !issuer.trim()) { Alert.alert('Required', 'Fill in title and issuer'); return; }
    const a: Achievement = { id: editing?.id ?? `ach${Date.now()}`, title: title.trim(), issuer: issuer.trim(), date: date.trim(), description: description.trim() || undefined };
    if (editing) { setItems(prev => prev.map(i => i.id === editing.id ? a : i)); } else { setItems(prev => [...prev, a]); }
    setShowForm(false); resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this achievement?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) }]);
  };

  const handleSaveAll = async () => { if (supabaseProfile) await saveProfile({ ...supabaseProfile, achievements: items }); router.back(); };
  const handleSaveOnly = async () => { if (supabaseProfile) await saveProfile({ ...supabaseProfile, achievements: items }); };

  if (showForm) {
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={() => { setShowForm(false); resetForm(); }}><ArrowLeft size={22} color={colors.textPrimary} /></Pressable>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{editing ? 'Edit Achievement' : 'Add Achievement'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
            <Text style={[s.label, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Best Innovation Award" placeholderTextColor={colors.textTertiary} value={title} onChangeText={setTitle} />
            <Text style={[s.label, { color: colors.textSecondary }]}>Issuer *</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. TechCorp" placeholderTextColor={colors.textTertiary} value={issuer} onChangeText={setIssuer} />
            <Text style={[s.label, { color: colors.textSecondary }]}>Date</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. 2024" placeholderTextColor={colors.textTertiary} value={date} onChangeText={setDate} />
            <Text style={[s.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput style={[s.input, s.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="Describe..." placeholderTextColor={colors.textTertiary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
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
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Achievements & Honors</Text>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={openAdd}><Plus size={22} color={colors.textPrimary} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.listContent}>
        {items.length === 0 && <Text style={[s.emptyText, { color: colors.textTertiary }]}>No achievements yet. Tap + to add.</Text>}
        {items.map(a => (
          <Pressable key={a.id} style={[s.itemCard, { backgroundColor: colors.surface }]} onPress={() => openEdit(a)}>
            <View style={[s.itemIcon, { backgroundColor: 'rgba(255,215,0,0.15)' }]}><Trophy size={18} color="#FFD700" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemTitle, { color: colors.textPrimary }]}>{a.title}</Text>
              <Text style={[s.itemSub, { color: colors.textSecondary }]}>{a.issuer}</Text>
              <Text style={[s.itemDate, { color: colors.textTertiary }]}>{a.date}</Text>
            </View>
            <Pressable onPress={() => handleDelete(a.id)} hitSlop={8}><X size={16} color={colors.textTertiary} /></Pressable>
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
  itemTitle: { fontSize: 15, fontWeight: '700' }, itemSub: { fontSize: 13, marginTop: 2 }, itemDate: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
