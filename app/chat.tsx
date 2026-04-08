import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ArrowLeft, Reply, Forward, Paperclip, Send, FileText, X, ChevronDown, AlertCircle } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, fetchThreadMessages, sendEmailViaResend, getOrCreateProxyEmail, type InboundEmail, type SentEmail } from '@/lib/resend';
import { SkeletonChatThread } from '@/components/Skeleton';

const TEXT_SIZES = [
  { label: 'Small', size: 12 },
  { label: 'Normal', size: 14 },
  { label: 'Large', size: 18 },
  { label: 'Huge', size: 22 },
];

function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { threadId } = useLocalSearchParams<{ threadId: string; messageId: string }>();
  const { userEmail, supabaseUserId, userName } = useAuth();
  const [proxyEmail, setProxyEmail] = useState<string | null>(null);

  useEffect(() => {
    if (supabaseUserId) {
      getOrCreateProxyEmail(supabaseUserId, userName || undefined).then(setProxyEmail);
    }
  }, [supabaseUserId]);

  const [replyMode, setReplyMode] = useState<'none' | 'reply' | 'forward'>('none');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTextSize, setShowTextSize] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [toField, setToField] = useState('');
  const [ccField, setCcField] = useState('');
  const [bccField, setBccField] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [selectedTextSize, setSelectedTextSize] = useState(14);

  interface ThreadMessage {
    id: string;
    fromEmail: string;
    from: string;
    subject: string | null;
    body: string;
    date: string;
    _kind: 'inbound' | 'sent';
  }

  const threadQuery = useQuery({
    queryKey: ['mail-thread', threadId, supabaseUserId],
    queryFn: async (): Promise<ThreadMessage[]> => {
      if (!supabaseUserId || !threadId) return [];
      const msgs = await fetchThreadMessages(supabaseUserId, threadId);
      return msgs.map(msg => {
        const isSent = msg._kind === 'sent';
        return {
          id: msg.id,
          fromEmail: isSent ? (proxyEmail || userEmail || '') : (msg as InboundEmail).from_email,
          from: isSent ? 'You' : ((msg as InboundEmail).from_name || (msg as InboundEmail).from_email || ''),
          subject: msg.subject,
          body: msg.body_text || '',
          date: isSent ? (msg as SentEmail).sent_at : (msg as InboundEmail).received_at,
          _kind: msg._kind,
        };
      });
    },
    enabled: !!threadId && !!supabaseUserId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!toField || !replyText.trim() || !supabaseUserId || !proxyEmail) return false;
      const subject = messages.length > 0 ? (messages[0].subject || 'No Subject') : 'No Subject';
      const replySubject = replyMode === 'forward' ? `Fwd: ${subject}` : `Re: ${subject}`;
      return sendEmailViaResend(proxyEmail, toField, replySubject, replyText.trim(), supabaseUserId);
    },
    onSuccess: (success) => {
      if (success) {
        closeReplyModal();
        queryClient.invalidateQueries({ queryKey: ['mail-thread', threadId] });
        queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
        Alert.alert('Sent', 'Your email has been sent successfully.');
      } else {
        Alert.alert('Error', 'Failed to send email. Please try again.');
      }
    },
    onError: () => {
      Alert.alert('Error', 'Failed to send email. Please try again.');
    },
  });

  const messages = threadQuery.data || [];
  const firstMessage = messages.length > 0 ? messages[0] : null;
  const subject = firstMessage?.subject || 'Loading...';

  const senderEmail = useMemo(() => {
    if (!firstMessage) return '';
    const other = messages.find(m => m._kind === 'inbound');
    return other?.fromEmail || firstMessage.fromEmail;
  }, [messages, firstMessage]);

  const senderName = useMemo(() => {
    if (!firstMessage) return '';
    const other = messages.find(m => m._kind === 'inbound');
    return other?.from || firstMessage.from;
  }, [messages, firstMessage]);

  const handleSend = useCallback(() => {
    if (!replyText.trim()) return;
    sendMutation.mutate();
  }, [replyText, sendMutation]);

  const handleAttachment = useCallback((type: string) => {
    setShowAttachMenu(false);
    Alert.alert('Attachment', `${type} attachment selected. This feature will be available soon.`);
  }, []);

  const openReply = (mode: 'reply' | 'forward') => {
    setReplyMode(mode);
    if (mode === 'reply') {
      setToField(senderEmail);
    } else {
      setToField('');
    }
    setShowReplyModal(true);
  };

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setReplyMode('none');
    setReplyText('');
    setShowCcBcc(false);
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    setSelectedTextSize(14);
    setToField('');
    setCcField('');
    setBccField('');
  };

  const renderMessage = useCallback(({ item }: { item: ThreadMessage }) => {
    const isUser = item._kind === 'sent';
    const avatarUrl = getAvatarUrl(item.fromEmail);

    return (
      <View style={styles.emailMessage}>
        <View style={styles.emailMsgHeader}>
          {!isUser ? (
            <Image source={{ uri: avatarUrl }} style={styles.msgAvatar} />
          ) : (
            <View style={styles.msgAvatarPlaceholder}>
              <Text style={styles.msgAvatarText}>You</Text>
            </View>
          )}
          <View style={styles.msgSenderInfo}>
            <Text style={styles.msgSenderName}>{isUser ? 'You' : item.from}</Text>
            <Text style={styles.msgSenderEmail}>{item.fromEmail}</Text>
          </View>
          <Text style={styles.msgTimestamp}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.emailMsgBody}>
          <Text style={styles.emailMsgText}>{item.body}</Text>
        </View>
      </View>
    );
  }, []);

  const getInputStyle = () => {
    const fontStyle: any = {
      fontSize: selectedTextSize,
    };
    if (isBold) fontStyle.fontWeight = '700' as const;
    if (isItalic) fontStyle.fontStyle = 'italic' as const;
    if (isUnderline) fontStyle.textDecorationLine = 'underline' as const;
    return fontStyle;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubject} numberOfLines={1}>{subject}</Text>
        </View>
      </View>

      <View style={styles.subjectBar}>
        {senderEmail ? (
          <Image source={{ uri: getAvatarUrl(senderEmail) }} style={styles.subjectLogo} />
        ) : (
          <View style={[styles.subjectLogo, { backgroundColor: Colors.borderLight }]} />
        )}
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectTitle} numberOfLines={2}>{subject}</Text>
          <Text style={styles.subjectMeta}>{senderName} · {messages.length} message{messages.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {threadQuery.isLoading ? (
        <SkeletonChatThread />
      ) : threadQuery.isError ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={44} color={Colors.error} />
          <Text style={styles.errorText}>Failed to load email thread</Text>
          <Pressable style={styles.retryBtn} onPress={() => threadQuery.refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.msgSeparator} />}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable style={styles.bottomActionBtn} onPress={() => openReply('reply')}>
              <Reply size={18} color="#FFFFFF" />
              <Text style={styles.bottomActionText}>Reply</Text>
            </Pressable>
            <Pressable style={styles.bottomActionBtn} onPress={() => openReply('forward')}>
              <Forward size={18} color="#FFFFFF" />
              <Text style={styles.bottomActionText}>Forward</Text>
            </Pressable>
          </View>

          <Modal visible={showReplyModal} animationType="slide" transparent>
            <KeyboardAvoidingView style={styles.replyModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Pressable style={styles.replyModalBackdrop} onPress={closeReplyModal} />
              <View style={[styles.replyModalContent, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={styles.replyModalHandle} />
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <View style={styles.replyHeader}>
                    <Text style={styles.replyLabel}>{replyMode === 'reply' ? 'Reply' : 'Forward'}</Text>
                    <Pressable onPress={closeReplyModal}>
                      <X size={20} color={Colors.textTertiary} />
                    </Pressable>
                  </View>

                  <View style={styles.emailFieldsContainer}>
                    <View style={styles.emailFieldRow}>
                      <Text style={styles.emailFieldLabel}>From</Text>
                      <Text style={styles.emailFieldValue}>{proxyEmail || userEmail || 'loading...'}</Text>
                    </View>
                    <View style={styles.emailFieldDivider} />
                    <View style={styles.emailFieldRow}>
                      <Text style={styles.emailFieldLabel}>To</Text>
                      <TextInput
                        style={styles.emailFieldInput}
                        value={toField}
                        onChangeText={setToField}
                        placeholder="Recipient email"
                        placeholderTextColor={Colors.textTertiary}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      {!showCcBcc && (
                        <Pressable onPress={() => setShowCcBcc(true)}>
                          <Text style={styles.ccBccToggle}>Cc/Bcc</Text>
                        </Pressable>
                      )}
                    </View>
                    {showCcBcc && (
                      <>
                        <View style={styles.emailFieldDivider} />
                        <View style={styles.emailFieldRow}>
                          <Text style={styles.emailFieldLabel}>Cc</Text>
                          <TextInput
                            style={styles.emailFieldInput}
                            value={ccField}
                            onChangeText={setCcField}
                            placeholder="Add Cc"
                            placeholderTextColor={Colors.textTertiary}
                            autoCapitalize="none"
                            keyboardType="email-address"
                          />
                        </View>
                        <View style={styles.emailFieldDivider} />
                        <View style={styles.emailFieldRow}>
                          <Text style={styles.emailFieldLabel}>Bcc</Text>
                          <TextInput
                            style={styles.emailFieldInput}
                            value={bccField}
                            onChangeText={setBccField}
                            placeholder="Add Bcc"
                            placeholderTextColor={Colors.textTertiary}
                            autoCapitalize="none"
                            keyboardType="email-address"
                          />
                        </View>
                      </>
                    )}
                  </View>

                  <View style={styles.formatBar}>
                    <Pressable style={[styles.formatBtn, isBold && styles.formatBtnActive]} onPress={() => setIsBold(!isBold)}>
                      <Ionicons name="text" size={16} color={isBold ? "#FFFFFF" : Colors.textTertiary} />
                    </Pressable>
                    <Pressable style={[styles.formatBtn, isItalic && styles.formatBtnActive]} onPress={() => setIsItalic(!isItalic)}>
                      <Ionicons name="text-outline" size={16} color={isItalic ? '#FFFFFF' : Colors.textTertiary} />
                    </Pressable>
                    <Pressable style={[styles.formatBtn, isUnderline && styles.formatBtnActive]} onPress={() => setIsUnderline(!isUnderline)}>
                      <Ionicons name="remove-outline" size={16} color={isUnderline ? '#FFFFFF' : Colors.textTertiary} />
                    </Pressable>
                    <View style={styles.formatDividerV} />
                    <Pressable style={styles.textSizeBtn} onPress={() => setShowTextSize(!showTextSize)}>
                      <Ionicons name="text-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.textSizeLabel}>{selectedTextSize}px</Text>
                      <ChevronDown size={12} color={Colors.textTertiary} />
                    </Pressable>
                    <View style={styles.formatSpacer} />
                    <Pressable style={styles.formatBtn} onPress={() => setShowAttachMenu(true)}>
                      <Paperclip size={16} color={Colors.textTertiary} />
                    </Pressable>
                  </View>

                  {showTextSize && (
                    <View style={styles.textSizeDropdown}>
                      {TEXT_SIZES.map((ts) => (
                        <Pressable
                          key={ts.size}
                          style={[styles.textSizeOption, selectedTextSize === ts.size && styles.textSizeOptionActive]}
                          onPress={() => { setSelectedTextSize(ts.size); setShowTextSize(false); }}
                        >
                          <Text style={[styles.textSizeOptionText, { fontSize: ts.size }, selectedTextSize === ts.size && styles.textSizeOptionTextActive]}>{ts.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <TextInput
                    style={[styles.replyInput, getInputStyle()]}
                    placeholder="Compose your reply..."
                    placeholderTextColor={Colors.textTertiary}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    autoFocus
                  />

                  <Pressable
                    style={[styles.sendButton, replyText.trim() ? styles.sendButtonActive : null]}
                    onPress={handleSend}
                    disabled={!replyText.trim() || sendMutation.isPending}
                  >
                    {sendMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Send size={18} color={replyText.trim() ? '#FFFFFF' : Colors.textTertiary} />
                    )}
                    <Text style={[styles.sendBtnText, replyText.trim() && styles.sendBtnTextActive]}>
                      {sendMutation.isPending ? 'Sending...' : 'Send'}
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </KeyboardAvoidingView>
      )}

      <Modal visible={showAttachMenu} animationType="slide" transparent>
        <Pressable style={styles.attachOverlay} onPress={() => setShowAttachMenu(false)}>
          <View style={styles.attachMenu}>
            <View style={styles.attachMenuHeader}>
              <Text style={styles.attachMenuTitle}>Attach</Text>
              <Pressable onPress={() => setShowAttachMenu(false)} style={styles.attachCloseBtn}>
                <X size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.attachOptions}>
              <Pressable style={styles.attachOption} onPress={() => handleAttachment('photo')}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="image-outline" size={22} color="#1565C0" />
                </View>
                <Text style={styles.attachOptionText}>Photo</Text>
              </Pressable>
              <Pressable style={styles.attachOption} onPress={() => handleAttachment('file')}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="document-outline" size={22} color="#E65100" />
                </View>
                <Text style={styles.attachOptionText}>File</Text>
              </Pressable>
              <Pressable style={styles.attachOption} onPress={() => handleAttachment('pdf')}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#FFEBEE' }]}>
                  <FileText size={22} color="#C62828" />
                </View>
                <Text style={styles.attachOptionText}>PDF</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default ChatScreen;

import { useMemo } from 'react';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 8 },
  headerSubject: { fontSize: 16, fontWeight: '700' as const, color: Colors.secondary },
  subjectBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  subjectLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.borderLight },
  subjectInfo: { flex: 1, marginLeft: 12 },
  subjectTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  subjectMeta: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  errorText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.secondary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  messagesList: { padding: 16 },
  emailMessage: { backgroundColor: Colors.surface },
  emailMsgHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.borderLight },
  msgAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  msgAvatarText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF' },
  msgSenderInfo: { flex: 1, marginLeft: 10 },
  msgSenderName: { fontSize: 14, fontWeight: '700' as const, color: Colors.textPrimary },
  msgSenderEmail: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  msgTimestamp: { fontSize: 11, color: Colors.textTertiary },
  emailMsgBody: { paddingLeft: 46, marginBottom: 8 },
  emailMsgText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  msgSeparator: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 16 },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  replyLabel: { fontSize: 14, fontWeight: '700' as const, color: Colors.secondary },
  emailFieldsContainer: { backgroundColor: Colors.background, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden' as const },
  emailFieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  emailFieldLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textTertiary, width: 36 },
  emailFieldValue: { fontSize: 13, color: Colors.textPrimary, flex: 1 },
  emailFieldInput: { fontSize: 13, color: Colors.textPrimary, flex: 1, padding: 0 },
  emailFieldDivider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 12 },
  ccBccToggle: { fontSize: 12, fontWeight: '600' as const, color: '#1565C0', paddingHorizontal: 8 },
  formatBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  formatBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  formatBtnActive: { backgroundColor: '#111111' },
  formatDividerV: { width: 1, height: 20, backgroundColor: Colors.borderLight, marginHorizontal: 4 },
  textSizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 8, backgroundColor: Colors.background },
  textSizeLabel: { fontSize: 12, color: Colors.textTertiary, fontWeight: '600' as const },
  textSizeDropdown: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 8, overflow: 'hidden' as const },
  textSizeOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  textSizeOptionActive: { backgroundColor: '#F5F5F5' },
  textSizeOptionText: { color: Colors.textPrimary },
  textSizeOptionTextActive: { fontWeight: '700' as const, color: '#111111' },
  formatSpacer: { flex: 1 },
  replyInput: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.textPrimary, minHeight: 80, maxHeight: 150, textAlignVertical: 'top' as const, borderWidth: 1, borderColor: Colors.borderLight },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, backgroundColor: Colors.borderLight, marginTop: 8 },
  sendButtonActive: { backgroundColor: Colors.secondary },
  sendBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.textTertiary },
  sendBtnTextActive: { color: '#FFFFFF' },
  bottomActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.surface },
  bottomActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#111111' },
  bottomActionText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  replyModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  replyModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  replyModalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '85%' },
  replyModalHandle: { width: 40, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  attachOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  attachMenu: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  attachMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  attachMenuTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.secondary },
  attachCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  attachOptions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  attachOption: { alignItems: 'center', gap: 8 },
  attachOptionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  attachOptionText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary },
});
