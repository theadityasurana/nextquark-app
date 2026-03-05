import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Menu, Star, Archive, Send, Mail, X, RefreshCw, AlertCircle, Trash2, MailOpen } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGmailMessages, fetchSentMessages, getAvatarUrl, deleteGmailMessage, archiveGmailMessage, starGmailMessage, markAsRead } from '@/lib/gmail';
import { useGmailAuth, exchangeCodeForToken, getValidAccessToken, revokeGmailAccess } from '@/lib/gmailAuth';
import { registerForPushNotifications, checkForNewEmails, setupNotificationListener } from '@/lib/gmailNotifications';
import type { GmailMessage } from '@/lib/gmail';
import { Image } from 'expo-image';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';

type FilterTab = 'all' | 'primary' | 'promotions' | 'social' | 'updates';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'primary', label: 'Primary' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'social', label: 'Social' },
  { key: 'updates', label: 'Updates' },
];

const CATEGORY_LABEL_MAP: Record<string, FilterTab> = {
  'CATEGORY_PROMOTIONS': 'promotions',
  'CATEGORY_SOCIAL': 'social',
  'CATEGORY_UPDATES': 'updates',
  'CATEGORY_FORUMS': 'social',
  'CATEGORY_PERSONAL': 'primary',
};

function getMessageCategory(msg: GmailMessage): FilterTab {
  for (const label of msg.labelIds) {
    if (CATEGORY_LABEL_MAP[label]) {
      return CATEGORY_LABEL_MAP[label];
    }
  }
  return 'primary';
}

