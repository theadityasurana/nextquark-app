import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Check, X, FolderOpen, ExternalLink } from '@/components/ProfileIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import { Project } from '@/types';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

export default function EditProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile: supabaseProfile, saveProfile } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [items, setItems] = useState<Project[]>(supabaseProfile?.projects || []);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [org, setOrg] = useState('');
  const [date, setDate] = useState('');
  const [exposure, setExposure] = useState('');
  const [bullets, setBullets] = useState('');
  const [link, setLink] = useState('');

  const resetForm = () => {
    setTitle(''); setOrg(''); setDate(''); setExposure('');
    setBullets('• '); setLink(''); setEditing(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (proj: Project) => {
    setEditing(proj);
    setTitle(proj.title); setOrg(proj.organization); setDate(proj.date);
    setExposure(proj.exposure.join(', '));
    setBullets(proj.bullets.map(b => `• ${b}`).join('\n'));
    setLink(proj.link || '');
    setShowForm(true);
  };

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a project title'); return; }
    const proj: Project = {
      id: editing?.id ?? `proj${Date.now()}`,
      title: title.trim(),
      organization: org.trim(),
      date: date.trim(),
      exposure: exposure.split(',').map(s => s.trim()).filter(Boolean),
      bullets: bullets.split('\n').map(b => b.replace(/^•\s*/, '').trim()).filter(Boolean),
      link: link.trim() || undefined,
    };
    if (editing) {
      setItems(prev => prev.map(p => p.id === editing.id ? proj : p));
    } else {
      setItems(prev => [...prev, proj]);
    }
    setShowForm(false); resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this project?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(p => p.id !== id)) },
    ]);
  };

  const handleBulletsChange = (text: string) => {
    if (text.endsWith('\n') && !text.endsWith('\n\n')) {
      setBullets(text + '• ');
    } else if (text === '' || text === '• ') {
      setBullets('');
    } else if (bullets === '' && text.length > 0 && !text.startsWith('•')) {
      setBullets('• ' + text);
    } else {
      setBullets(text);
    }
  };

  const handleSaveAll = async () => {
    if (supabaseProfile) {
      await saveProfile({ ...supabaseProfile, projects: items });
    }
    router.back();
  };

  if (showForm) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => { setShowForm(false); resetForm(); }}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{editing ? 'Edit Project' : 'Add Project'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.textSecondary }]}>Project Title *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Real Time Voice RAG Agent" placeholderTextColor={colors.textTertiary} value={title} onChangeText={setTitle} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Organization / Institution</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. IITBHU" placeholderTextColor={colors.textTertiary} value={org} onChangeText={setOrg} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Jan'25 - Mar'25" placeholderTextColor={colors.textTertiary} value={date} onChangeText={setDate} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Exposure (comma-separated)</Text>
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. AI Agents, RAG, Voice AI, LiveKit, OpenAI" placeholderTextColor={colors.textTertiary} value={exposure} onChangeText={setExposure} multiline />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Bullet Points (one per line)</Text>
            <TextInput style={[styles.input, styles.textArea, { minHeight: 140, backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="• Developed a real-time Voice RAG Agent..." placeholderTextColor={colors.textTertiary} value={bullets} onChangeText={handleBulletsChange} multiline />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Link (optional)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="https://github.com/..." placeholderTextColor={colors.textTertiary} value={link} onChangeText={setLink} autoCapitalize="none" />

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
      <View style={styles.header}>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={handleSaveAll}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Projects</Text>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={openAdd}>
          <Plus size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.listContent}>
        {items.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No projects added yet. Tap + to add.</Text>
        )}
        {items.map(proj => (
          <Pressable key={proj.id} style={[styles.itemCard, { backgroundColor: colors.surface }]} onPress={() => openEdit(proj)}>
            <View style={[styles.itemIcon, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#EEEEEE' }]}>
              <FolderOpen size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{proj.title}</Text>
              <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{proj.organization}</Text>
              <Text style={[styles.itemDate, { color: colors.textTertiary }]}>{proj.date}</Text>
              {proj.exposure.length > 0 && (
                <View style={styles.tagsRow}>
                  {proj.exposure.slice(0, 4).map((tag, i) => (
                    <View key={i} style={[styles.tag, { backgroundColor: theme === 'dark' ? colors.surfaceElevated : '#F0F0F0' }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                    </View>
                  ))}
                  {proj.exposure.length > 4 && (
                    <Text style={[styles.tagText, { color: colors.textTertiary }]}>+{proj.exposure.length - 4}</Text>
                  )}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {proj.link ? (
                <Pressable onPress={(e) => { e.stopPropagation(); Linking.openURL(proj.link!); }} hitSlop={8}>
                  <ExternalLink size={16} color={colors.accent} />
                </Pressable>
              ) : null}
              <Pressable onPress={() => handleDelete(proj.id)} hitSlop={8}>
                <X size={16} color={colors.textTertiary} />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT, backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        <Pressable style={[styles.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSaveAll}>
          <Check size={16} color={colors.surface} />
          <Text style={[styles.saveBtnText, { color: colors.surface }]}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { padding: 16, gap: 10 },
  formContent: { padding: 16, paddingBottom: 20 },
  stickyFooter: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 13, marginTop: 2 },
  itemDate: { fontSize: 12, marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10, marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
});
