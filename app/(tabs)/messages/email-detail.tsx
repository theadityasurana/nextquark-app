import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WebView } from 'react-native-webview';
import {
  Archive,
  ArrowLeft,
  Forward,
  Reply,
  Star,
  Trash2,
} from 'lucide-react-native';

import { useColors } from '@/contexts/useColors';
import {
  archiveInbound,
  archiveSent,
  deleteInboundEmail,
  deleteSentEmail,
  toggleStarInbound,
  toggleStarSent,
} from '@/lib/resend';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#4F46E5','#7C3AED','#2563EB','#0891B2','#059669','#D97706','#DC2626','#DB2777','#4338CA','#0D9488'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function stripHtmlToText(html: string): string {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|br|li|tr|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export default function EmailDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id: string;
    kind: string;
    displayName: string;
    fromEmail: string;
    toEmail: string;
    subject: string;
    bodyText: string;
    bodyHtml: string;
    isStarred: string;
    isArchived: string;
    dateStr: string;
  }>();

  const kind = params.kind as 'inbound' | 'sent';
  const displayName = params.displayName || '(unknown)';
  const fromEmail = params.fromEmail || '';
  const toEmail = params.toEmail || '';
  const subject = params.subject || '(no subject)';
  const bodyText = params.bodyText || '';
  const bodyHtml = params.bodyHtml || '';
  const hasHtmlBody = !!bodyHtml.trim() && /<img\s/i.test(bodyHtml);
  const body = bodyText.trim() || (kind === 'inbound' ? stripHtmlToText(bodyHtml) : '') || '';
  const dateStr = params.dateStr || '';
  const emailId = params.id || '';

  const [starred, setStarred] = useState(params.isStarred === 'true');

  const dateObj = new Date(dateStr);
  const formattedDate = !isNaN(dateObj.getTime())
    ? `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`
    : '';

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
  }, [queryClient]);

  const toggleStarMutation = useMutation({
    mutationFn: async (newStarred: boolean) => {
      if (kind === 'inbound') return toggleStarInbound(emailId, newStarred);
      return toggleStarSent(emailId, newStarred);
    },
    onSuccess: () => invalidate(),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (kind === 'inbound') return archiveInbound(emailId, true);
      return archiveSent(emailId, true);
    },
    onSuccess: () => { invalidate(); router.back(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (kind === 'inbound') return deleteInboundEmail(emailId);
      return deleteSentEmail(emailId);
    },
    onSuccess: () => { invalidate(); router.back(); },
  });

  const handleStar = useCallback(() => {
    const next = !starred;
    setStarred(next);
    toggleStarMutation.mutate(next);
  }, [starred, toggleStarMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete', 'Delete this email? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  }, [deleteMutation]);

  const handleReply = useCallback(() => {
    router.back();
    // Small delay so the inbox mounts before we try to trigger compose
    setTimeout(() => {
      // We pass reply params back — the inbox will pick them up
    }, 100);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable onPress={() => archiveMutation.mutate()} hitSlop={8} style={styles.topBarIcon}>
            <Archive size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={handleStar} hitSlop={8} style={styles.topBarIcon}>
            <Star size={20} color={starred ? '#F59E0B' : colors.textTertiary} fill={starred ? '#F59E0B' : 'transparent'} />
          </Pressable>
        </View>
      </View>

      {/* Subject */}
      <View style={styles.subjectRow}>
        <Text style={[styles.subject, { color: colors.textPrimary }]}>{subject}</Text>
      </View>

      {/* Sender info */}
      <View style={styles.senderRow}>
        <View style={[styles.senderAvatar, { backgroundColor: getAvatarColor(displayName) }]}>
          <Text style={styles.senderInitials}>{getInitials(displayName)}</Text>
        </View>
        <View style={styles.senderInfo}>
          <View style={styles.senderNameRow}>
            <Text style={[styles.senderName, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[styles.date, { color: colors.textTertiary }]}>{formattedDate}</Text>
          </View>
          <Text style={[styles.toMe, { color: colors.textSecondary }]} numberOfLines={1}>
            to {toEmail?.split('@')[0] || 'me'}
          </Text>
        </View>
      </View>

      {/* Body */}
      {hasHtmlBody ? (
        <View style={[styles.bodyWrap, { flex: 1, paddingBottom: Math.max(insets.bottom + 80, 100) }]}>
          <WebView
            originWhitelist={['*']}
            source={{ html: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,sans-serif;font-size:15px;line-height:1.5;color:${colors.textPrimary};background:${colors.background};padding:0 4px;word-break:break-word;}img{max-width:100%;height:auto;border-radius:8px;}</style></head><body>${bodyHtml}</body></html>` }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            scalesPageToFit={false}
          />
        </View>
      ) : (
        <ScrollView style={styles.bodyWrap} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}>
          <Text style={[styles.body, { color: colors.textPrimary }]} selectable>{body}</Text>
        </ScrollView>
      )}

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {kind === 'inbound' && (
          <Pressable
            style={[styles.bottomBtn, { borderColor: colors.border }]}
            onPress={() => {
              router.back();
              // Inbox will handle opening compose via params
            }}
          >
            <Reply size={18} color={colors.textSecondary} />
            <Text style={[styles.bottomBtnText, { color: colors.textPrimary }]}>Reply</Text>
          </Pressable>
        )}
        {kind === 'inbound' && (
          <Pressable
            style={[styles.bottomBtn, { borderColor: colors.border }]}
            onPress={() => {
              router.back();
              // Inbox will handle opening compose via params
            }}
          >
            <Forward size={18} color={colors.textSecondary} />
            <Text style={[styles.bottomBtnText, { color: colors.textPrimary }]}>Forward</Text>
          </Pressable>
        )}
        <Pressable style={[styles.bottomBtn, { borderColor: colors.border }]} onPress={handleDelete}>
          <Trash2 size={18} color="#DC2626" />
          <Text style={[styles.bottomBtnText, { color: '#DC2626' }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  topBarIcon: { padding: 6 },
  subjectRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  subject: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  senderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  senderAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  senderInitials: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  senderInfo: { flex: 1 },
  senderNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  senderName: { fontSize: 15, fontWeight: '700', flex: 1 },
  date: { fontSize: 12, marginLeft: 8 },
  toMe: { fontSize: 13, marginTop: 1 },
  bodyWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  bottomBtnText: { fontSize: 14, fontWeight: '600' },
});
