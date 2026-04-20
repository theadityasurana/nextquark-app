import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Swipeable } from 'react-native-gesture-handler';
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Forward,
  Inbox,
  Mail,
  MailOpen,
  Menu,
  Paperclip,
  Pencil,
  RefreshCw,
  Reply,
  Send,
  Star,
  Sun,
  Trash2,
  X,
} from '@/components/ProfileIcons';

import { WebView } from 'react-native-webview';
import Colors, { darkColors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/contexts/useColors';
import TabTransitionWrapper from '@/components/TabTransitionWrapper';
import { isValidEmail, sanitizeSearchInput } from '@/lib/validation';
import {
  archiveInbound,
  archiveSent,
  computeThreadId,
  deleteInboundEmail,
  deleteSentEmail,
  fetchInboundEmails,
  fetchSentEmails,
  fetchStarredEmails,
  fetchThreadMessages,
  getOrCreateProxyEmail,
  markInboundRead,
  sendEmailViaResend,
  toggleStarInbound,
  toggleStarSent,
  fetchInboxSettings,
  saveInboxSettings,
  type EmailAttachment,
  type InboundEmail,
  type InboxSettings,
  type SentEmail,
  subscribeToMailChanges,
} from '@/lib/resend';
import { SkeletonMailRow } from '@/components/Skeleton';

type SidebarView = 'inbox' | 'starred' | 'sent' | 'archived';
type CategoryTab = 'Primary' | 'Promotions' | 'Social' | 'Updates' | 'OTP' | 'Interview' | 'Job Offers' | 'Onboarding' | 'Reminder' | 'Rejection' | 'Assessment';
const DEFAULT_CATEGORY_TABS: CategoryTab[] = ['Primary', 'Updates', 'Promotions', 'Social', 'OTP', 'Interview', 'Job Offers', 'Onboarding', 'Reminder', 'Rejection', 'Assessment'];

const CATEGORY_COLORS: Record<CategoryTab, { light: string; dark: string }> = {
  Primary: { light: '#EEF2FF', dark: '#4F46E5' },
  Updates: { light: '#FEF3C7', dark: '#D97706' },
  Promotions: { light: '#DCFCE7', dark: '#16A34A' },
  Social: { light: '#DBEAFE', dark: '#2563EB' },
  OTP: { light: '#FEE2E2', dark: '#DC2626' },
  Interview: { light: '#E0E7FF', dark: '#4338CA' },
  'Job Offers': { light: '#D1FAE5', dark: '#059669' },
  Onboarding: { light: '#CFFAFE', dark: '#0891B2' },
  Reminder: { light: '#FEF9C3', dark: '#CA8A04' },
  Rejection: { light: '#FCE7F3', dark: '#DB2777' },
  Assessment: { light: '#F3E8FF', dark: '#7C3AED' },
};

const OTP_KEYWORDS = [
  'otp', 'one-time password', 'one time password', 'verification code',
  'verify your email', 'confirm your email', 'your code is', 'your code:',
  'security code', 'login code', 'sign-in code', 'authentication code',
  '2fa code', 'two-factor', 'two factor', 'passcode', 'temporary password',
  'use this code', 'enter this code', 'your pin is', 'confirm code',
  'magic link', 'verify your account', 'enter the code', 'digit code',
  'valid for', 'one time code', 'email verification',
  'verify your identity', 'confirm your identity',
];
const INTERVIEW_KEYWORDS = [
  'interview scheduled', 'interview invitation', 'interview confirmation',
  'phone screen', 'technical interview', 'behavioral interview',
  'panel interview', 'interview round', 'interview slot',
  'interview reminder', 'meet the team', 'interview call',
  'hiring manager', 'recruiter call', 'screening call',
  'video interview', 'on-site interview', 'final round',
  'interview feedback', 'interview availability', 'schedule your interview',
  'interview link', 'interview details', 'interview invite',
  'interview with', 'your interview', 'upcoming interview',
  'next steps in your application', 'move forward with your application',
  'like to schedule', 'availability for a call',
  'shortlisted for', 'selected for the next round',
];
const INTERVIEW_SUBJECT_KEYWORDS = ['interview'];
const JOB_OFFER_KEYWORDS = [
  'job offer', 'offer letter', 'we are pleased to offer',
  'pleased to extend', 'offer of employment', 'compensation package',
  'salary offer', 'formal offer', 'contingent offer',
  'offer details', 'accept this offer', 'sign your offer',
  'congratulations on your offer', 'employment offer',
  'we would like to offer you', 'extend an offer',
  'your offer letter', 'offer acceptance', 'joining bonus',
  'we are excited to offer', 'offer from',
];
const ONBOARDING_KEYWORDS = [
  'onboarding', 'welcome aboard', 'welcome to the team',
  'first day at', 'your start date', 'new hire orientation',
  'new employee orientation', 'pre-boarding',
  'employee handbook', 'your equipment', 'laptop setup',
  'welcome kit', 'joining formalities', 'i-9 form', 'w-4 form',
  'background check completed', 'new joiner', 'getting started at',
  'your first week', 'day one', 'joining date',
  'reporting manager', 'your team', 'welcome to',
];
const REMINDER_KEYWORDS = [
  'gentle reminder', 'friendly reminder', 'just a reminder',
  'action required', 'action needed',
  'deadline approaching', 'expiring soon',
  'last chance to apply', 'time sensitive',
  'please complete your application', 'still waiting for your response',
  'follow up on your application', 'complete your profile',
  'pending application', 'application incomplete',
  'reminder to complete', 'don\'t forget to apply',
  'your application is pending',
];
const REJECTION_KEYWORDS = [
  'we regret to inform', 'not moving forward with your',
  'decided not to proceed', 'will not be proceeding',
  'not selected for', 'application unsuccessful',
  'position has been filled', 'we have decided to go with another',
  'unable to offer you the position', 'your application was not successful',
  'not shortlisted for', 'unfortunately we will not be',
  'not be moving forward with your', 'we have chosen another',
  'will not be advancing your', 'did not move forward with your',
];
// Rejection requires BOTH a polite phrase AND a negative signal
const REJECTION_NEGATIVE = [
  'not moving forward', 'will not be proceeding', 'not selected',
  'regret to inform', 'other candidates who more closely',
  'position has been filled', 'decided not to proceed',
  'not be advancing', 'did not move forward', 'unable to offer you',
  'not shortlisted', 'application unsuccessful',
  'will not be able to offer', 'chosen to move forward with another',
  'not a match', 'does not align',
];
// Positive/neutral signals that indicate acknowledgement, NOT rejection
const APPLICATION_POSITIVE_SIGNALS = [
  'we will be in touch', 'will be in touch',
  'if your qualifications match', 'if your qualification matches',
  'keep an eye', 'please keep an eye',
  'we are delighted', 'delighted to receive',
  'excited to review', 'reviewing your application',
  'under review', 'being reviewed', 'currently reviewing',
  'will review your', 'our team will review',
  'we will get back to you', 'get back to you',
  'hear from us', 'you will hear from us',
  'next steps will be shared', 'stay tuned',
  'thank you for your patience', 'application is being processed',
  'we appreciate your application', 'we appreciate your interest',
  'thank you for applying', 'thanks for applying',
  'thanks for your interest', 'thank you for your interest',
];
const ASSESSMENT_KEYWORDS = [
  'coding test', 'coding challenge', 'take-home assignment',
  'online test', 'aptitude test', 'skill assessment',
  'technical assessment', 'hackerrank', 'codility', 'leetcode',
  'codesignal', 'testgorilla', 'complete this test',
  'take-home', 'case study', 'work sample test',
  'assessment link', 'timed test', 'complete the assessment',
  'your test is ready', 'pre-employment test',
  'online assessment', 'coding round', 'complete the test',
  'test invitation', 'assessment invitation',
];
// Application submitted / acknowledgement — goes to Updates
const APPLICATION_ACK_KEYWORDS = [
  'application received', 'application submitted',
  'we received your application', 'thank you for applying',
  'thanks for applying', 'application confirmation',
  'successfully applied', 'your application for',
  'application has been submitted', 'we have received your',
  'application status', 'applied to', 'applied for',
  'application to', 'your application has been',
];
const PROMO_KEYWORDS = [
  'unsubscribe from', 'discount code', 'sale ends', 'deal of the day',
  'promo code', 'coupon code', 'free trial', 'limited time offer',
  'buy now', 'shop now', 'order now', 'exclusive offer',
  '% off', 'clearance sale', 'black friday', 'cyber monday',
  'flash sale', 'newsletter', 'marketing email',
  'advertisement', 'sponsored content', 'cashback offer',
  'special offer', 'save up to', 'don\'t miss out',
  'act now', 'limited stock', 'best deal',
];
const PROMO_WEAK_KEYWORDS = [
  'offer', 'discount', 'sale', 'deal', 'promo', 'coupon',
  'exclusive', 'save', 'reward', 'subscribe',
];
const SOCIAL_KEYWORDS = [
  'followed you', 'liked your', 'commented on your',
  'mentioned you', 'tagged you in', 'friend request',
  'connection request', 'new follower', 'shared a post',
  'reacted to your', 'invitation to connect', 'endorsed you',
  'sent you a message', 'wants to connect',
  'accepted your request', 'posted in your',
];
const SOCIAL_SENDERS = [
  'facebook', 'twitter', 'linkedin', 'instagram', 'tiktok', 'snapchat',
  'reddit', 'discord', 'slack', 'whatsapp', 'telegram', 'pinterest',
  'youtube', 'twitch', 'x.com', 'threads', 'mastodon', 'noreply@github',
  'notifications@github', 'notify@twitter',
];
const UPDATE_KEYWORDS = [
  'your order has', 'shipping update', 'delivered to',
  'tracking number', 'payment receipt', 'payment confirmation',
  'invoice for', 'transaction alert', 'security alert',
  'password changed', 'password reset', 'account update',
  'billing statement', 'subscription renewed', 'subscription expiring',
  'your account has', 'sign-in from', 'new login from',
  'order confirmation', 'shipment update', 'delivery update',
];
// Known job platform senders — helps classify ambiguous emails
const JOB_PLATFORM_SENDERS = [
  'naukri', 'indeed', 'linkedin', 'glassdoor', 'monster',
  'lever', 'greenhouse', 'workday', 'icims', 'smartrecruiters',
  'ashbyhq', 'bamboohr', 'jazz', 'breezy', 'recruitee',
  'wellfound', 'angellist', 'hired', 'triplebyte', 'turing',
  'toptal', 'instahyre', 'cutshort', 'hirist', 'foundit',
  'talent.com', 'ziprecruiter', 'dice', 'careerbuilder',
];

function classifyEmail(item: MailItem): CategoryTab {
  if (item.kind === 'sent') return 'Primary';
  const d = item.data as InboundEmail;
  const subject = (d.subject || '').toLowerCase();
  const bodyText = (d.body_text || '').toLowerCase();
  const senderEmail = (d.from_email || '').toLowerCase();
  const senderName = (d.from_name || '').toLowerCase();
  const blob = [senderEmail, senderName, subject, bodyText].join(' ');

  const has = (keywords: string[]) => keywords.some((k) => blob.includes(k));
  const subjectHas = (keywords: string[]) => keywords.some((k) => subject.includes(k));
  const isFromJobPlatform = JOB_PLATFORM_SENDERS.some((s) => senderEmail.includes(s));

  // 1. OTP — highest priority
  if (has(OTP_KEYWORDS)) return 'OTP';

  // 2. Rejection — only if negative signal present AND no positive/neutral acknowledgement signals
  const hasNegative = REJECTION_NEGATIVE.some((k) => blob.includes(k));
  const hasPositiveSignal = APPLICATION_POSITIVE_SIGNALS.some((k) => blob.includes(k));
  if (hasNegative && !hasPositiveSignal) return 'Rejection';
  if (has(REJECTION_KEYWORDS) && !hasPositiveSignal && !has(APPLICATION_ACK_KEYWORDS)) return 'Rejection';

  // 3. Job Offers
  if (has(JOB_OFFER_KEYWORDS)) return 'Job Offers';

  // 4. Assessment — coding tests, online assessments
  if (has(ASSESSMENT_KEYWORDS)) return 'Assessment';

  // 5. Interview — multi-word phrases or "interview" in subject
  if (has(INTERVIEW_KEYWORDS) || subjectHas(INTERVIEW_SUBJECT_KEYWORDS)) return 'Interview';

  // 6. Onboarding
  if (has(ONBOARDING_KEYWORDS)) return 'Onboarding';

  // 7. Application acknowledgements → Updates ("thank you for applying" without rejection signals)
  if (has(APPLICATION_ACK_KEYWORDS)) return 'Updates';

  // 8. Reminder (job-focused reminders)
  if (has(REMINDER_KEYWORDS)) return 'Reminder';

  // 9. Social
  if (SOCIAL_SENDERS.some((s) => senderEmail.includes(s))) return 'Social';
  if (has(SOCIAL_KEYWORDS)) return 'Social';

  // 10. Promotions
  if (has(PROMO_KEYWORDS)) return 'Promotions';
  if (bodyText.includes('unsubscribe') && PROMO_WEAK_KEYWORDS.some((k) => blob.includes(k))) return 'Promotions';

  // 11. Updates — transactional + job platform generic emails
  if (has(UPDATE_KEYWORDS)) return 'Updates';
  if (isFromJobPlatform) return 'Updates';

  return 'Primary';
}
type MailItem =
  | { kind: 'inbound'; data: InboundEmail }
  | { kind: 'sent'; data: SentEmail };

function computeThreadIdLocal(subject: string | null): string {
  return (subject || '(no subject)').replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim().toLowerCase();
}

interface ThreadGroup {
  threadId: string;
  latestItem: MailItem;
  count: number;
  hasUnread: boolean;
  isStarred: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (isToday) {
    const h = d.getHours();
    const m = pad2(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
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

function AutoHeightWebView({ html, textColor, bgColor }: { html: string; textColor: string; bgColor: string }) {
  const [height, setHeight] = useState(80);
  const injectedJS = `
    (function() {
      function postHeight() {
        var h = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({ height: h }));
      }
      postHeight();
      new MutationObserver(postHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
      window.addEventListener('load', postHeight);
      setTimeout(postHeight, 300);
      setTimeout(postHeight, 1000);
    })();
    true;
  `;
  const fullHtml = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{font-family:-apple-system,sans-serif;font-size:15px;line-height:1.5;color:${textColor};background:${bgColor};padding:0;margin:0;word-break:break-word;overflow:hidden;}img{max-width:100%;height:auto;border-radius:8px;}a{color:#4F46E5;}</style></head><body>${html}</body></html>`;
  return (
    <View style={{ height, marginBottom: 16 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: fullHtml }}
        style={{ height, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        scalesPageToFit={false}
        injectedJavaScript={injectedJS}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.height && data.height > 0) setHeight(Math.ceil(data.height) + 10);
          } catch {}
        }}
      />
    </View>
  );
}

function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const colors = useColors();
  const isDark = colors.background === darkColors.background;
  const { supabaseUserId, userName, userEmail } = useAuth();

  // Get the actual auth email from Supabase session (most reliable source)
  const [authEmail, setAuthEmail] = useState(userEmail || '');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setAuthEmail(data.user.email);
    });
  }, [supabaseUserId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarView, setSidebarView] = useState<SidebarView>('inbox');
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('Primary');
  const mailListRef = useRef<FlatList>(null);
  useScrollToTop(mailListRef);

  useFocusEffect(
    useCallback(() => {
      mailListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [])
  );

  const [proxyEmail, setProxyEmail] = useState<string | null>(null);
  const [copiedProxy, setCopiedProxy] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [composeReplyMessageId, setComposeReplyMessageId] = useState<string | null>(null);
  const [forwardedHeader, setForwardedHeader] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [fileAttachments, setFileAttachments] = useState<{ name: string; uri: string; size?: number | null; mimeType?: string | null }[]>([]);

  const buildAttachments = useCallback(async (): Promise<EmailAttachment[]> => {
    const result: EmailAttachment[] = [];
    for (const asset of attachments) {
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        const ext = asset.uri.split('.').pop() || 'jpg';
        result.push({ filename: `image_${result.length + 1}.${ext}`, content: base64 });
      } catch (e) {
        if (__DEV__) console.log('Failed to read image:', e);
      }
    }
    for (const f of fileAttachments) {
      try {
        const base64 = await FileSystem.readAsStringAsync(f.uri, { encoding: 'base64' });
        result.push({ filename: f.name, content: base64 });
      } catch (e) {
        if (__DEV__) console.log('Failed to read file:', e);
      }
    }
    return result;
  }, [attachments, fileAttachments]);

  const [activeItem, setActiveItem] = useState<MailItem | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Array<(InboundEmail | SentEmail) & { _kind: 'inbound' | 'sent' }>>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  // Detail header expand state (per message id)
  const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(new Set());
  const toggleHeaderExpand = useCallback((msgId: string) => {
    setExpandedHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      return next;
    });
  }, []);

  // Inbox settings
  const [showSettings, setShowSettings] = useState(false);
  const [inboxSettings, setInboxSettings] = useState<InboxSettings>({ forward_to_email: null, reply_mode: 'in_app' });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isMultiSelect = selectedIds.size > 0;
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // FAB scroll animation
  const fabExpanded = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > lastScrollY.current + 5 && y > 20) {
      Animated.timing(fabExpanded, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    } else if (y < lastScrollY.current - 5) {
      Animated.timing(fabExpanded, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    }
    lastScrollY.current = y;
  }, [fabExpanded]);




  useEffect(() => {
    if (!supabaseUserId) return;
    getOrCreateProxyEmail(supabaseUserId, userName || undefined).then(setProxyEmail);
    fetchInboxSettings(supabaseUserId).then(setInboxSettings);
  }, [supabaseUserId]);

  const handleSaveSettings = useCallback(async () => {
    if (!supabaseUserId) return;
    setSettingsLoading(true);
    const ok = await saveInboxSettings(supabaseUserId, inboxSettings);
    setSettingsLoading(false);
    if (ok) {
      Alert.alert('Saved', 'Inbox settings updated.');
      setShowSettings(false);
    } else {
      Alert.alert('Error', 'Failed to save settings.');
    }
  }, [supabaseUserId, inboxSettings]);

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

  const openCompose = useCallback((to = '', subject = '', body = '', mode: 'new' | 'reply' | 'forward' = 'new', fwdHeader = '', replyMessageId: string | null = null) => {
    setComposeTo(to);
    setComposeSubject(subject);
    setComposeBody(body);
    setComposeMode(mode);
    setComposeReplyMessageId(replyMessageId);
    setForwardedHeader(fwdHeader);
    setAttachments([]);
    setFileAttachments([]);
    setShowCompose(true);
  }, []);

  const closeCompose = useCallback(() => {
    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeMode('new');
    setComposeReplyMessageId(null);
    setForwardedHeader('');
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

      // inbox: fetch both inbound + sent, return all for thread grouping
      const [inbound, sent] = await Promise.all([fetchInboundEmails(uid), fetchSentEmails(uid)]);
      const inboundFiltered = inbound.filter((x) => !x.is_archived);
      const sentFiltered = sent.filter((x) => !x.is_archived);
      const all: MailItem[] = [
        ...inboundFiltered.map((x) => ({ kind: 'inbound' as const, data: x })),
        ...sentFiltered.map((x) => ({ kind: 'sent' as const, data: x })),
      ];
      return all.sort((a, b) => {
        const aDate = a.kind === 'inbound' ? a.data.received_at : a.data.sent_at;
        const bDate = b.kind === 'inbound' ? b.data.received_at : b.data.sent_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    },
  });

  const unreadCount = useMemo(() => {
    if (!supabaseUserId) return 0;
    const items = listQuery.data || [];
    // Only count unread from inbound items that are not archived
    return items.reduce((count, item) => {
      if (item.kind !== 'inbound') return count;
      if (item.data.is_archived) return count;
      return count + (item.data.is_read ? 0 : 1);
    }, 0);
  }, [listQuery.data, supabaseUserId]);



  // Dynamically sort category tabs: Primary & Updates always first two, rest sorted by recency
  const sortedCategoryTabs = useMemo((): CategoryTab[] => {
    const PINNED: CategoryTab[] = ['Primary', 'Updates'];
    const items = listQuery.data || [];
    const dynamic = DEFAULT_CATEGORY_TABS.filter((t) => !PINNED.includes(t));
    if (items.length === 0) return [...PINNED, ...dynamic];

    const latestTimestamp = new Map<CategoryTab, number>();
    for (const item of items) {
      const cat = classifyEmail(item);
      const dateStr = item.kind === 'inbound' ? item.data.received_at : item.data.sent_at;
      const ts = new Date(dateStr).getTime();
      if (!latestTimestamp.has(cat) || ts > latestTimestamp.get(cat)!) {
        latestTimestamp.set(cat, ts);
      }
    }

    dynamic.sort((a, b) => (latestTimestamp.get(b) || 0) - (latestTimestamp.get(a) || 0));
    return [...PINNED, ...dynamic];
  }, [listQuery.data]);

  // Group items into threads for inbox view
  const threadGroups = useMemo((): ThreadGroup[] => {
    const items = listQuery.data || [];
    if (sidebarView !== 'inbox') return [];
    const map = new Map<string, { items: MailItem[]; hasUnread: boolean; isStarred: boolean }>();
    for (const item of items) {
      const tid = item.data.thread_id || computeThreadIdLocal(item.data.subject);
      if (!map.has(tid)) map.set(tid, { items: [], hasUnread: false, isStarred: false });
      const group = map.get(tid)!;
      group.items.push(item);
      if (item.kind === 'inbound' && !item.data.is_read) group.hasUnread = true;
      if (item.data.is_starred) group.isStarred = true;
    }
    const groups: ThreadGroup[] = [];
    Array.from(map.entries()).forEach(([threadId, group]) => {
      groups.push({
        threadId,
        latestItem: group.items[0],
        count: group.items.length,
        hasUnread: group.hasUnread,
        isStarred: group.isStarred,
      });
    });
    return groups;
  }, [listQuery.data, sidebarView]);

  const matchesQuery = useCallback((item: MailItem, q: string): boolean => {
    const subject = (item.data.subject || '').toLowerCase();
    const bodyText = (item.data.body_text || '').toLowerCase();
    const bodyHtmlStripped = item.kind === 'inbound' && (item.data as InboundEmail).body_html
      ? stripHtmlToText((item.data as InboundEmail).body_html!).toLowerCase()
      : '';
    if (subject.includes(q) || bodyText.includes(q) || bodyHtmlStripped.includes(q)) return true;
    if (item.kind === 'inbound') {
      return (item.data.from_name || '').toLowerCase().includes(q) ||
        item.data.from_email.toLowerCase().includes(q);
    }
    return item.data.to_email.toLowerCase().includes(q);
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (sidebarView === 'inbox') {
      // For Updates category, show individual emails instead of threads
      if (activeCategory === 'Updates') {
        const allItems = listQuery.data || [];
        let items = allItems.filter((m) => classifyEmail(m) === 'Updates');
        if (q) items = items.filter((item) => matchesQuery(item, q));
        return items;
      }

      let groups = threadGroups;

      // Filter by category
      groups = groups.filter((g) => classifyEmail(g.latestItem) === activeCategory);

      if (q) {
        const allItems = listQuery.data || [];
        groups = groups.filter((g) => {
          const threadItems = allItems.filter((m) => {
            const tid = m.data.thread_id || computeThreadIdLocal(m.data.subject);
            return tid === g.threadId;
          });
          return threadItems.some((item) => matchesQuery(item, q));
        });
      }
      return groups;
    }

    let items = listQuery.data || [];
    if (q) {
      items = items.filter((item) => matchesQuery(item, q));
    }
    return items;
  }, [listQuery.data, searchQuery, sidebarView, threadGroups, matchesQuery, activeCategory]);

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

  // Resolve selected MailItems from IDs
  const selectedItems = useMemo((): MailItem[] => {
    if (!selectedIds.size) return [];
    const all = listQuery.data || [];
    return all.filter((m) => selectedIds.has(getItemId(m)));
  }, [selectedIds, listQuery.data]);

  const bulkArchive = useCallback(() => {
    selectedItems.forEach((item) => archiveMutation.mutate({ item, archived: true }));
    clearSelection();
  }, [selectedItems, archiveMutation, clearSelection]);

  const bulkDelete = useCallback(() => {
    Alert.alert('Delete', `Delete ${selectedItems.length} email(s)? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { selectedItems.forEach((item) => deleteMutation.mutate(item)); clearSelection(); } },
    ]);
  }, [selectedItems, deleteMutation, clearSelection]);

  const bulkMarkRead = useCallback(() => {
    const hasUnread = selectedItems.some((m) => m.kind === 'inbound' && !m.data.is_read);
    selectedItems.forEach((m) => {
      if (m.kind === 'inbound') markReadMutation.mutate({ emailId: m.data.id, read: hasUnread });
    });
    clearSelection();
  }, [selectedItems, markReadMutation, clearSelection]);

  const bulkStar = useCallback(() => {
    const hasUnstarred = selectedItems.some((m) => !m.data.is_starred);
    selectedItems.forEach((item) => toggleStarMutation.mutate({ item, starred: hasUnstarred }));
    clearSelection();
  }, [selectedItems, toggleStarMutation, clearSelection]);

  const bulkHasUnread = useMemo(() => selectedItems.some((m) => m.kind === 'inbound' && !m.data.is_read), [selectedItems]);

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
    if (!isValidEmail(composeTo.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setIsSending(true);
    let fullBody = composeBody.trim();
    if (forwardedHeader) {
      fullBody = fullBody
        ? `${fullBody}\n\n---------- Forwarded message ----------\n${forwardedHeader}`
        : `---------- Forwarded message ----------\n${forwardedHeader}`;
    }
    const emailAttachments = await buildAttachments();
    if (__DEV__) console.log('Built attachments:', emailAttachments.length, emailAttachments.map(a => `${a.filename}:${Math.round(a.content.length/1024)}KB`));
    const ok = await sendEmailViaResend(
      proxyEmail,
      composeTo.trim(),
      composeSubject.trim(),
      fullBody,
      supabaseUserId,
      false,
      composeReplyMessageId || undefined,
      userName || undefined,
      emailAttachments.length > 0 ? emailAttachments : undefined
    );
    setIsSending(false);

    if (ok) {
      closeCompose();
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
      Alert.alert('Sent', 'Email sent successfully.');
    } else {
      Alert.alert('Error', 'Failed to send email. Please try again.');
    }
  }, [composeBody, composeSubject, composeTo, proxyEmail, supabaseUserId, composeReplyMessageId, closeCompose, queryClient, userName, buildAttachments]);

  const handlePickAttachment = useCallback(async () => {
    Alert.alert('Add attachment', '', [
      {
        text: 'Photo Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
          });
          if (!result.canceled) {
            setAttachments((prev) => [...prev, ...result.assets]);
          }
        },
      },
      {
        text: 'Files',
        onPress: async () => {
          const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
          if (!res.canceled) {
            setFileAttachments((prev) => [
              ...prev,
              ...res.assets.map((a) => ({ name: a.name, uri: a.uri, size: a.size, mimeType: a.mimeType })),
            ]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);


  const headerTitle =
    sidebarView === 'sent' ? 'Sent' : sidebarView === 'starred' ? 'Starred' : sidebarView === 'archived' ? 'Archived' : 'Inbox';

  const showEmptyState = useMemo(() => {
    if (!supabaseUserId) return true;
    if (listQuery.isLoading) return true;
    if (listQuery.isError) return true;
    return filteredItems.length === 0;
  }, [filteredItems.length, listQuery.isError, listQuery.isLoading, supabaseUserId]);

  const openItem = useCallback(
    (item: MailItem, threadId?: string) => {
      setActiveItem(item);
      const tid = threadId || item.data.thread_id || computeThreadIdLocal(item.data.subject);
      setActiveThreadId(tid);

      // If no threadId passed, show single email only (e.g. unbatched Updates)
      if (!threadId) {
        if (item.kind === 'inbound' && !item.data.is_read) {
          markReadMutation.mutate({ emailId: item.data.id, read: true });
        }
        setThreadMessages([]);
        setThreadLoading(false);
        return;
      }

      // Mark ALL unread inbound emails in this thread as read
      const allItems = listQuery.data || [];
      const threadItems = allItems.filter((m) => {
        const mTid = m.data.thread_id || computeThreadIdLocal(m.data.subject);
        return mTid === tid;
      });

      threadItems.forEach((m) => {
        if (m.kind === 'inbound' && !m.data.is_read) {
          markReadMutation.mutate({ emailId: m.data.id, read: true });
        }
      });

      if (threadItems.length > 1) {
        const msgs = threadItems.map((m) => ({
          ...m.data,
          _kind: m.kind as 'inbound' | 'sent',
        })).sort((a, b) => {
          const aDate = a._kind === 'inbound' ? (a as any).received_at : (a as any).sent_at;
          const bDate = b._kind === 'inbound' ? (b as any).received_at : (b as any).sent_at;
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        });
        setThreadMessages(msgs as any);
        setThreadLoading(false);
      } else if (supabaseUserId && tid) {
        setThreadLoading(true);
        fetchThreadMessages(supabaseUserId, tid).then((msgs) => {
          setThreadMessages(msgs);
          setThreadLoading(false);
        });
      } else {
        setThreadMessages([]);
        setThreadLoading(false);
      }
    },
    [markReadMutation, supabaseUserId, listQuery.data]
  );

  const closeItem = useCallback(() => {
    setActiveItem(null);
    setActiveThreadId(null);
    setThreadMessages([]);
  }, []);

  const confirmDelete = useCallback(
    (item: MailItem) => {
      Alert.alert('Delete', 'Delete this email? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item) },
      ]);
    },
    [deleteMutation]
  );

  const MailRowInner = useCallback(
    ({ item, threadCount, isThread }: { item: MailItem; threadCount: number; isThread: boolean; threadId?: string }) => {
      const isStarred = item.data.is_starred;
      const isUnread = item.kind === 'inbound' ? !item.data.is_read : false;
      const fromName =
        item.kind === 'inbound'
          ? parseDisplayName(item.data.from_name, item.data.from_email)
          : getDisplayName(item.data.to_email || '(unknown)');
      const subject = item.data.subject || '(no subject)';
      const preview = getPreviewText(item.data.body_text || '');
      const time = item.kind === 'inbound' ? formatRelativeDate(item.data.received_at) : formatRelativeDate(item.data.sent_at);
      const itemId = getItemId(item);
      const isSelected = selectedIds.has(itemId);

      const archiveAction = () => (
        <View style={styles.swipeActionsWrap}>
          <Pressable
            style={[styles.swipeActionBtn, styles.swipeArchiveBtn]}
            onPress={() => archiveMutation.mutate({ item, archived: true })}
          >
            <Archive size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      );

      return (
        <Swipeable
          renderRightActions={archiveAction}
          renderLeftActions={archiveAction}
          rightThreshold={60}
          leftThreshold={60}
          friction={1.6}
          overshootRight={false}
          overshootLeft={false}
        >
          <Pressable
            style={({ pressed }) => [
              styles.emailItem,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => {
              if (isMultiSelect) {
                toggleSelect(itemId);
              } else {
                openItem(item, isThread ? (item.data.thread_id || computeThreadIdLocal(item.data.subject)) : undefined);
              }
            }}
            onLongPress={() => {
              if (!isMultiSelect) toggleSelect(itemId);
            }}
            testID={`mail-item-${getItemId(item)}`}
          >
            <Pressable onPress={() => toggleSelect(itemId)} hitSlop={4}>
              {isSelected ? (
                <View style={[styles.logoAvatar, { backgroundColor: '#4F46E5' }]}>
                  <Check size={20} color="#FFFFFF" />
                </View>
              ) : (
                <View style={[styles.logoAvatar, { backgroundColor: getAvatarColor(fromName) }]}>
                  <Text style={styles.avatarInitials}>{getInitials(fromName)}</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.emailContent}>
              <View style={styles.emailTopRow}>
                <Text
                  style={[styles.emailSender, { color: colors.textPrimary }, isUnread && styles.emailSenderUnread]}
                  numberOfLines={1}
                >
                  {item.kind === 'sent' ? `To: ${fromName}` : fromName}
                </Text>
                {threadCount > 1 && (
                  <Text style={[styles.threadCountBadge, { color: colors.textTertiary }]}>
                    {threadCount}
                  </Text>
                )}
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

            {isUnread && <View style={styles.unreadDot} />}
          </Pressable>
        </Swipeable>
      );
    },
    [archiveMutation, colors, confirmDelete, markReadMutation, openItem, toggleStarMutation, selectedIds, isMultiSelect, toggleSelect]
  );

  const renderItem = useCallback(
    ({ item }: { item: ThreadGroup | MailItem }) => {
      // Inbox view: item is ThreadGroup
      if (sidebarView === 'inbox' && 'threadId' in item) {
        const group = item as ThreadGroup;
        return <MailRowInner item={group.latestItem} threadCount={group.count} isThread />
      }
      // Other views or Updates category: item is MailItem
      return <MailRowInner item={item as MailItem} threadCount={1} isThread={false} />;
    },
    [MailRowInner, sidebarView]
  );

  const [inlineReplyMode, setInlineReplyMode] = useState<'none' | 'reply' | 'forward'>('none');
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [inlineSending, setInlineSending] = useState(false);
  const inlineReplyRef = useRef<TextInput>(null);
  const detailScrollRef = useRef<ScrollView>(null);

  const closeInlineReply = useCallback(() => {
    setInlineReplyMode('none');
    setInlineReplyText('');
  }, []);

  const handleInlineSend = useCallback(async (item: MailItem) => {
    if (!supabaseUserId || !proxyEmail || !inlineReplyText.trim()) return;
    const isInbound = item.kind === 'inbound';

    // Find the last inbound message in thread for reply-to
    const lastInbound = [...threadMessages].reverse().find((m) => m._kind === 'inbound') as (InboundEmail & { _kind: 'inbound' }) | undefined;
    const toAddr = lastInbound?.from_email || (isInbound ? item.data.from_email : item.data.to_email);
    const subject = item.data.subject || '(no subject)';
    const replySubject = `Re: ${subject.replace(/^Re:\s*/i, '')}`;
    const messageId = lastInbound?.message_id || (isInbound ? (item.data as InboundEmail).message_id : undefined);

    setInlineSending(true);
    const ok = await sendEmailViaResend(
      proxyEmail,
      toAddr,
      replySubject,
      inlineReplyText.trim(),
      supabaseUserId,
      false,
      messageId || undefined,
      userName || undefined
    );
    setInlineSending(false);

    if (ok) {
      closeInlineReply();
      queryClient.invalidateQueries({ queryKey: ['nextquark-mail'] });
      // Reload thread messages to show the sent reply
      const tid = activeThreadId || item.data.thread_id || computeThreadIdLocal(item.data.subject);
      if (tid) {
        fetchThreadMessages(supabaseUserId, tid).then(setThreadMessages);
      }
      Alert.alert('Sent', 'Your reply has been sent.');
    } else {
      Alert.alert('Error', 'Failed to send. Please try again.');
    }
  }, [supabaseUserId, proxyEmail, inlineReplyText, threadMessages, activeThreadId, closeInlineReply, queryClient, userName]);

  const closeItemAndReply = useCallback(() => {
    closeInlineReply();
    setActiveItem(null);
  }, [closeInlineReply]);

  const detailItem = activeItem;
  const detailIsInbound = detailItem?.kind === 'inbound';
  const detailSubject = detailItem?.data.subject || '(no subject)';
  const detailIsStarred = detailItem?.data.is_starred ?? false;
  const detailIsRead = detailIsInbound ? (detailItem?.data as InboundEmail).is_read : true;
  const detailHasThread = threadMessages.length > 1;
  const detailShowingInlineReply = inlineReplyMode !== 'none';
  const detailLastInbound = useMemo(() => {
    return [...threadMessages].reverse().find((m) => m._kind === 'inbound') as (InboundEmail & { _kind: 'inbound' }) | undefined;
  }, [threadMessages]);
  const detailReplyToEmail = detailLastInbound?.from_email || (detailIsInbound ? (detailItem?.data as InboundEmail)?.from_email : '') || '';
  const detailReplyToName = detailLastInbound
    ? parseDisplayName(detailLastInbound.from_name, detailLastInbound.from_email)
    : (detailIsInbound ? parseDisplayName((detailItem?.data as InboundEmail)?.from_name, (detailItem?.data as InboundEmail)?.from_email) : '');

  const detailModal = (
      <Modal visible={!!activeItem} animationType="slide" transparent={false} onRequestClose={closeItemAndReply}>
        <KeyboardAvoidingView
          style={[styles.gmailDetailContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}
          behavior='padding'
        >
          {/* Fixed top bar */}
          {detailItem && <View style={[styles.gmailTopBar, { borderBottomColor: colors.border }]}>
            <Pressable onPress={closeItemAndReply} hitSlop={10} style={styles.gmailBackBtn}>
              <ArrowLeft size={22} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.gmailTopBarActions}>
              {detailIsInbound && (
                <Pressable
                  onPress={() => {
                    markReadMutation.mutate({ emailId: detailItem.data.id, read: !detailIsRead });
                    closeItemAndReply();
                  }}
                  hitSlop={8}
                  style={styles.gmailTopBarIcon}
                >
                  {detailIsRead ? <MailOpen size={20} color={colors.textPrimary} /> : <Mail size={20} color={colors.textPrimary} />}
                </Pressable>
              )}
              <Pressable
                onPress={() => { closeItemAndReply(); confirmDelete(detailItem); }}
                hitSlop={8}
                style={styles.gmailTopBarIcon}
              >
                <Trash2 size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  archiveMutation.mutate({ item: detailItem, archived: !detailItem.data.is_archived });
                  closeItemAndReply();
                }}
                hitSlop={8}
                style={styles.gmailTopBarIcon}
              >
                <Archive size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => toggleStarMutation.mutate({ item: detailItem, starred: !detailIsStarred })}
                hitSlop={8}
                style={styles.gmailTopBarIcon}
              >
                <Star size={20} color={detailIsStarred ? '#F59E0B' : colors.textTertiary} fill={detailIsStarred ? '#F59E0B' : 'transparent'} />
              </Pressable>
            </View>
          </View>}

          {/* Scrollable content */}
          <ScrollView
            ref={detailScrollRef}
            style={styles.gmailBodyWrap}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (detailShowingInlineReply) {
                setTimeout(() => detailScrollRef.current?.scrollToEnd({ animated: true }), 150);
              }
            }}
          >
            {/* Subject */}
            <View style={styles.gmailSubjectRow}>
              <Text style={[styles.gmailSubject, { color: colors.textPrimary }]}>{detailSubject}</Text>
            </View>

            {/* Thread messages or single message */}
            {threadLoading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.textTertiary} />
              </View>
            ) : (detailHasThread ? threadMessages : detailItem ? [{ ...detailItem.data, _kind: detailItem.kind }] : []).length > 0 ? (
              (detailHasThread ? threadMessages : [{ ...detailItem!.data, _kind: detailItem!.kind }]).map((msg: any, idx: number) => {
                const isSent = msg._kind === 'sent';
                const msgFromEmail = isSent ? (msg as SentEmail).from_email : (msg as InboundEmail).from_email;
                const msgName = isSent ? 'You' : parseDisplayName((msg as InboundEmail).from_name, msgFromEmail);
                const msgDate = new Date(isSent ? (msg as SentEmail).sent_at : (msg as InboundEmail).received_at);
                const msgDateShort = !isNaN(msgDate.getTime())
                  ? `${msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : '';
                const msgDateFull = !isNaN(msgDate.getTime())
                  ? `${msgDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}, ${msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                  : '';
                const msgToEmail = isSent ? (msg as SentEmail).to_email : (msg as InboundEmail).to_email;
                const msgHtml = msg._kind === 'inbound' ? ((msg as InboundEmail).body_html || '') : '';
                const msgPlainText = msg.body_text?.trim() || '';
                const hasHtml = msgHtml.trim().length > 0;

                return (
                  <View key={msg.id} style={idx > 0 ? [styles.threadMsgSeparator, { borderTopColor: colors.border }] : undefined}>
                    <View style={styles.gmailSenderRow}>
                      <View style={[styles.gmailSenderAvatar, { backgroundColor: isSent ? '#4F46E5' : getAvatarColor(msgName) }]}>
                        <Text style={styles.gmailSenderInitials}>{isSent ? 'You' : getInitials(msgName)}</Text>
                      </View>
                      <View style={styles.gmailSenderInfo}>
                        <Pressable onPress={() => toggleHeaderExpand(msg.id)} style={styles.gmailSenderNameRow}>
                          <Text style={[styles.gmailSenderName, { color: colors.textPrimary }]} numberOfLines={1}>{msgName}</Text>
                          <ChevronDown size={16} color={colors.textTertiary} style={expandedHeaders.has(msg.id) ? { transform: [{ rotate: '180deg' }] } : undefined} />
                          <Text style={[styles.gmailDate, { color: colors.textTertiary }]}>{msgDateShort}</Text>
                        </Pressable>
                        {!expandedHeaders.has(msg.id) && (
                          <Text style={[styles.gmailToCompact, { color: colors.textSecondary }]} numberOfLines={1}>
                            to {msgToEmail?.split('@')[0] || 'me'}
                          </Text>
                        )}
                        {expandedHeaders.has(msg.id) && (
                          <View style={styles.gmailExpandedHeader}>
                            <View style={styles.gmailHeaderRow}>
                              <Text style={[styles.gmailHeaderLabel, { color: colors.textTertiary }]}>From</Text>
                              <Text style={[styles.gmailHeaderValue, { color: colors.textSecondary }]} numberOfLines={1}>{msgFromEmail || '(unknown)'}</Text>
                            </View>
                            <View style={styles.gmailHeaderRow}>
                              <Text style={[styles.gmailHeaderLabel, { color: colors.textTertiary }]}>To</Text>
                              <Text style={[styles.gmailHeaderValue, { color: colors.textSecondary }]} numberOfLines={1}>{msgToEmail || 'me'}</Text>
                            </View>
                            <View style={styles.gmailHeaderRow}>
                              <Text style={[styles.gmailHeaderLabel, { color: colors.textTertiary }]}>Date</Text>
                              <Text style={[styles.gmailHeaderValue, { color: colors.textSecondary }]}>{msgDateFull || '(no date)'}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                    <AutoHeightWebView
                      html={hasHtml ? msgHtml : `<pre style="white-space:pre-wrap;word-break:break-word;font-family:-apple-system,sans-serif;font-size:15px;line-height:1.5;margin:0;">${(msgPlainText || stripHtmlToText(msgHtml)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`}
                      textColor={colors.textPrimary}
                      bgColor={colors.background}
                    />
                  </View>
                );
              })
            ) : null}

            {/* Inline reply card — Gmail style */}
            {detailShowingInlineReply && detailItem && (
              <View style={[styles.inlineReplyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={[styles.inlineReplyHeader, { borderBottomColor: colors.border }]}>
                  <View style={styles.inlineReplyHeaderLeft}>
                    <Reply size={14} color={colors.textTertiary} />
                    <Text style={[styles.inlineReplyTo, { color: colors.textSecondary }]} numberOfLines={1}>
                      {detailReplyToName}
                    </Text>
                  </View>
                  <Pressable onPress={closeInlineReply} hitSlop={8}>
                    <X size={16} color={colors.textTertiary} />
                  </Pressable>
                </View>
                <TextInput
                  ref={inlineReplyRef}
                  style={[styles.inlineReplyInput, { color: colors.textPrimary }]}
                  placeholder=""
                  placeholderTextColor={colors.textTertiary}
                  value={inlineReplyText}
                  onChangeText={setInlineReplyText}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                  onFocus={() => {
                    setTimeout(() => detailScrollRef.current?.scrollToEnd({ animated: true }), 200);
                  }}
                />
                {/* Quoted original message */}
                <View style={[styles.inlineQuotedBlock, { borderLeftColor: colors.textTertiary }]}>
                  <Text style={[styles.inlineQuotedMeta, { color: colors.textTertiary }]}>
                    On {(() => {
                      const lastMsg = detailHasThread ? threadMessages[threadMessages.length - 1] : null;
                      const dateStr = lastMsg
                        ? (lastMsg._kind === 'inbound' ? (lastMsg as any).received_at : (lastMsg as any).sent_at)
                        : (detailIsInbound ? (detailItem.data as any).received_at : (detailItem.data as any).sent_at);
                      const d = new Date(dateStr);
                      return !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
                    })()}, {detailReplyToName} &lt;{detailReplyToEmail}&gt; wrote:
                  </Text>
                  <Text style={[styles.inlineQuotedText, { color: colors.textTertiary }]} numberOfLines={6}>
                    {(() => {
                      const lastMsg = detailHasThread ? threadMessages[threadMessages.length - 1] : null;
                      return (lastMsg?.body_text || detailItem.data.body_text || '').trim();
                    })()}
                  </Text>
                </View>
                <View style={styles.inlineReplySendRow}>
                  <Pressable
                    style={[styles.inlineReplySendBtn, inlineReplyText.trim() ? styles.inlineReplySendBtnActive : null]}
                    onPress={() => handleInlineSend(detailItem!)}
                    disabled={!inlineReplyText.trim() || inlineSending}
                  >
                    {inlineSending ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Send size={16} color={inlineReplyText.trim() ? '#FFF' : colors.textTertiary} />
                    )}
                    <Text style={[styles.inlineReplySendText, inlineReplyText.trim() && { color: '#FFF' }]}>
                      {inlineSending ? 'Sending\u2026' : 'Send'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Fixed bottom bar: Reply + Forward */}
          {!detailShowingInlineReply && detailItem && (detailIsInbound || detailHasThread) && (
            <View style={[styles.gmailBottomBar, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <Pressable
                style={[styles.gmailBottomBtn, { borderColor: colors.border }]}
                onPress={() => {
                  if (inboxSettings.reply_mode === 'forward_to_email') {
                    const replySubject = `Re: ${detailSubject.replace(/^Re:\s*/i, '')}`;
                    const mailtoUrl = `mailto:${detailReplyToEmail}?subject=${encodeURIComponent(replySubject)}`;
                    Linking.openURL(mailtoUrl);
                  } else {
                    setInlineReplyMode('reply');
                    setTimeout(() => {
                      inlineReplyRef.current?.focus();
                      detailScrollRef.current?.scrollToEnd({ animated: true });
                    }, 200);
                  }
                }}
              >
                <Reply size={18} color={colors.textSecondary} />
                <Text style={[styles.gmailBottomBtnText, { color: colors.textPrimary }]}>Reply</Text>
              </Pressable>
              <Pressable
                style={[styles.gmailBottomBtn, { borderColor: colors.border }]}
                onPress={() => {
                  const lastMsg = detailHasThread ? threadMessages[threadMessages.length - 1] : null;
                  const lastBody = (lastMsg?.body_text || detailItem!.data.body_text || '').trim();
                  const dateStr = lastMsg
                    ? (lastMsg._kind === 'inbound' ? (lastMsg as any).received_at : (lastMsg as any).sent_at)
                    : (detailIsInbound ? (detailItem!.data as any).received_at : (detailItem!.data as any).sent_at);
                  const d = new Date(dateStr);
                  const dateFormatted = !isNaN(d.getTime())
                    ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '';
                  const toEmail = detailIsInbound ? (detailItem!.data as InboundEmail).to_email : (detailItem!.data as SentEmail).to_email;
                  const fwdHeader = `From: ${detailReplyToName} <${detailReplyToEmail}>\nDate: ${dateFormatted}\nSubject: ${detailSubject}\nTo: ${toEmail || ''}\n\n${lastBody}`;
                  closeItemAndReply();
                  openCompose('', `Fwd: ${detailSubject}`, '', 'forward', fwdHeader);
                }}
              >
                <Forward size={18} color={colors.textSecondary} />
                <Text style={[styles.gmailBottomBtnText, { color: colors.textPrimary }]}>Forward</Text>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
  );

  return (
    <TabTransitionWrapper routeName="messages">
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        {isMultiSelect ? (
          <View style={[styles.selectBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable onPress={clearSelection} hitSlop={8} style={styles.searchPillIcon}>
              <ArrowLeft size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.selectBarCount, { color: colors.textPrimary }]}>{selectedIds.size}</Text>
            <View style={styles.selectBarActions}>
              <Pressable onPress={bulkArchive} hitSlop={8} style={styles.selectBarBtn}>
                <Archive size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable onPress={bulkDelete} hitSlop={8} style={styles.selectBarBtn}>
                <Trash2 size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable onPress={bulkMarkRead} hitSlop={8} style={styles.selectBarBtn}>
                {bulkHasUnread ? <Mail size={20} color={colors.textPrimary} /> : <MailOpen size={20} color={colors.textPrimary} />}
              </Pressable>
              <Pressable onPress={bulkStar} hitSlop={8} style={styles.selectBarBtn}>
                <Star size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.searchPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable onPress={() => setShowSidebar(true)} hitSlop={8} style={styles.searchPillIcon}>
              <Menu size={20} color={colors.textSecondary} />
            </Pressable>
            <TextInput
              style={[styles.searchPillInput, { color: colors.textPrimary }]}
              placeholder={`Search in ${headerTitle.toLowerCase()}`}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(sanitizeSearchInput(text))}
            />
            <Pressable onPress={() => setShowSettings(true)} hitSlop={8} style={styles.searchPillIcon}>
              {userName ? (
                <View style={[styles.searchPillAvatar, { backgroundColor: getAvatarColor(userName) }]}>
                  <Text style={styles.searchPillAvatarText}>{getInitials(userName)}</Text>
                </View>
              ) : (
                <RefreshCw size={18} color={listQuery.isFetching ? colors.textTertiary : colors.textSecondary} />
              )}
            </Pressable>
          </View>
        )}

        {sidebarView === 'inbox' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabsContainer}
            style={styles.categoryTabsScroll}
          >
            {sortedCategoryTabs.map((tab) => {
              const isActive = activeCategory === tab;
              const { light, dark } = CATEGORY_COLORS[tab];
              const tabCount = threadGroups.filter((g) => classifyEmail(g.latestItem) === tab).length;
              return (
                <Pressable
                  key={tab}
                  style={[
                    styles.categoryTab,
                    { backgroundColor: isActive ? dark : isDark ? dark + '20' : light, borderColor: isActive ? dark : 'transparent' },
                  ]}
                  onPress={() => setActiveCategory(tab)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      { color: isActive ? '#FFFFFF' : isDark ? light : dark },
                    ]}
                  >
                    {tab}{tabCount > 0 ? ` ${tabCount}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}



        <FlatList
          ref={mailListRef}
          data={filteredItems as any[]}
          renderItem={renderItem as any}
          keyExtractor={(item: any) => {
            if ('threadId' in item) return `thread:${item.threadId}`;
            return getItemId(item);
          }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          contentContainerStyle={showEmptyState ? styles.emptyContainer : { paddingBottom: 56 + insets.bottom }}
          ListEmptyComponent={() => {
            if (!supabaseUserId) {
              return (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sign in to use NextQuark Mail</Text>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                    Your proxy inbox is linked to your account.
                  </Text>
                </View>
              );
            }
            if (listQuery.isLoading) {
              return (
                <View style={{ padding: 16 }}>
                  {[1,2,3,4,5].map(i => <SkeletonMailRow key={i} />)}
                </View>
              );
            }
            if (listQuery.isError) {
              return (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Unable to load mail</Text>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Pull to refresh or try again in a moment.</Text>
                  <Pressable style={styles.retryBtn} onPress={refetchAll}>
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </Pressable>
                </View>
              );
            }
            return (
              <View style={styles.emptyState}>
                {searchQuery ? (
                  <>
                    <Inbox size={40} color="#4B5563" />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No results found</Text>
                    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Try a different search term.</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.emptyIllustration}>
                      <Sun size={56} color="#F59E0B" />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nothing in {sidebarView === 'inbox' ? activeCategory : headerTitle}</Text>
                    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                      {sidebarView === 'inbox' ? 'Enjoy your day! Share your proxy address to start receiving mail here.' : `No ${headerTitle.toLowerCase()} emails yet.`}
                    </Text>
                  </>
                )}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={listQuery.isFetching && !listQuery.isLoading} onRefresh={refetchAll} tintColor={Colors.secondary} />
          }
        />

        {proxyEmail && (
          <Animated.View
            style={[
              styles.composeFab,
              {
                backgroundColor: isDark ? '#FFFFFF' : '#111111',
                width: fabExpanded.interpolate({ inputRange: [0, 1], outputRange: [56, 140] }),
              },
            ]}
          >
            <Pressable style={styles.composeFabInner} onPress={() => openCompose()}>
              <Pencil size={20} color={isDark ? '#111111' : '#FFFFFF'} />
              <Animated.Text
                style={[
                  styles.composeFabText,
                  {
                    color: isDark ? '#111111' : '#FFFFFF',
                    opacity: fabExpanded,
                    maxWidth: fabExpanded.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }),
                  },
                ]}
                numberOfLines={1}
              >
                Compose
              </Animated.Text>
            </Pressable>
          </Animated.View>
        )}

        <Modal
          visible={showCompose}
          animationType="slide"
          transparent={false}
          onRequestClose={closeCompose}
        >
          <KeyboardAvoidingView
            style={[styles.composeFullScreen, { backgroundColor: colors.background, paddingTop: insets.top }]}
            behavior='padding'
          >
            <View style={[styles.composeHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={closeCompose} hitSlop={8} style={styles.composeBackBtn}>
                <ArrowLeft size={22} color={colors.textPrimary} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={handlePickAttachment} hitSlop={8} style={styles.composeHeaderIcon}>
                <Paperclip size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                style={[styles.composeSendBtn, (!composeTo.trim() || !composeSubject.trim() || isSending) && { opacity: 0.35 }]}
                onPress={handleSendEmail}
                disabled={!composeTo.trim() || !composeSubject.trim() || isSending}
              >
                {isSending ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Send size={20} color={colors.textPrimary} />}
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={[styles.composeField, { borderBottomColor: colors.border }]}>
                <Text style={[styles.composeLabel, { color: colors.textTertiary }]}>From</Text>
                <Text style={[styles.composeFromValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {proxyEmail || '...'}
                </Text>
              </View>
              <View style={[styles.composeField, { borderBottomColor: colors.border }]}>
                <Text style={[styles.composeLabel, { color: colors.textTertiary }]}>To</Text>
                <TextInput
                  style={[styles.composeInput, { color: colors.textPrimary }]}
                  value={composeTo}
                  onChangeText={setComposeTo}
                  placeholder=""
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.composeField, { borderBottomColor: colors.border }]}>
                <Text style={[styles.composeLabel, { color: colors.textTertiary }]}>Subject</Text>
                <TextInput
                  style={[styles.composeInput, { color: colors.textPrimary }]}
                  value={composeSubject}
                  onChangeText={setComposeSubject}
                  placeholder=""
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {(fileAttachments.length > 0 || attachments.length > 0) && (
                <View style={[styles.attachmentsRow, { borderBottomColor: colors.border }]}>
                  {fileAttachments.map((f, i) => (
                    <Pressable
                      key={f.uri}
                      style={[styles.attachmentChip, { borderColor: colors.border }]}
                      onPress={() => setFileAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Text style={[styles.attachmentChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <X size={12} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                  {attachments.map((asset, i) => (
                    <Pressable
                      key={asset.assetId ?? asset.uri}
                      style={styles.attachmentThumbWrap}
                      onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Image
                        source={{ uri: asset.uri }}
                        style={styles.attachmentThumb}
                      />
                      <View style={styles.attachmentRemoveBadge}>
                        <X size={10} color="#FFF" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              <TextInput
                style={[
                  styles.composeBodyInput,
                  { color: colors.textPrimary },
                  forwardedHeader ? { minHeight: 60, maxHeight: 120 } : { minHeight: 200 },
                ]}
                value={composeBody}
                onChangeText={setComposeBody}
                placeholder={composeMode === 'forward' ? 'Add a message (optional)' : 'Compose email'}
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />

              {forwardedHeader !== '' && (
                <View style={[styles.forwardedBlock, { borderTopColor: colors.border }]}>
                  <Text style={[styles.forwardedLabel, { color: colors.textTertiary }]}>---------- Forwarded message ----------</Text>
                  <Text style={[styles.forwardedMeta, { color: colors.textSecondary }]}>{forwardedHeader}</Text>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showSidebar} animationType="fade" transparent onRequestClose={() => setShowSidebar(false)}>
          <Pressable style={styles.sidebarOverlay} onPress={() => setShowSidebar(false)}>
            <View style={[styles.sidebarContent, { backgroundColor: colors.background }]}>
              <View style={styles.sidebarHeader}>
                <Text style={[styles.sidebarTitle, { color: colors.textPrimary }]}>NextQuark Mail</Text>
                <Pressable onPress={() => setShowSidebar(false)}>
                  <X size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={[styles.proxySection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.proxySectionTitle, { color: colors.textPrimary }]}>Your NextQuark Email ID</Text>
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

              <Text style={[styles.sidebarSectionLabel, { color: colors.textTertiary }]}>All inboxes</Text>
              {[
                { key: 'inbox' as const, label: 'Inbox', icon: Inbox, count: unreadCount },
                { key: 'starred' as const, label: 'Starred', icon: Star, count: 0 },
                { key: 'sent' as const, label: 'Sent', icon: Send, count: 0 },
                { key: 'archived' as const, label: 'Archived', icon: Archive, count: 0 },
              ].map((row) => {
                const isActive = sidebarView === row.key;
                return (
                  <Pressable
                    key={row.key}
                    style={[styles.sidebarItem, isActive && [styles.sidebarItemActive, !isDark && { backgroundColor: '#111111' }]]}
                    onPress={() => {
                      setSidebarView(row.key);
                      setShowSidebar(false);
                    }}
                  >
                    <row.icon
                      size={20}
                      color={isActive ? (isDark ? colors.accent : '#FFFFFF') : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.sidebarItemText,
                        { color: colors.textSecondary },
                        isActive && { color: isDark ? colors.textPrimary : '#FFFFFF' },
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
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* Inbox Settings Modal */}
        <Modal visible={showSettings} animationType="slide" transparent={false} onRequestClose={() => setShowSettings(false)}>
          <View style={[styles.settingsContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={[styles.settingsHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowSettings(false)} hitSlop={10}>
                <ArrowLeft size={22} color={colors.textPrimary} />
              </Pressable>
              <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>Inbox Settings</Text>
              <Pressable onPress={handleSaveSettings} disabled={settingsLoading}>
                {settingsLoading
                  ? <ActivityIndicator size="small" color={colors.textPrimary} />
                  : <Text style={[styles.settingsSaveBtn, { color: '#4F46E5' }]}>Save</Text>
                }
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {/* User info */}
              <View style={styles.settingsUserCard}>
                <View style={[styles.settingsUserAvatar, { backgroundColor: getAvatarColor(userName || '') }]}>
                  <Text style={styles.settingsUserInitials}>{getInitials(userName || '?')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsUserName, { color: colors.textPrimary }]}>{userName || 'User'}</Text>
                  <Text style={[styles.settingsUserEmail, { color: colors.textSecondary }]}>{authEmail}</Text>
                  <Text style={[styles.settingsProxyEmail, { color: colors.textTertiary }]}>{proxyEmail || '...'}</Text>
                </View>
              </View>

              {/* Email Forwarding */}
              <Text style={[styles.settingsSectionLabel, { color: colors.textTertiary }]}>EMAIL FORWARDING</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.settingsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingsRowTitle, { color: colors.textPrimary }]}>Forward all emails</Text>
                    <Text style={[styles.settingsRowDesc, { color: colors.textSecondary }]}>
                      {inboxSettings.forward_to_email
                        ? `Forwarding to ${inboxSettings.forward_to_email}`
                        : `Will forward to ${authEmail || 'your sign-up email'}`
                      }
                    </Text>
                  </View>
                  <Switch
                    value={!!inboxSettings.forward_to_email}
                    onValueChange={(val) => {
                      const target = authEmail || null;
                      if (val && !target) {
                        Alert.alert('No email found', 'Could not find your sign-up email. Please sign in again.');
                        return;
                      }
                      setInboxSettings((prev) => ({
                        ...prev,
                        forward_to_email: val ? target : null,
                      }));
                    }}
                    trackColor={{ false: colors.border, true: '#4F46E5' }}
                  />
                </View>
              </View>

              {/* Reply Behavior */}
              <Text style={[styles.settingsSectionLabel, { color: colors.textTertiary }]}>REPLY BEHAVIOR</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  style={[styles.settingsRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  onPress={() => setInboxSettings((prev) => ({ ...prev, reply_mode: 'in_app' }))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingsRowTitle, { color: colors.textPrimary }]}>Reply in app</Text>
                    <Text style={[styles.settingsRowDesc, { color: colors.textSecondary }]}>Compose replies directly in the inbox</Text>
                  </View>
                  {inboxSettings.reply_mode === 'in_app' && <Check size={20} color="#4F46E5" />}
                </Pressable>
                <Pressable
                  style={styles.settingsRow}
                  onPress={() => setInboxSettings((prev) => ({ ...prev, reply_mode: 'forward_to_email' }))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingsRowTitle, { color: colors.textPrimary }]}>Forward to email</Text>
                    <Text style={[styles.settingsRowDesc, { color: colors.textSecondary }]}>Opens your default email app to reply</Text>
                  </View>
                  {inboxSettings.reply_mode === 'forward_to_email' && <Check size={20} color="#4F46E5" />}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {detailModal}
      </View>
    </TabTransitionWrapper>
  );
}

export default MessagesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
  },
  searchPillIcon: { padding: 8 },
  searchPillInput: { flex: 1, fontSize: 16, padding: 0 },
  searchPillAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchPillAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderWidth: 1,
  },
  selectBarCount: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginLeft: 8,
    flex: 1,
  },
  selectBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectBarBtn: {
    padding: 10,
  },
  categoryTabsScroll: { flexGrow: 0, minHeight: 48 },
  categoryTabsContainer: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0,
  },
  categoryTabText: { fontSize: 13, fontWeight: '600' },

  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 10,
    marginVertical: 3,
  },
  logoAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emailContent: { flex: 1, marginLeft: 12, marginRight: 8 },
  emailTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emailSender: { fontSize: 14, flex: 1 },
  emailSenderUnread: { fontWeight: '700' as const },
  threadCountBadge: { fontSize: 11, fontWeight: '500' as const, marginLeft: 2, marginRight: 0 },
  emailTime: { fontSize: 11, marginLeft: 8 },
  emailSubject: { fontSize: 14, marginTop: 2 },
  emailSubjectUnread: { fontWeight: '700' as const },
  emailPreview: { fontSize: 13, marginTop: 2 },

  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
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
  swipeArchiveBtn: { backgroundColor: '#22C55E' },

  emptyContainer: { flexGrow: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
    paddingVertical: 40,
  },
  emptyIllustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245,158,11,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
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
  sidebarContent: { width: 280, paddingTop: 60, paddingHorizontal: 16 },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  sidebarTitle: { fontSize: 20, fontWeight: '800' as const },
  sidebarSectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 10,
    marginTop: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 28,
    paddingRight: 12,
    paddingVertical: 14,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 4,
    marginLeft: -16,
  },
  sidebarItemActive: { backgroundColor: '#111827' },
  sidebarItemText: { flex: 1, fontSize: 15, fontWeight: '600' as const },
  sidebarItemTextActive: {},
  sidebarBadge: { backgroundColor: '#4F46E5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sidebarBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#FFF' },

  proxySection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  proxySectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  proxyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proxyAddress: { flex: 1, fontSize: 14, fontFamily: 'monospace' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  copyBtnCopied: { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  copyBtnText: { fontSize: 12, fontWeight: '600' },
  proxyHint: { fontSize: 12, marginTop: 6 },

  composeFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    height: 56,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  composeFabInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  composeFabText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  composeFullScreen: { flex: 1 },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  composeBackBtn: {
    padding: 8,
  },
  composeHeaderIcon: {
    padding: 8,
  },
  composeSendBtn: {
    padding: 8,
    marginLeft: 4,
  },
  composeField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  composeLabel: { fontSize: 15, width: 56 },
  composeFromValue: { flex: 1, fontSize: 15 },
  composeInput: { flex: 1, fontSize: 15, padding: 0 },

  attachmentsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attachmentChip: {
    maxWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  attachmentChipText: { fontSize: 12, fontWeight: '600' as const, flex: 1 },
  attachmentThumbWrap: {
    position: 'relative' as const,
  },
  attachmentThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  attachmentRemoveBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  composeBodyInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    lineHeight: 24,
  },

  gmailDetailContainer: { flex: 1 },
  gmailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gmailBackBtn: { padding: 6 },
  gmailTopBarActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gmailTopBarIcon: { padding: 6 },
  gmailSubjectRow: { paddingTop: 16, paddingBottom: 12 },
  gmailSubject: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  gmailSenderAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gmailSenderInitials: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  gmailSenderInfo: { flex: 1 },
  gmailSenderNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gmailSenderName: { fontSize: 15, fontWeight: '700' as const, flex: 1 },
  gmailDate: { fontSize: 12, marginLeft: 4 },
  gmailToCompact: { fontSize: 13, marginTop: 1 },
  gmailExpandedHeader: { marginTop: 6 },
  gmailHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  gmailHeaderLabel: { fontSize: 12, width: 42 },
  gmailHeaderValue: { fontSize: 12, flex: 1 },
  gmailBodyWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  gmailBody: { fontSize: 15, lineHeight: 22, paddingBottom: 16 },
  gmailSenderRow: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 14, gap: 12 },
  threadMsgSeparator: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 16 },
  gmailBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gmailBottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 0,
    borderWidth: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  gmailBottomBtnText: { fontSize: 14, fontWeight: '600' as const },

  // Gmail-style inline reply
  inlineReplyCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inlineReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inlineReplyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  inlineReplyTo: { fontSize: 13, flex: 1 },
  inlineQuotedBlock: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },
  inlineQuotedMeta: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  inlineQuotedText: {
    fontSize: 13,
    lineHeight: 19,
  },
  inlineReplyInput: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 100,
    maxHeight: 200,
  },
  inlineReplySendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  inlineReplySendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  inlineReplySendBtnActive: {
    backgroundColor: '#4F46E5',
  },
  inlineReplySendText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },

  forwardedBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  forwardedLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  forwardedMeta: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Settings
  settingsContainer: { flex: 1 },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsTitle: { fontSize: 18, fontWeight: '700' as const },
  settingsSaveBtn: { fontSize: 15, fontWeight: '700' as const },
  settingsUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  settingsUserAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsUserInitials: { color: '#FFF', fontSize: 20, fontWeight: '700' as const },
  settingsUserName: { fontSize: 16, fontWeight: '700' as const },
  settingsUserEmail: { fontSize: 13, marginTop: 2 },
  settingsProxyEmail: { fontSize: 12, marginTop: 1, fontFamily: 'monospace' },
  settingsSectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  settingsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsRowTitle: { fontSize: 15, fontWeight: '600' as const },
  settingsRowDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