function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userEmail } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState<'inbox' | 'starred' | 'sent' | 'archived'>('inbox');
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const { request, response, promptAsync, redirectUri } = useGmailAuth();

  useEffect(() => {
    getValidAccessToken().then(setGmailToken);
    registerForPushNotifications();
    const cleanup = setupNotificationListener((threadId, messageId) => {
      router.push({ pathname: '/chat' as any, params: { threadId, messageId } });
    });
    const interval = setInterval(() => checkForNewEmails(), 2 * 60 * 1000);
    return () => { cleanup(); clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      setIsConnecting(true);
      exchangeCodeForToken(response.params.code, redirectUri).then((token) => {
        if (token) {
          setGmailToken(token);
          queryClient.invalidateQueries({ queryKey: ['gmail-inbox'] });
        }
        setIsConnecting(false);
      });
    }
  }, [response]);

  const gmailQuery = useQuery({
    queryKey: ['gmail-inbox', sidebarView],
    queryFn: async () => {
      const token = await getValidAccessToken();
      if (!token) return [];
      return sidebarView === 'sent' ? fetchSentMessages(token, 30) : fetchGmailMessages(token, 30);
    },
    enabled: !!gmailToken && sidebarView !== 'archived',
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const token = await getValidAccessToken();
      return token ? deleteGmailMessage(token, messageId) : false;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gmail-inbox'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const token = await getValidAccessToken();
      return token ? archiveGmailMessage(token, messageId) : false;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gmail-inbox'] }),
  });

  const starMutation = useMutation({
    mutationFn: async ({ messageId, star }: { messageId: string; star: boolean }) => {
      const token = await getValidAccessToken();
      return token ? starGmailMessage(token, messageId, star) : false;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async ({ messageId, read }: { messageId: string; read: boolean }) => {
      const token = await getValidAccessToken();
      return token ? markAsRead(token, messageId, read) : false;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gmail-inbox'] }),
  });

  const toggleStar = useCallback((id: string) => {
    const isStarred = starredIds.includes(id);
    setStarredIds(prev => isStarred ? prev.filter(i => i !== id) : [...prev, id]);
    starMutation.mutate({ messageId: id, star: !isStarred });
  }, [starredIds]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete Email', 'Move this email to trash?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }, []);

  const handleArchive = useCallback((id: string) => {
    archiveMutation.mutate(id);
  }, []);

  const handleMarkRead = useCallback((id: string, isUnread: boolean) => {
    markReadMutation.mutate({ messageId: id, read: isUnread });
  }, []);

  const connectGmail = useCallback(() => {
    if (request) promptAsync();
  }, [request, promptAsync]);

  const disconnectGmail = useCallback(() => {
    Alert.alert('Disconnect Gmail', 'Are you sure you want to disconnect your Gmail account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        await revokeGmailAccess();
        setGmailToken(null);
        queryClient.clear();
      }},
    ]);
  }, []);

  const emails = gmailQuery.data || [];

  const filtered = useMemo(() => {
    let list = emails;
    if (sidebarView === 'starred') {
      list = list.filter(e => starredIds.includes(e.id));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.from.toLowerCase().includes(q) ||
          e.fromEmail.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.snippet.toLowerCase().includes(q)
      );
    }
    return list;
  }, [emails, searchQuery, sidebarView, starredIds]);

  const unreadCount = emails.filter(e => e.isUnread).length;

  const renderItem = useCallback(({ item }: { item: GmailMessage }) => {
    const isStarred = starredIds.includes(item.id);
    const avatarUrl = getAvatarUrl(item.fromEmail);

    return (
      <Pressable
        style={({ pressed }) => [styles.emailItem, pressed && styles.emailItemPressed, item.isUnread && styles.emailItemUnread]}
        onPress={() => {
          if (item.isUnread) handleMarkRead(item.id, true);
          router.push({ pathname: '/chat' as any, params: { threadId: item.threadId, messageId: item.id } });
        }}
        onLongPress={() => {
          Alert.alert('Email Actions', `From: ${item.from}\nSubject: ${item.subject}`, [
            { text: 'Mark as ' + (item.isUnread ? 'Read' : 'Unread'), onPress: () => handleMarkRead(item.id, item.isUnread) },
            { text: 'Archive', onPress: () => handleArchive(item.id) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        testID={`email-item-${item.id}`}
      >
        <Pressable style={styles.starBtn} onPress={() => toggleStar(item.id)} hitSlop={8}>
          <Star size={16} color={isStarred ? '#F59E0B' : Colors.textTertiary} fill={isStarred ? '#F59E0B' : 'transparent'} />
        </Pressable>
        <Image source={{ uri: avatarUrl }} style={styles.emailAvatar} />
        <View style={styles.emailContent}>
          <View style={styles.emailTopRow}>
            <Text style={[styles.emailSender, item.isUnread && styles.emailSenderUnread]} numberOfLines={1}>
              {item.from}
            </Text>
            <Text style={styles.emailTime}>{item.date}</Text>
          </View>
          <Text style={[styles.emailSubject, item.isUnread && styles.emailSubjectUnread]} numberOfLines={1}>{item.subject}</Text>
          <Text style={styles.emailPreview} numberOfLines={1}>{item.snippet}</Text>
        </View>
        {item.isUnread && (
          <View style={styles.unreadDot} />
        )}
      </Pressable>
    );
  }, [starredIds, toggleStar, router, handleMarkRead, handleArchive, handleDelete]);

  const renderEmptyState = () => {
    if (!gmailToken && !isConnecting) {
      return (
        <View style={styles.emptyState}>
          <Mail size={44} color={Colors.secondary} />
          <Text style={styles.emptyTitle}>Connect Gmail</Text>
          <Text style={styles.emptyText}>Sign in with your Google account to access your Gmail inbox</Text>
          <Pressable style={styles.connectBtn} onPress={connectGmail}>
            <Text style={styles.connectBtnText}>Connect Gmail Account</Text>
          </Pressable>
        </View>
      );
    }

    if (gmailQuery.isLoading || isConnecting) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.emptyTitle}>Loading your inbox...</Text>
          <Text style={styles.emptyText}>Fetching emails from Gmail</Text>
        </View>
      );
    }

    if (gmailQuery.isError) {
      return (
        <View style={styles.emptyState}>
          <AlertCircle size={44} color={Colors.error} />
          <Text style={styles.emptyTitle}>Unable to load emails</Text>
          <Text style={styles.emptyText}>
            Your Gmail token may have expired. Try reconnecting.
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => gmailQuery.refetch()}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
          <Pressable style={styles.disconnectBtn} onPress={disconnectGmail}>
            <Text style={styles.disconnectBtnText}>Reconnect Gmail</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Mail size={40} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No emails</Text>
        <Text style={styles.emptyText}>
          {searchQuery ? 'No results found' : sidebarView === 'starred' ? 'No starred emails' : 'Your inbox is empty'}
        </Text>
      </View>
    );
  };

  return (
    <TabTransitionWrapper routeName="messages">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.brandHeader}>
        <Image source={require('@/assets/images/header.png')} style={styles.brandLogo} resizeMode="contain" />
      </View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.menuBtn} onPress={() => setShowSidebar(true)}>
            <Menu size={22} color={Colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Inbox</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
            )}
          </View>
        </View>
        <Pressable
          style={styles.refreshBtn}
          onPress={() => gmailQuery.refetch()}
          disabled={gmailQuery.isFetching}
        >
          <RefreshCw size={18} color={gmailQuery.isFetching ? Colors.textTertiary : Colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search emails..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={gmailQuery.isFetching && !gmailQuery.isLoading}
            onRefresh={() => gmailQuery.refetch()}
            tintColor={Colors.secondary}
          />
        }
      />

      {gmailToken ? (
        <View style={styles.connectedBar}>
          <View style={styles.connectedDot} />
          <Text style={styles.connectedText}>{userEmail || 'Gmail Connected'}</Text>
          <Pressable onPress={disconnectGmail} hitSlop={8}>
            <X size={14} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ) : null}

      <Modal visible={showSidebar} animationType="fade" transparent>
        <Pressable style={styles.sidebarOverlay} onPress={() => setShowSidebar(false)}>
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>NextQuark Mail</Text>
              <Pressable onPress={() => setShowSidebar(false)}>
                <X size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            {userEmail && (
              <View style={styles.sidebarEmail}>
                <Text style={styles.sidebarEmailText} numberOfLines={1}>{userEmail}</Text>
              </View>
            )}
            {[
              { key: 'inbox' as const, label: 'Inbox', icon: Mail, count: unreadCount },
              { key: 'starred' as const, label: 'Starred', icon: Star, count: starredIds.length },
              { key: 'sent' as const, label: 'Sent Mail', icon: Send, count: 0 },
              { key: 'archived' as const, label: 'Archived', icon: Archive, count: 0 },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={[styles.sidebarItem, sidebarView === item.key && styles.sidebarItemActive]}
                onPress={() => {
                  setSidebarView(item.key);
                  setShowSidebar(false);
                }}
              >
                <item.icon size={20} color={sidebarView === item.key ? '#1565C0' : Colors.textSecondary} />
                <Text style={[styles.sidebarItemText, sidebarView === item.key && styles.sidebarItemTextActive]}>{item.label}</Text>
                {item.count > 0 && (
                  <View style={styles.sidebarBadge}>
                    <Text style={styles.sidebarBadgeText}>{item.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
    </TabTransitionWrapper>
  );
}

export default MessagesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  brandHeader: { alignItems: 'center', paddingTop: 4, paddingBottom: 2 },
  brandLogo: { height: 32, width: 240 },
  brandName: { fontSize: 12, fontWeight: '800' as const, color: Colors.textTertiary, letterSpacing: 2, textTransform: 'uppercase' as const },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.secondary },
  headerSubtitle: { fontSize: 13, color: Colors.accent, fontWeight: '600' as const, marginTop: 1 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  tabsContainer: { paddingHorizontal: 20, gap: 6, paddingVertical: 6, flexDirection: 'row' },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight },
  tabActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  tabText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse },
  emailItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface },
  emailItemPressed: { backgroundColor: Colors.background },
  emailItemUnread: { backgroundColor: '#F8FAFF' },
  starBtn: { padding: 4, marginRight: 8 },
  emailAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight },
  emailContent: { flex: 1, marginLeft: 12, marginRight: 8 },
  emailTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emailSender: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  emailSenderUnread: { fontWeight: '700' as const, color: Colors.textPrimary },
  emailTime: { fontSize: 11, color: Colors.textTertiary, marginLeft: 8 },
  emailSubject: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  emailSubjectUnread: { fontWeight: '700' as const, color: Colors.textPrimary },
  emailPreview: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2196F3' },
  separator: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 0 },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.secondary, marginTop: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 12 },
  retryBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  connectedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  connectedText: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' as const, flex: 1, textAlign: 'center' as const },
  connectBtn: { backgroundColor: Colors.secondary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  connectBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  disconnectBtn: { backgroundColor: Colors.background, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: Colors.borderLight },
  disconnectBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row' },
  sidebarContent: { width: 280, backgroundColor: Colors.surface, paddingTop: 60, paddingHorizontal: 16 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 8 },
  sidebarTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary },
  sidebarEmail: { paddingHorizontal: 12, paddingBottom: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sidebarEmailText: { fontSize: 13, color: Colors.textTertiary },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12, marginBottom: 4 },
  sidebarItemActive: { backgroundColor: '#E3F2FD' },
  sidebarItemText: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  sidebarItemTextActive: { color: '#1565C0' },
  sidebarBadge: { backgroundColor: Colors.secondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sidebarBadgeText: { fontSize: 11, fontWeight: '700' as const, color: Colors.textInverse },
});
