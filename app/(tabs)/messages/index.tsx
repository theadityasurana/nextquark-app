import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Swipeable } from 'react-native-gesture-handler';
import {
  Archive,
  Paperclip,
  Copy,
  Inbox,
  Menu,
  Plus,
  RefreshCw,
  Send,
  Star,
  Strikethrough,
  Underline,
  Trash2,
  X,
} from 'lucide-react-native';

import Colors, { darkColors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/useColors';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import DraggableBottomSheet from '@/components/DraggableBottomSheet';
import {
  archiveInbound,
  archiveSent,
  deleteInboundEmail,
  deleteSentEmail,
  fetchInboundEmails,
  fetchSentEmails,
  fetchStarredEmails,
  getOrCreateProxyEmail,
  markInboundRead,
  sendEmailViaResend,
  toggleStarInbound,
  toggleStarSent,
  type InboundEmail,
  type SentEmail,
  subscribeToMailChanges,
} from '@/lib/resend';

type SidebarView = 'inbox' | 'starred' | 'sent' | 'archived';
type MailItem =
  | { kind: 'inbound'; data: InboundEmail }
  | { kind: 'sent'; data: SentEmail };

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTime24(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function getItemId(item: MailItem): string {
  return `${item.kind}:${item.data.id}`;
}

function parseDisplayName(fromName: string | null | undefined, fromEmail: string | null | undefined): string {
  const raw = (fromName || '').trim();
  if (raw) {
    // Handle "Name <email@x.com>"
    const m = raw.match(/^([^<]+?)\s*<[^>]+>$/);
    const candidate = (m?.[1] || raw).trim().replace(/^"|"$/g, '');
    if (candidate && !candidate.includes('@')) return candidate;
  }
  return getDisplayName(fromEmail || raw);
}

function getDisplayName(nameOrEmail: string): string {
  const v = (nameOrEmail || '').trim();
  if (!v) return '(unknown)';
  if (!v.includes('@')) return v;
  const local = v.split('@')[0] || v;
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || v;
}

function getPreviewText(body: string, max = 90): string {
  const s = (body || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
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

function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const colors = useColors();
  const isDark = colors.background === darkColors.background;
  const { supabaseUserId, userName } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarView, setSidebarView] = useState<SidebarView>('inbox');
  const [showSidebar, setShowSidebar] = useState(false);

  const [proxyEmail, setProxyEmail] = useState<string | null>(null);
  const [copiedProxy, setCopiedProxy] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [composeBold, setComposeBold] = useState(false);
  const [composeItalic, setComposeItalic] = useState(false);
  const [composeUnderline, setComposeUnderline] = useState(false);
  const [composeStrike, setComposeStrike] = useState(false);
  const [composeTextSize, setComposeTextSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [composeHeading, setComposeHeading] = useState<'body' | 'h2' | 'h1'>('body');
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [fileAttachments, setFileAttachments] = useState<{ name: string; uri: string; size?: number | null }[]>([]);

  const [activeItem, setActiveItem] = useState<MailItem | null>(null);

  useEffect(() => {
    if (!supabaseUserId) return;
    getOrCreateProxyEmail(supabaseUserId, userName || undefined).then(setProxyEmail);
  }, [supabaseUserId]);

  // Realtime: auto-refresh when emails arrive or change
  useEffect(() => {
    if (!supabaseUserId) return;
    const unsubscribe = subscribeToMailChanges(supabaseUserId, () => {
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
    });
    return unsubscribe;
  }, [supabaseUserId, queryClient]);

  const copyProxyEmail = useCallback(async () => {
    if (!proxyEmail) return;
    await Clipboard.setStringAsync(proxyEmail);
    setCopiedProxy(true);
    setTimeout(() => setCopiedProxy(false), 2000);
  }, [proxyEmail]);

  const openCompose = useCallback((to = '', subject = '', body = '') => {
    setComposeTo(to);
    setComposeSubject(subject);
    setComposeBody(body);
    setComposeBold(false);
    setComposeItalic(false);
    setComposeUnderline(false);
    setComposeStrike(false);
    setComposeTextSize('md');
    setComposeHeading('body');
    setAttachments([]);
    setFileAttachments([]);
    setShowCompose(true);
  }, []);

  const closeCompose = useCallback(() => {
    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeBold(false);
    setComposeItalic(false);
    setComposeUnderline(false);
    setComposeStrike(false);
    setComposeTextSize('md');
    setComposeHeading('body');
    setAttachments([]);
    setFileAttachments([]);
  }, []);

  const listQuery = useQuery({
    queryKey: ['nextquark-mail', sidebarView, supabaseUserId],
    enabled: !!supabaseUserId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<MailItem[]> => {
      const uid = supabaseUserId!;

      if (sidebarView === 'starred') {
        const starred = await fetchStarredEmails(uid);
        const inboundItems: MailItem[] = starred.inbound.map((x) => ({ kind: 'inbound', data: x }));
        const sentItems: MailItem[] = starred.sent.map((x) => ({ kind: 'sent', data: x }));
        return [...inboundItems, ...sentItems].sort((a, b) => {
          const aDate = a.kind === 'inbound' ? a.data.received_at : a.data.sent_at;
          const bDate = b.kind === 'inbound' ? b.data.received_at : b.data.sent_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
      }

      if (sidebarView === 'sent') {
        const sent = await fetchSentEmails(uid);
        return sent
          .filter((x) => !x.is_archived)
          .map((x) => ({ kind: 'sent' as const, data: x }));
      }

      if (sidebarView === 'archived') {
        const [inboundArchived, sent] = await Promise.all([fetchInboundEmails(uid), fetchSentEmails(uid)]);
        const inboundArchivedFiltered = inboundArchived.filter((x) => x.is_archived);
        const sentArchived = sent.filter((x) => x.is_archived);
        const inboundItems: MailItem[] = inboundArchivedFiltered.map((x) => ({ kind: 'inbound', data: x }));
        const sentItems: MailItem[] = sentArchived.map((x) => ({ kind: 'sent', data: x }));
        return [...inboundItems, ...sentItems].sort((a, b) => {
          const aDate = a.kind === 'inbound' ? a.data.received_at : a.data.sent_at;
          const bDate = b.kind === 'inbound' ? b.data.received_at : b.data.sent_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
      }

      // inbox
      const inbound = await fetchInboundEmails(uid);
      const inboundFiltered = inbound.filter((x) => !x.is_archived);
      return inboundFiltered.map((x) => ({ kind: 'inbound' as const, data: x }));
    },
  });

  const unreadCount = useMemo(() => {
    const items = listQuery.data || [];
    return items.reduce((count, item) => {
      if (item.kind !== 'inbound') return count;
      return count + (item.data.is_read ? 0 : 1);
    }, 0);
  }, [listQuery.data]);

  const filteredItems = useMemo(() => {
    const items = listQuery.data || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      if (item.kind === 'inbound') {
        const x = item.data;
        return (
          (x.from_name || '').toLowerCase().includes(q) ||
          x.from_email.toLowerCase().includes(q) ||
          (x.subject || '').toLowerCase().includes(q) ||
          (x.body_text || '').toLowerCase().includes(q)
        );
      }
      const x = item.data;
      return (
        x.to_email.toLowerCase().includes(q) ||
        (x.subject || '').toLowerCase().includes(q) ||
        (x.body_text || '').toLowerCase().includes(q)
      );
    });
  }, [listQuery.data, searchQuery]);

  const refetchAll = useCallback(() => {
    listQuery.refetch();
  }, [listQuery]);

  const markReadMutation = useMutation({
    mutationFn: async ({ emailId, read }: { emailId: string; read: boolean }) => markInboundRead(emailId, read),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ item, starred }: { item: MailItem; starred: boolean }) => {
      if (item.kind === 'inbound') return toggleStarInbound(item.data.id, starred);
      return toggleStarSent(item.data.id, starred);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ item, archived }: { item: MailItem; archived: boolean }) => {
      if (item.kind === 'inbound') return archiveInbound(item.data.id, archived);
      return archiveSent(item.data.id, archived);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: MailItem) => {
      if (item.kind === 'inbound') return deleteInboundEmail(item.data.id);
      return deleteSentEmail(item.data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
    },
  });

  const handleSendEmail = useCallback(async () => {
    if (!supabaseUserId) {
      Alert.alert('Not signed in', 'Please sign in to use NextQuark Mail.');
      return;
    }
    if (!proxyEmail) {
      Alert.alert('Proxy email not ready', 'Please wait a moment and try again.');
      return;
    }
    if (!composeTo.trim() || !composeSubject.trim()) {
      Alert.alert('Missing fields', 'Please fill in To and Subject.');
      return;
    }

    setIsSending(true);
    const ok = await sendEmailViaResend(
      proxyEmail,
      composeTo.trim(),
      composeSubject.trim(),
      composeBody.trim(),
      supabaseUserId
    );
    setIsSending(false);

    if (ok) {
      closeCompose();
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
      Alert.alert('Sent', 'Email sent successfully.');
    } else {
      Alert.alert('Error', 'Failed to send email. Please try again.');
    }
  }, [composeBody, composeSubject, composeTo, proxyEmail, supabaseUserId, closeCompose, queryClient]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAttachments((prev) => [...prev, ...result.assets]);
    }
  }, []);

  const handlePickAttachment = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (res.canceled) return;
    setFileAttachments((prev) => [
      ...prev,
      ...res.assets.map((a) => ({ name: a.name, uri: a.uri, size: a.size })),
    ]);
  }, []);

  const composeDecoration = useMemo<'none' | 'underline' | 'line-through' | 'underline line-through'>(() => {
    if (composeUnderline && composeStrike) return 'underline line-through';
    if (composeUnderline) return 'underline';
    if (composeStrike) return 'line-through';
    return 'none';
  }, [composeStrike, composeUnderline]);

  const headerTitle =
    sidebarView === 'sent' ? 'Sent' : sidebarView === 'starred' ? 'Starred' : sidebarView === 'archived' ? 'Archived' : 'Inbox';

  const showEmptyState = useMemo(() => {
    if (!supabaseUserId) return true;
    if (listQuery.isLoading) return true;
    if (listQuery.isError) return true;
    return filteredItems.length === 0;
  }, [filteredItems.length, listQuery.isError, listQuery.isLoading, supabaseUserId]);

  const openItem = useCallback(
    (item: MailItem) => {
      setActiveItem(item);
      if (item.kind === 'inbound' && !item.data.is_read) {
        markReadMutation.mutate({ emailId: item.data.id, read: true });
      }
    },
    [markReadMutation]
  );

  const closeItem = useCallback(() => setActiveItem(null), []);

  const confirmDelete = useCallback(
    (item: MailItem) => {
      Alert.alert('Delete', 'Delete this email? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item) },
      ]);
    },
    [deleteMutation]
  );

  const MailRow = useCallback(
    ({ item }: { item: MailItem }) => {
      const isStarred = item.data.is_starred;
      const isUnread = item.kind === 'inbound' ? !item.data.is_read : false;
      const fromEmail = item.kind === 'inbound' ? item.data.from_email : item.data.to_email;
      const fromName =
        item.kind === 'inbound'
          ? parseDisplayName(item.data.from_name, item.data.from_email)
          : getDisplayName(item.data.to_email || '(unknown)');
      const subject = item.data.subject || '(no subject)';
      const preview = getPreviewText(item.data.body_text || '');
      const time = item.kind === 'inbound' ? formatTime24(item.data.received_at) : formatTime24(item.data.sent_at);

      const rightActions = () => (
        <View style={styles.swipeActionsWrap}>
          <Pressable
            style={[styles.swipeActionBtn, styles.swipeArchiveBtn]}
            onPress={() => archiveMutation.mutate({ item, archived: true })}
          >
            <Archive size={18} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Archive</Text>
          </Pressable>
          <Pressable
            style={[styles.swipeActionBtn, styles.swipeDeleteBtn]}
            onPress={() => confirmDelete(item)}
          >
            <Trash2 size={18} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </Pressable>
        </View>
      );

      return (
        <Swipeable
          renderRightActions={rightActions}
          rightThreshold={80}
          friction={1.6}
          overshootRight={false}
        >
          <Pressable
            style={({ pressed }) => [
              styles.emailItem,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.8 },
              isUnread && { backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => openItem(item)}
            onLongPress={() => {
              const archiveLabel = item.data.is_archived ? 'Unarchive' : 'Archive';
              Alert.alert(fromName, subject, [
                ...(item.kind === 'inbound'
                  ? [
                      {
                        text: isUnread ? 'Mark as read' : 'Mark as unread',
                        onPress: () => markReadMutation.mutate({ emailId: item.data.id, read: isUnread }),
                      },
                    ]
                  : []),
                {
                  text: isStarred ? 'Unstar' : 'Star',
                  onPress: () => toggleStarMutation.mutate({ item, starred: !isStarred }),
                },
                { text: archiveLabel, onPress: () => archiveMutation.mutate({ item, archived: !item.data.is_archived }) },
                { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(item) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            testID={`mail-item-${getItemId(item)}`}
          >
            <Image
              source={require('@/assets/images/applogo.jpg')}
              style={styles.logoAvatar}
              contentFit="cover"
            />

            <View style={styles.emailContent}>
              <View style={styles.emailTopRow}>
                <Text
                  style={[styles.emailSender, { color: colors.textPrimary }, isUnread && styles.emailSenderUnread]}
                  numberOfLines={1}
                >
                  {fromName}
                </Text>
                <Text style={[styles.emailTime, { color: colors.textTertiary }]}>{time}</Text>
              </View>
              <Text
                style={[
                  styles.emailSubject,
                  { color: colors.textSecondary },
                  isUnread && { fontWeight: '700', color: colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {subject}
              </Text>
              <Text style={[styles.emailPreview, { color: colors.textTertiary }]} numberOfLines={1}>
                {preview}
              </Text>
            </View>

            <Pressable
              style={styles.starBtnRight}
              onPress={() => toggleStarMutation.mutate({ item, starred: !isStarred })}
              hitSlop={10}
            >
              <Star
                size={18}
                color={isStarred ? '#F59E0B' : colors.textTertiary}
                fill={isStarred ? '#F59E0B' : 'transparent'}
              />
            </Pressable>

            {isUnread && <View style={styles.unreadDot} />}
          </Pressable>
        </Swipeable>
      );
    },
    [archiveMutation, colors, confirmDelete, markReadMutation, openItem, toggleStarMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: MailItem }) => {
      return <MailRow item={item} />;
    },
    [MailRow]
  );

  const DetailModal = () => {
    const item = activeItem;
    if (!item) return null;
    const isInbound = item.kind === 'inbound';
    const fromName = isInbound ? item.data.from_name || item.data.from_email : proxyEmail || '(your proxy)';
    const fromEmail = isInbound ? item.data.from_email : proxyEmail || '';
    const toEmail = isInbound ? item.data.to_email : item.data.to_email;
    const subject = item.data.subject || '(no subject)';
    const body =
      item.data.body_text?.trim() ||
      (item.kind === 'inbound' ? stripHtmlToText(item.data.body_html || '') : '') ||
      '';
    const isStarred = item.data.is_starred;

    return (
      <DraggableBottomSheet visible={!!activeItem} onClose={closeItem} initialHeight={Math.round(760)} minHeight={Math.round(420)}>
        <View style={[styles.detailContainer, { paddingTop: 4 }]}>
          <View style={[styles.detailToolbar, { borderBottomColor: colors.border }]}>
            <View style={styles.detailToolbarLeft}>
              {isInbound ? (
                <Pressable
                  style={styles.detailIconBtn}
                  onPress={() => {
                    closeItem();
                    openCompose(
                      item.data.from_email,
                      `Re: ${subject}`,
                      `\n\n--- Original Message ---\nFrom: ${item.data.from_name || item.data.from_email}\n\n${body}`
                    );
                  }}
                  hitSlop={8}
                >
                  <Send size={18} color={colors.textPrimary} />
                </Pressable>
              ) : null}
              <Pressable
                style={styles.detailIconBtn}
                onPress={() => archiveMutation.mutate({ item, archived: !item.data.is_archived })}
                hitSlop={8}
              >
                <Archive size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable style={styles.detailIconBtn} onPress={() => confirmDelete(item)} hitSlop={8}>
                <Trash2 size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.detailToolbarRight}>
              <Pressable onPress={() => toggleStarMutation.mutate({ item, starred: !isStarred })} hitSlop={8} style={styles.detailIconBtn}>
                <Star size={18} color={isStarred ? '#F59E0B' : colors.textTertiary} fill={isStarred ? '#F59E0B' : 'transparent'} />
              </Pressable>
              <Pressable onPress={closeItem} hitSlop={8} style={styles.detailIconBtn}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.detailTop}>
            <View style={styles.detailMetaBlock}>
              <Text style={[styles.detailSubject, { color: colors.textPrimary }]} numberOfLines={2}>
                {subject}
              </Text>
              <Text style={[styles.detailFromName, { color: colors.textPrimary }]} numberOfLines={1}>
                {isInbound ? parseDisplayName(item.data.from_name, item.data.from_email) : getDisplayName(fromName)}
              </Text>
              {!!fromEmail && (
                <Text style={[styles.detailMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  From: {fromEmail}
                </Text>
              )}
              <Text style={[styles.detailMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                To: {toEmail}
              </Text>
            </View>
          </View>

          <View style={[styles.detailBodyWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Text style={[styles.detailBody, { color: colors.textPrimary }]}>{body}</Text>
          </View>
        </View>
      </DraggableBottomSheet>
    );
  };

  return (
    <TabTransitionWrapper routeName="messages">
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.brandHeader}>
          <Image source={require('@/assets/images/header.png')} style={styles.brandLogo} contentFit="contain" />
        </View>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={[styles.menuBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowSidebar(true)}>
              <Menu size={22} color={colors.textPrimary} />
            </Pressable>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{headerTitle}</Text>
              {sidebarView === 'inbox' && unreadCount > 0 && (
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{unreadCount} unread</Text>
              )}
            </View>
          </View>
          <Pressable
            style={[styles.refreshBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={refetchAll}
            disabled={listQuery.isFetching}
          >
            <RefreshCw size={18} color={listQuery.isFetching ? colors.textTertiary : colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Inbox size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search mail..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={getItemId}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={showEmptyState ? styles.emptyContainer : undefined}
          ListEmptyComponent={() => {
            if (!supabaseUserId) {
              return (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Sign in to use NextQuark Mail</Text>
                  <Text style={styles.emptyText}>
                    Your proxy inbox is linked to your account.
                  </Text>
                </View>
              );
            }
            if (listQuery.isLoading) {
              return (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text style={styles.emptyTitle}>Loading…</Text>
                  <Text style={styles.emptyText}>Fetching your NextQuark mail</Text>
                </View>
              );
            }
            if (listQuery.isError) {
              return (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Unable to load mail</Text>
                  <Text style={styles.emptyText}>Pull to refresh or try again in a moment.</Text>
                  <Pressable style={styles.retryBtn} onPress={refetchAll}>
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </Pressable>
                </View>
              );
            }
            return (
              <View style={styles.emptyState}>
                <Inbox size={40} color="#4B5563" />
                <Text style={styles.emptyTitle}>No mail</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No results found.' : 'Share your proxy address to start receiving mail here.'}
                </Text>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={listQuery.isFetching && !listQuery.isLoading} onRefresh={refetchAll} tintColor={Colors.secondary} />
          }
        />

        {proxyEmail && (
          <Pressable
            style={[
              styles.composeFab,
              { backgroundColor: isDark ? '#FFFFFF' : '#111111' },
            ]}
            onPress={() => openCompose()}
          >
            <Plus size={24} color={isDark ? '#111111' : '#FFFFFF'} />
          </Pressable>
        )}

        <DraggableBottomSheet
          visible={showCompose}
          onClose={closeCompose}
          enableDragToClose={false}
          initialHeight={Math.round(780)}
          minHeight={Math.round(Dimensions.get('window').height * 0.3)}
        >
          <View style={[styles.composeSheetInner, { backgroundColor: colors.background }]}>
            <View style={[styles.composeHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={closeCompose} style={styles.composeIconBtn} hitSlop={8}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
              <Text style={[styles.composeTitle, { color: colors.textPrimary }]}>Compose</Text>
              <Pressable
                style={[styles.sendBtn, (!composeTo.trim() || !composeSubject.trim() || isSending) && styles.sendBtnDisabled]}
                onPress={handleSendEmail}
                disabled={!composeTo.trim() || !composeSubject.trim() || isSending}
              >
                {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={16} color="#FFF" />}
              </Pressable>
            </View>

            <View style={[styles.composeToolbar, { borderBottomColor: colors.border }]}>
              <Pressable style={[styles.toolbarIcon, composeBold && styles.toolbarIconActive]} onPress={() => setComposeBold((v) => !v)}>
                <Text style={[styles.toolbarIconText, { color: colors.textPrimary }]}>B</Text>
              </Pressable>
              <Pressable style={[styles.toolbarIcon, composeItalic && styles.toolbarIconActive]} onPress={() => setComposeItalic((v) => !v)}>
                <Text style={[styles.toolbarIconText, { color: colors.textPrimary }]}>I</Text>
              </Pressable>
              <Pressable style={[styles.toolbarIcon, composeUnderline && styles.toolbarIconActive]} onPress={() => setComposeUnderline((v) => !v)}>
                <Underline size={16} color={colors.textPrimary} />
              </Pressable>
              <Pressable style={[styles.toolbarIcon, composeStrike && styles.toolbarIconActive]} onPress={() => setComposeStrike((v) => !v)}>
                <Strikethrough size={16} color={colors.textPrimary} />
              </Pressable>

              <Pressable
                style={[styles.toolbarPill, composeTextSize === 'sm' && styles.toolbarPillActive]}
                onPress={() => setComposeTextSize('sm')}
              >
                <Text style={[styles.toolbarPillText, { color: colors.textPrimary }]}>Small</Text>
              </Pressable>
              <Pressable
                style={[styles.toolbarPill, composeTextSize === 'md' && styles.toolbarPillActive]}
                onPress={() => setComposeTextSize('md')}
              >
                <Text style={[styles.toolbarPillText, { color: colors.textPrimary }]}>Normal</Text>
              </Pressable>
              <Pressable
                style={[styles.toolbarPill, composeTextSize === 'lg' && styles.toolbarPillActive]}
                onPress={() => setComposeTextSize('lg')}
              >
                <Text style={[styles.toolbarPillText, { color: colors.textPrimary }]}>Large</Text>
              </Pressable>

              <Pressable
                style={[styles.toolbarPill, composeHeading === 'body' && styles.toolbarPillActive]}
                onPress={() => setComposeHeading('body')}
              >
                <Text style={[styles.toolbarPillText, { color: colors.textPrimary }]}>Body</Text>
              </Pressable>
              <Pressable
                style={[styles.toolbarPill, composeHeading === 'h2' && styles.toolbarPillActive]}
                onPress={() => setComposeHeading('h2')}
              >
                <Text style={[styles.toolbarPillText, { color: colors.textPrimary }]}>H2</Text>
              </Pressable>
              <Pressable
                style={[styles.toolbarPill, composeHeading === 'h1' && styles.toolbarPillActive]}
                onPress={() => setComposeHeading('h1')}
              >
                <Text style={[styles.toolbarPillText, { color: colors.textPrimary }]}>H1</Text>
              </Pressable>

              <View style={{ flex: 1 }} />
              <Pressable style={styles.toolbarIcon} onPress={handlePickAttachment} hitSlop={8}>
                <Paperclip size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.composeFrom}>
              <Text style={[styles.composeLabel, { color: colors.textSecondary }]}>From</Text>
              <Text style={[styles.composeFromValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {proxyEmail || '...'}
              </Text>
            </View>
            <View style={styles.composeField}>
              <Text style={[styles.composeLabel, { color: colors.textSecondary }]}>To</Text>
              <TextInput
                style={[styles.composeInput, { color: colors.textPrimary }]}
                value={composeTo}
                onChangeText={setComposeTo}
                placeholder="recipient@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.composeField}>
              <Text style={[styles.composeLabel, { color: colors.textSecondary }]}>Subject</Text>
              <TextInput
                style={[styles.composeInput, { color: colors.textPrimary }]}
                value={composeSubject}
                onChangeText={setComposeSubject}
                placeholder="Subject"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {(fileAttachments.length > 0 || attachments.length > 0) && (
              <View style={[styles.attachmentsRow, { borderBottomColor: colors.border }]}>
                {fileAttachments.map((f) => (
                  <View key={f.uri} style={[styles.attachmentChip, { borderColor: colors.border }]}>
                    <Text style={[styles.attachmentChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                  </View>
                ))}
                {attachments.map((asset) => (
                  <Image
                    key={asset.assetId ?? asset.uri}
                    source={{ uri: asset.uri }}
                    style={styles.attachmentThumb}
                  />
                ))}
              </View>
            )}

            <TextInput
              style={[
                styles.composeBodyInput,
                {
                  fontSize:
                    composeHeading === 'h1'
                      ? 24
                      : composeHeading === 'h2'
                        ? 18
                        : composeTextSize === 'sm'
                          ? 13
                          : composeTextSize === 'lg'
                            ? 17
                            : 15,
                  fontWeight: composeHeading !== 'body' || composeBold ? '800' : '400',
                  fontStyle: composeItalic ? 'italic' : 'normal',
                  textDecorationLine: composeDecoration,
                  color: colors.textPrimary,
                },
              ]}
              value={composeBody}
              onChangeText={setComposeBody}
              placeholder="Write your message…"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>
        </DraggableBottomSheet>

        <Modal visible={showSidebar} animationType="fade" transparent>
          <Pressable style={styles.sidebarOverlay} onPress={() => setShowSidebar(false)}>
            <View style={[styles.sidebarContent, { backgroundColor: colors.background }]}>
              <View style={styles.sidebarHeader}>
                <Text style={[styles.sidebarTitle, { color: colors.textPrimary }]}>NextQuark Mail</Text>
                <Pressable onPress={() => setShowSidebar(false)}>
                  <X size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={[styles.proxySection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.proxySectionTitle, { color: colors.textPrimary }]}>Your Proxy Email</Text>
                {proxyEmail ? (
                  <View style={styles.proxyRow}>
                    <Text style={[styles.proxyAddress, { color: colors.textPrimary }]} numberOfLines={1}>
                      {proxyEmail}
                    </Text>
                    <Pressable
                      style={[styles.copyBtn, { borderColor: colors.border, backgroundColor: colors.background }, copiedProxy && styles.copyBtnCopied]}
                      onPress={copyProxyEmail}
                    >
                      <Copy size={14} color={copiedProxy ? colors.textInverse : colors.textSecondary} />
                      <Text style={[styles.copyBtnText, { color: colors.textPrimary }]}>
                        {copiedProxy ? 'Copied!' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <ActivityIndicator size="small" color={colors.secondary} style={{ marginVertical: 8 }} />
                )}
                <Text style={[styles.proxyHint, { color: colors.textSecondary }]}>
                  Use this address for signups and newsletters — you’ll see the mail here.
                </Text>
              </View>

              {[
                { key: 'inbox' as const, label: 'Inbox', icon: Inbox, count: unreadCount },
                { key: 'starred' as const, label: 'Starred', icon: Star, count: 0 },
                { key: 'sent' as const, label: 'Sent', icon: Send, count: 0 },
                { key: 'archived' as const, label: 'Archived', icon: Archive, count: 0 },
              ].map((row) => (
                <Pressable
                  key={row.key}
                  style={[styles.sidebarItem, sidebarView === row.key && styles.sidebarItemActive]}
                  onPress={() => {
                    setSidebarView(row.key);
                    setShowSidebar(false);
                  }}
                >
                  <row.icon
                    size={20}
                    color={sidebarView === row.key ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sidebarItemText,
                      { color: colors.textSecondary },
                      sidebarView === row.key && { color: colors.textPrimary },
                    ]}
                  >
                    {row.label}
                  </Text>
                  {row.count > 0 && (
                    <View style={styles.sidebarBadge}>
                      <Text style={styles.sidebarBadgeText}>{row.count}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        <DetailModal />
      </View>
    </TabTransitionWrapper>
  );
}

export default MessagesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  brandHeader: { alignItems: 'center', paddingTop: 4, paddingBottom: 2 },
  brandLogo: { height: 32, width: 240, opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111827',
  },
  headerTitle: { fontSize: 28, fontWeight: '800' as const, color: '#F9FAFB' },
  headerSubtitle: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' as const, marginTop: 1 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#111827',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#F9FAFB', padding: 0 },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 10,
    marginVertical: 3,
  },
  logoAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0B1120' },
  emailContent: { flex: 1, marginLeft: 12, marginRight: 8 },
  emailTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emailSender: { fontSize: 14, color: '#F9FAFB', flex: 1 },
  emailSenderUnread: { fontWeight: '700' as const, color: '#FFFFFF' },
  emailTime: { fontSize: 11, color: '#6B7280', marginLeft: 8 },
  emailSubject: { fontSize: 14, color: '#E5E7EB', marginTop: 2 },
  emailSubjectUnread: { fontWeight: '700' as const, color: '#FFFFFF' },
  emailPreview: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  starBtnRight: { padding: 6, marginLeft: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#111827', marginLeft: 68 },
  swipeActionsWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 3,
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeActionBtn: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  swipeArchiveBtn: { backgroundColor: '#2563EB' },
  swipeDeleteBtn: { backgroundColor: '#DC2626' },
  swipeActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' as const },
  emptyContainer: { flexGrow: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
    paddingVertical: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: '#F9FAFB', marginTop: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },

  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', flexDirection: 'row' },
  sidebarContent: { width: 280, backgroundColor: '#020617', paddingTop: 60, paddingHorizontal: 16 },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  sidebarTitle: { fontSize: 20, fontWeight: '800' as const, color: '#F9FAFB' },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  sidebarItemActive: { backgroundColor: '#111827' },
  sidebarItemText: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: '#E5E7EB' },
  sidebarItemTextActive: { color: '#FFFFFF' },
  sidebarBadge: { backgroundColor: '#4F46E5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sidebarBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#FFF' },

  proxySection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111827',
  },
  proxySectionTitle: { fontSize: 14, fontWeight: '700', color: '#E5E7EB', marginBottom: 8 },
  proxyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proxyAddress: { flex: 1, fontSize: 14, color: '#F9FAFB', fontFamily: 'monospace' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#020617',
  },
  copyBtnCopied: { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  copyBtnText: { fontSize: 12, fontWeight: '600', color: '#E5E7EB' },
  proxyHint: { fontSize: 12, color: '#6B7280', marginTop: 6 },

  composeFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  composeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  composeSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  composeSheetInner: { flex: 1 },
  composeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111827',
  },
  composeTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  composeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    width: 44,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  composeFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111827',
  },
  composeField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111827',
  },
  composeLabel: { fontSize: 14, color: '#6B7280', width: 70 },
  composeFromValue: { flex: 1, fontSize: 14, color: '#E5E7EB' },
  composeInput: { flex: 1, fontSize: 14, color: '#F9FAFB', padding: 0 },
  composeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111827',
    flexWrap: 'wrap',
  },
  toolbarIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolbarIconActive: {
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderColor: 'rgba(99,102,241,0.45)',
  },
  toolbarIconText: { fontSize: 13, fontWeight: '800', color: '#E5E7EB' },
  toolbarPill: {
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolbarPillActive: {
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderColor: 'rgba(99,102,241,0.45)',
  },
  toolbarPillText: { fontSize: 12, fontWeight: '700', color: '#E5E7EB' },
  toolbarButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
  },
  toolbarButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  toolbarButtonText: { fontSize: 13, fontWeight: '600', color: '#E5E7EB' },
  toolbarSpacer: { flex: 1 },
  attachmentsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attachmentChip: {
    maxWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  attachmentChipText: { fontSize: 12, fontWeight: '600' as const },
  attachmentThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0B1120',
  },
  composeBodyInput: {
    flex: 1,
    fontSize: 15,
    color: '#F9FAFB',
    paddingHorizontal: 16,
    paddingTop: 14,
    lineHeight: 22,
  },

  detailContainer: { flex: 1 },
  detailToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailToolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailToolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailTop: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  detailMetaBlock: { gap: 6 },
  detailSubject: { fontSize: 16, fontWeight: '800' as const },
  detailFromName: { fontSize: 14, fontWeight: '700' as const },
  detailMeta: { fontSize: 12 },
  detailBodyWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  detailBody: { fontSize: 14, lineHeight: 20 },
});
