import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Check, X, Trophy } from '@/components/ProfileIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import { Achievement } from '@/types';
import WizardFooter, { getIncompleteSteps } from '@/components/WizardFooter';

const TAB_BAR_HEIGHT = 56;

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
  const [formTouched, setFormTouched] = useState(false);

  const resetForm = () => { setTitle(''); setIssuer(''); setDate(''); setDescription(''); setEditing(null); setFormTouched(false); };
  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (a: Achievement) => { setEditing(a); setTitle(a.title); setIssuer(a.issuer); setDate(a.date); setDescription(a.description ?? ''); setShowForm(true); };

  const handleSave = () => {
    setFormTouched(true);
    if (!title.trim() || !issuer.trim()) return;
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
        <KeyboardAvoidingView behavior='padding' style={{ flex: 1 }} keyboardVerticalOffset={100}>
          <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
            <Text style={[s.label, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: formTouched && !title.trim() ? '#EF4444' : colors.borderLight }]} placeholder="e.g. Best Innovation Award" placeholderTextColor={colors.textTertiary} value={title} onChangeText={setTitle} />
            {formTouched && !title.trim() && <Text style={s.fieldError}>Title is required</Text>}
            <Text style={[s.label, { color: colors.textSecondary }]}>Issuer *</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: formTouched && !issuer.trim() ? '#EF4444' : colors.borderLight }]} placeholder="e.g. TechCorp" placeholderTextColor={colors.textTertiary} value={issuer} onChangeText={setIssuer} />
            {formTouched && !issuer.trim() && <Text style={s.fieldError}>Issuer is required</Text>}
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
      <LinearGradient colors={['#4A2C0A', '#6B4423', colors.background]} style={s.heroGradient}>
        <View style={s.header}>
          <Pressable style={s.backBtnGrad} onPress={handleSaveAll}><ArrowLeft size={22} color="#FFFFFF" /></Pressable>
          <Text style={s.headerTitleGrad}>Achievements & Honors</Text>
          <Pressable style={s.backBtnGrad} onPress={openAdd}><Plus size={22} color="#FFFFFF" /></Pressable>
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&h=200&fit=crop' }} style={s.heroBanner} />
        <Text style={[s.heroSubtext, { color: colors.textPrimary }]}>Showcase what sets you apart</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={s.listContent}>
        {items.length === 0 && (
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Trophy size={32} color="#B8860B" />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No achievements yet</Text>
            <Text style={[s.emptyText, { color: colors.textTertiary }]}>Tap + above to showcase your honors</Text>
            <Pressable style={[s.emptyAddBtn, { backgroundColor: colors.secondary }]} onPress={openAdd}>
              <Plus size={16} color={colors.surface} />
              <Text style={[s.emptyAddBtnText, { color: colors.surface }]}>Add Achievement</Text>
            </Pressable>
          </View>
        )}
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
      {isWizard ? (
        <WizardFooter
          wizardIndex={wizardIndex}
          wizardTotal={wizardTotal}
          incompleteSteps={incompleteSteps}
          onSaveCurrent={handleSaveOnly}
        />
      ) : (
        <View style={[s.stickyFooter, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT, backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
          <Pressable style={[s.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSaveAll}>
            <Check size={16} color={colors.surface} />
            <Text style={[s.saveBtnText, { color: colors.surface }]}>Save</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 }, heroGradient: { paddingHorizontal: 16, paddingBottom: 18 },
  backBtnGrad: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleGrad: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroSubtext: { fontSize: 15, textAlign: 'center', marginTop: 4, fontWeight: '500', lineHeight: 21 },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }, headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { padding: 16, gap: 10 }, formContent: { padding: 16, paddingBottom: 40 },
  stickyFooter: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700' }, itemSub: { fontSize: 13, marginTop: 2 }, itemDate: { fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700' },
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: -6, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10, marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
});
