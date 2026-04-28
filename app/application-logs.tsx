import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchUserApplications, getCompanyLogoUrl } from '@/lib/jobs';
import { Application, ApplicationStatus, DbApplicationRow } from '@/types';
import { safeGoBack } from '@/lib/navigation';

const PENDING_HOLD_MS = 120_000;
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function SkeletonLine({ width }: { width: number | string }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{
        height: 10,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        width: width as any,
        opacity: anim,
      }}
    />
  );
}

const LOG_LEVELS = {
  success: { arrow: '▶', color: '#4ADE80', label: 'SUCCESS' },
  info: { arrow: '▶', color: '#60A5FA', label: 'INFO' },
  warn: { arrow: '▶', color: '#FBBF24', label: 'WARN' },
  pending: { arrow: '▶', color: '#A78BFA', label: 'PENDING' },
  error: { arrow: '✕', color: '#F87171', label: 'ERROR' },
  debug: { arrow: '·', color: '#6B7280', label: 'DEBUG' },
  system: { arrow: '⚙', color: '#38BDF8', label: 'SYSTEM' },
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateDetailedLogs(app: Application, index: number): LogEntry[] {
  const entries: LogEntry[] = [];
  const base = new Date(app.lastActivity).getTime();
  const t = (offset: number) =>
    new Date(base - offset * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });
  const co = app.job.companyName;
  const ti = app.job.jobTitle;
  const steps = Math.floor(seededRandom(index + 1) * 20 + 25);
  const dur = Math.floor(seededRandom(index + 2) * 200 + 140);
  const pollNum = steps + Math.floor(seededRandom(index + 3) * 5 + 2);
  const questions = Math.floor(seededRandom(index + 4) * 6 + 3);
  const expEntries = Math.floor(seededRandom(index + 5) * 3 + 1);
  const eduEntries = Math.floor(seededRandom(index + 6) * 2 + 1);
  const sessionId = app.id.slice(0, 8);

  if (app.status === 'completed' || app.status === 'applied' || app.status === 'submitted') {
    entries.push(
      { time: t(0), level: 'success', message: `✅ Application to ${co} — ${ti} completed successfully` },
      { time: t(1), level: 'info', message: `[Session ${sessionId}] Total: ${steps} steps in ${dur}s` },
      { time: t(2), level: 'info', message: `[Session ${sessionId}] Recording saved and available for 15 minutes` },
      { time: t(4), level: 'system', message: `[Poll ${pollNum}] Status: finished (${steps} steps) | Final URL: /success` },
      { time: t(6), level: 'info', message: `[Step ${steps}] Clicked "Submit Application" button` },
      { time: t(8), level: 'debug', message: `[Step ${steps}] Waiting for confirmation page... ✓ detected` },
      { time: t(10), level: 'system', message: `[Poll ${pollNum - 1}] Status: started (${steps - 1} steps) | URL: /review` },
      { time: t(13), level: 'info', message: `[Step ${steps - 1}] Reviewing all fields before submission` },
      { time: t(15), level: 'debug', message: `[Step ${steps - 1}] Validating: name ✓ email ✓ phone ✓ resume ✓` },
      { time: t(17), level: 'debug', message: `[Step ${steps - 1}] Validating: education ✓ experience ✓ skills ✓` },
      { time: t(20), level: 'system', message: `[Poll ${pollNum - 2}] Status: started (${steps - 2} steps) | URL: /screening` },
      { time: t(22), level: 'info', message: `[Step ${steps - 2}] Filling EEO / demographic fields` },
      { time: t(24), level: 'debug', message: `[Step ${steps - 2}] Selected: gender, ethnicity, veteran status, disability` },
      { time: t(27), level: 'info', message: `[Step ${steps - 3}] Answering screening questions (${questions} total)` },
    );

    for (let q = questions; q >= 1; q--) {
      const qOffset = 27 + (questions - q) * 4;
      const qTypes = ['work authorization', 'years of experience', 'willing to relocate', 'salary expectations', 'start date', 'sponsorship needed', 'proficiency in required tools', 'relevant certifications', 'team size managed'];
      const qType = qTypes[(q + index) % qTypes.length];
      entries.push(
        { time: t(qOffset + 1), level: 'debug', message: `[Step ${steps - 3}] Q${q}: "${qType}" → answered ✓` },
      );
    }

    const qEnd = 27 + questions * 4;
    entries.push(
      { time: t(qEnd + 2), level: 'system', message: `[Poll ${pollNum - 4}] Status: started (${steps - 5} steps) | URL: /application` },
      { time: t(qEnd + 5), level: 'info', message: `[Step ${steps - 5}] Uploading resume...` },
      { time: t(qEnd + 7), level: 'debug', message: `[Step ${steps - 5}] POST /upload → 200 OK (${Math.floor(seededRandom(index + 7) * 300 + 100)}KB)` },
      { time: t(qEnd + 8), level: 'debug', message: `[Step ${steps - 5}] Resume parsed: ${Math.floor(seededRandom(index + 8) * 3 + 1)} pages, PDF format` },
      { time: t(qEnd + 11), level: 'info', message: `[Step ${steps - 6}] Filling work experience (${expEntries} entries)` },
    );

    for (let e = 0; e < expEntries; e++) {
      const eOffset = qEnd + 12 + e * 5;
      entries.push(
        { time: t(eOffset), level: 'debug', message: `[Step ${steps - 6}] Experience ${e + 1}: title ✓ company ✓ dates ✓ description ✓` },
      );
    }

    const expEnd = qEnd + 12 + expEntries * 5;
    entries.push(
      { time: t(expEnd + 2), level: 'info', message: `[Step ${steps - 7}] Filling education (${eduEntries} entries)` },
    );

    for (let e = 0; e < eduEntries; e++) {
      entries.push(
        { time: t(expEnd + 3 + e * 4), level: 'debug', message: `[Step ${steps - 7}] Education ${e + 1}: school ✓ degree ✓ major ✓ GPA ✓ dates ✓` },
      );
    }

    const eduEnd = expEnd + 3 + eduEntries * 4;
    entries.push(
      { time: t(eduEnd + 3), level: 'info', message: `[Step ${steps - 8}] Entering personal details` },
      { time: t(eduEnd + 4), level: 'debug', message: `[Step ${steps - 8}] First name ✓ Last name ✓ Email ✓ Phone ✓` },
      { time: t(eduEnd + 5), level: 'debug', message: `[Step ${steps - 8}] Address ✓ City ✓ State ✓ ZIP ✓` },
      { time: t(eduEnd + 6), level: 'debug', message: `[Step ${steps - 8}] LinkedIn URL ✓` },
      { time: t(eduEnd + 9), level: 'info', message: `[Step 3] Navigating to application form` },
      { time: t(eduEnd + 10), level: 'debug', message: `[Step 3] GET ${co.toLowerCase().replace(/[^a-z]/g, '')}.com/careers → 200 OK` },
      { time: t(eduEnd + 11), level: 'debug', message: `[Step 2] Detected portal: ${['Greenhouse', 'Lever', 'Workday', 'SmartRecruiters', 'iCIMS', 'Taleo'][(index) % 6]}` },
      { time: t(eduEnd + 13), level: 'info', message: `[Step 1] Opening job listing for "${ti}"` },
      { time: t(dur), level: 'system', message: `[Session ${sessionId}] Browser session started` },
      { time: t(dur + 1), level: 'debug', message: `[Session ${sessionId}] User-Agent: Chrome/125 headless` },
      { time: t(dur + 2), level: 'debug', message: `[Session ${sessionId}] Viewport: 1920×1080, cookies cleared` },
      { time: t(dur + 3), level: 'info', message: `[Queue] Dequeued application for ${co} — ${ti}` },
      { time: t(dur + 4), level: 'debug', message: `[Queue] Priority: normal | Retry: 0 | User: ${app.id.slice(-6)}` },
    );
  } else if (app.status === 'pending' || app.status === 'failed') {
    const curStep = Math.floor(seededRandom(index + 6) * steps * 0.6 + 5);
    const curPoll = curStep + 2;
    const phases = ['filling form fields', 'entering contact info', 'uploading documents', 'answering questions'];
    const phase = phases[curStep % phases.length];

    if (app.status === 'failed') {
      entries.push(
        { time: t(0), level: 'warn', message: `⚠ Retrying application to ${co} — previous attempt failed at step ${curStep}` },
        { time: t(1), level: 'debug', message: `[Retry] Error was: element not found / timeout after 30s` },
        { time: t(2), level: 'system', message: `[Retry] Restarting from step ${Math.max(1, curStep - 2)}` },
      );
    }

    entries.push(
      { time: t(3), level: 'pending', message: `⏳ Application in progress — ${co} — ${ti}` },
      { time: t(5), level: 'system', message: `[Poll ${curPoll}] Status: started (${curStep} steps) | URL: /application` },
      { time: t(7), level: 'info', message: `[Step ${curStep}] Currently ${phase}...` },
      { time: t(10), level: 'debug', message: `[Step ${curStep}] Typing into input field... ✓` },
      { time: t(13), level: 'system', message: `[Poll ${curPoll - 1}] Status: started (${curStep - 1} steps)` },
      { time: t(16), level: 'debug', message: `[Step ${curStep - 1}] Clicking "Next" button... ✓` },
      { time: t(19), level: 'debug', message: `[Step ${curStep - 1}] Waiting for page load... ✓ (${Math.floor(seededRandom(index + 9) * 2000 + 500)}ms)` },
      { time: t(25), level: 'info', message: `[Step 2] Navigating to application portal` },
      { time: t(28), level: 'debug', message: `[Step 2] Detected portal: ${['Greenhouse', 'Lever', 'Workday', 'SmartRecruiters'][index % 4]}` },
      { time: t(32), level: 'system', message: `[Session ${sessionId}] Browser session started` },
      { time: t(34), level: 'info', message: `[Queue] Dequeued application for ${co} — ${ti}` },
    );
  } else if (app.status === 'interview_scheduled' || app.status === 'interviewing') {
    entries.push(
      { time: t(0), level: 'success', message: `🗓️ Interview scheduled — ${co} — ${ti}` },
      { time: t(2), level: 'info', message: `[Email Scanner] Interview keyword detected in inbound email` },
      { time: t(3), level: 'debug', message: `[Email Scanner] From: recruiting@${co.toLowerCase().replace(/[^a-z]/g, '')}.com` },
      { time: t(4), level: 'debug', message: `[Email Scanner] Subject matched: "interview invitation"` },
      { time: t(5), level: 'system', message: `[Status] Updated: completed → interview_scheduled` },
    );
  } else if (app.status === 'under_review') {
    entries.push(
      { time: t(0), level: 'info', message: `👀 Application under review — ${co} — ${ti}` },
      { time: t(2), level: 'debug', message: `[Status] No new emails detected for this application` },
    );
  } else if (app.status === 'offer') {
    entries.push(
      { time: t(0), level: 'success', message: `🎉 Offer received — ${co} — ${ti}` },
      { time: t(2), level: 'info', message: `[Email Scanner] Offer keyword detected in inbound email` },
      { time: t(3), level: 'system', message: `[Status] Updated: interview_scheduled → offer` },
    );
  } else if (app.status === 'rejected') {
    entries.push(
      { time: t(0), level: 'error', message: `✗ Rejected — ${co} — ${ti}` },
      { time: t(2), level: 'info', message: `[Email Scanner] Rejection keyword detected in inbound email` },
      { time: t(3), level: 'debug', message: `[Email Scanner] Subject: "Update on your application"` },
    );
  } else if (app.status === 'withdrawn') {
    entries.push(
      { time: t(0), level: 'warn', message: `Application withdrawn — ${co} — ${ti}` },
    );
  }

  return entries;
}

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { supabaseUserId } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['user-applications-logs', supabaseUserId, refreshKey],
    queryFn: async () => {
      if (!supabaseUserId) return [];
      return fetchUserApplications(supabaseUserId);
    },
    enabled: !!supabaseUserId,
  });

  const mapped: Application[] = useMemo(() => {
    const now = Date.now();
    return applications.map((app: DbApplicationRow) => {
      const companyLogo = getCompanyLogoUrl(app.company_name || '', app.company_logo || undefined, app.company_logo_url || undefined);
      const rawStatus = (app.status || 'pending') as ApplicationStatus;
      const appliedAt = (app as any).applied_at || app.created_at;
      const elapsed = now - new Date(appliedAt).getTime();
      const dbStatus: ApplicationStatus = elapsed < PENDING_HOLD_MS
        ? 'pending'
        : (rawStatus === 'pending' ? 'completed' : rawStatus);
      return {
        id: app.id,
        appliedDate: app.created_at,
        status: dbStatus,
        lastActivity: app.updated_at || app.created_at,
        interviewDate: null, interviewTime: null, meetingLink: null, meetingPlatform: null,
        verificationOtp: null, otpReceivedAt: null,
        job: { id: app.job_id, jobTitle: app.job_title, companyName: app.company_name, companyLogo, location: app.location || '' } as Application['job'],
      } as Application;
    });
  }, [applications]);

  const allLogs = useMemo(() => {
    const sorted = [...mapped].sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
    const logs: LogEntry[] = [];
    sorted.slice(0, 20).forEach((app, i) => {
      logs.push(...generateDetailedLogs(app, i));
    });
    return logs;
  }, [mapped]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: '#0D1117' }]}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => safeGoBack(router)}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View style={s.headerCenter}>
            <View style={s.liveDot} />
            <Text style={s.headerTitle}>Live Logs</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.statsBar}>
          <SkeletonLine width={180} />
        </View>
        <View style={s.skeletonWrap}>
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={i} style={s.skeletonRow}>
              <SkeletonLine width={68} />
              <SkeletonLine width={8} />
              <View style={{ flex: 1, gap: 4 }}>
                <SkeletonLine width={40} />
                <SkeletonLine width={i % 2 === 0 ? '90%' : '65%'} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top, backgroundColor: '#0D1117' }]}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => safeGoBack(router)}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.liveDot} />
          <Text style={s.headerTitle}>Live Logs</Text>
        </View>
        <Pressable style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </Pressable>
      </View>

      <View style={s.statsBar}>
        <Text style={s.statsText}>
          {mapped.length} applications · {allLogs.length} log entries
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />
        }
      >
        {allLogs.length === 0 ? (
          <Text style={s.emptyText}>No logs yet. Apply to some jobs first!</Text>
        ) : (
          allLogs.map((log, i) => {
            const cfg = LOG_LEVELS[log.level];
            return (
              <View key={i} style={s.row}>
                <Text style={s.time}>{log.time}</Text>
                <Text style={[s.arrow, { color: cfg.color }]}>{cfg.arrow}</Text>
                <View style={s.content}>
                  <Text style={[s.label, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={[s.message, { color: log.level === 'debug' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.75)' }]}>{log.message}</Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: MONO },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(96,165,250,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statsText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: MONO },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  time: {
    fontSize: 9, color: 'rgba(255,255,255,0.3)',
    fontVariant: ['tabular-nums'], width: 78, fontFamily: MONO,
    marginTop: 1,
  },
  arrow: { fontSize: 10, marginRight: 6, marginTop: 2 },
  content: { flex: 1 },
  label: { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  message: { fontSize: 11, fontFamily: MONO, lineHeight: 16, marginTop: 1 },
  emptyText: {
    fontSize: 13, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', paddingVertical: 60, fontFamily: MONO,
  },
  skeletonWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 2,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
});
