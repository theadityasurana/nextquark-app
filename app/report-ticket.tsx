import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, Paperclip, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const issueCategories: Record<string, string[]> = {
  problem: [
    'App crashes frequently',
    'Cannot load job listings',
    'Messages not sending',
    'Profile not saving changes',
    'Notifications not working',
    'Swipe feature not responding',
    'Search filters not working',
    'Application status not updating',
    'Other',
  ],
  bug: [
    'UI display issue',
    'Button not responding',
    'Data not loading correctly',
    'Login/Authentication issue',
    'Performance issue (slow/lag)',
    'Incorrect data displayed',
    'Feature not working as expected',
    'Crash on specific action',
    'Other',
  ],
  safety: [
    'Suspicious job posting',
    'Fake company profile',
    'Harassment or inappropriate behavior',
    'Phishing or scam attempt',
    'Identity theft concern',
    'Unauthorized account access',
    'Data privacy concern',
    'Other',
  ],
};

const titles: Record<string, string> = {
  problem: 'Report a Problem',
  bug: 'Report a Bug',
  safety: 'Safety & Security',
};

export default function ReportTicketScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const ticketType = type || 'problem';

  const [selectedIssue, setSelectedIssue] = useState('');
  const [description, setDescription] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = issueCategories[ticketType] || issueCategories.problem;
  const title = titles[ticketType] || 'Report';

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
        type: ticketType,
        category: selectedIssue,
        description: description.trim(),
        attachments: attachments.length > 0 ? attachments : null,
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

  const handleAttach = () => {
    setAttachments(prev => [...prev, `attachment_${prev.length + 1}.png`]);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Issue Category *</Text>
          <Pressable style={styles.dropdown} onPress={() => setShowDropdown(!showDropdown)}>
            <Text style={selectedIssue ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedIssue || 'Select an issue...'}
            </Text>
            <ChevronDown size={18} color={Colors.textTertiary} />
          </Pressable>

          {showDropdown && (
            <View style={styles.dropdownList}>
              {categories.map((cat, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.dropdownItem, selectedIssue === cat && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedIssue(cat);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedIssue === cat && styles.dropdownItemTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          )}

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

          <Text style={styles.fieldLabel}>Attachments (optional)</Text>
          <Pressable style={styles.attachButton} onPress={handleAttach}>
            <Paperclip size={18} color={Colors.textSecondary} />
            <Text style={styles.attachButtonText}>Attach Images or Screenshots</Text>
          </Pressable>

          {attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {attachments.map((att, idx) => (
                <View key={idx} style={styles.attachmentItem}>
                  <Text style={styles.attachmentName}>{att}</Text>
                  <Pressable onPress={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                    <Text style={styles.removeAttachment}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
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
  dropdownList: { backgroundColor: Colors.background, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  dropdownItemActive: { backgroundColor: '#111111' },
  dropdownItemText: { fontSize: 14, color: Colors.textPrimary },
  dropdownItemTextActive: { color: '#FFFFFF', fontWeight: '600' as const },
  textArea: {
    backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.textPrimary, minHeight: 140, borderWidth: 1, borderColor: Colors.borderLight,
    textAlignVertical: 'top' as const,
  },
  charCount: { fontSize: 12, color: Colors.textTertiary, textAlign: 'right' as const, marginTop: 4 },
  attachButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.background, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.borderLight, borderStyle: 'dashed' as const,
  },
  attachButtonText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' as const },
  attachmentsList: { marginTop: 12, gap: 8 },
  attachmentItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  attachmentName: { fontSize: 13, color: Colors.textPrimary },
  removeAttachment: { fontSize: 13, color: Colors.error, fontWeight: '600' as const },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#111111', borderRadius: 16, paddingVertical: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
});
