import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Send, Check } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const ALL_CATEGORIES = [
  'App crashes frequently',
  'Cannot load job listings',
  'Messages not sending',
  'Profile not saving changes',
  'Notifications not working',
  'Swipe feature not responding',
  'Search filters not working',
  'Application status not updating',
  'UI display issue',
  'Button not responding',
  'Data not loading correctly',
  'Login/Authentication issue',
  'Performance issue (slow/lag)',
  'Incorrect data displayed',
  'Feature not working as expected',
  'Crash on specific action',
  'Suspicious job posting',
  'Fake company profile',
  'Harassment or inappropriate behavior',
  'Phishing or scam attempt',
  'Identity theft concern',
  'Unauthorized account access',
  'Data privacy concern',
  'Payment or billing issue',
  'Account deletion request',
  'Other',
];

export default function ReportTicketScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedIssue, setSelectedIssue] = useState('');
  const [description, setDescription] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert('Required', 'Please select an issue category.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe the issue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to submit a ticket.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        type: 'general',
        category: selectedIssue,
        description: description.trim(),
        status: 'open',
      });

      if (error) throw error;

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Ticket Submitted',
        'Thank you for your report. Our team will review it and get back to you within 24-48 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Report an Issue</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Issue Category *</Text>
          <Pressable style={styles.dropdown} onPress={() => setShowDropdown(true)}>
            <Text style={selectedIssue ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedIssue || 'Select an issue...'}
            </Text>
            <ChevronDown size={18} color={Colors.textTertiary} />
          </Pressable>

          <Text style={styles.fieldLabel}>Describe the Issue *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please provide as much detail as possible about the issue you're experiencing..."
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{description.length}/2000</Text>
        </View>

        <Pressable style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showDropdown} animationType="slide" transparent onRequestClose={() => setShowDropdown(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Issue Category</Text>
              <Pressable onPress={() => setShowDropdown(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {ALL_CATEGORIES.map((cat, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.modalItem, selectedIssue === cat && styles.modalItemActive]}
                  onPress={() => {
                    setSelectedIssue(cat);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedIssue === cat && styles.modalItemTextActive]}>{cat}</Text>
                  {selectedIssue === cat && <Check size={16} color="#FFFFFF" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  scrollContent: { paddingHorizontal: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  dropdownText: { fontSize: 15, color: Colors.textPrimary },
  dropdownPlaceholder: { fontSize: 15, color: Colors.textTertiary },
  textArea: {
    backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.textPrimary, minHeight: 140, borderWidth: 1, borderColor: Colors.borderLight,
    textAlignVertical: 'top' as const,
  },
  charCount: { fontSize: 12, color: Colors.textTertiary, textAlign: 'right' as const, marginTop: 4 },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#111111', borderRadius: 16, paddingVertical: 16,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.secondary },
  modalCloseBtn: { backgroundColor: Colors.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalCloseBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF' },
  modalScroll: { maxHeight: 400 },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalItemActive: { backgroundColor: '#111111' },
  modalItemText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  modalItemTextActive: { color: '#FFFFFF', fontWeight: '600' as const },
});
