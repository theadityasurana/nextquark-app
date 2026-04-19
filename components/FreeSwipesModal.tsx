import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Animated, Platform, Linking, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Share2 } from '@/components/ProfileIcons';
import { SocialPlatform, SOCIAL_URLS, getSocialFollowStatus, claimSocialFollow } from '@/lib/referral';
import { InstagramIcon, TwitterIcon, LinkedInIcon } from '@/components/SocialIcons';

const SOCIAL_ICON_MAP: Record<SocialPlatform, React.ReactNode> = {
  instagram: <InstagramIcon size={28} />,
  twitter: <TwitterIcon size={28} />,
  linkedin: <LinkedInIcon size={28} />,
};


const STEPS = [
  { emoji: '📤', text: 'Share your code with a friend' },
  { emoji: '✍️', text: 'They sign up using your code' },
  { emoji: '🎉', text: 'You both get 5 free swipes' },
];

const SOCIAL_ITEMS: { platform: SocialPlatform; label: string }[] = [
  { platform: 'instagram', label: 'Follow us on Instagram' },
  { platform: 'twitter', label: 'Follow us on Twitter' },
  { platform: 'linkedin', label: 'Follow us on LinkedIn' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: string;
  colors: any;
  referralStats: any;
  onShare: () => void;
  onCopy: () => void;
  userId?: string | null;
  onSwipesUpdated?: () => void;
}

export default function FreeSwipesModal({ visible, onClose, theme, colors, referralStats, onShare, onCopy, userId, onSwipesUpdated }: Props) {
  const bg = '#0F0F0F';
  const cardBg = '#1A1A1A';

  // Social follow state
  const [followStatus, setFollowStatus] = useState<Record<SocialPlatform, boolean>>({ instagram: false, twitter: false, linkedin: false });
  const [claimingPlatform, setClaimingPlatform] = useState<SocialPlatform | null>(null);

  // Fetch social follow status when modal opens
  useEffect(() => {
    if (visible && userId) {
      getSocialFollowStatus(userId).then(setFollowStatus);
    }
  }, [visible, userId]);

  const handleSocialFollow = useCallback(async (platform: SocialPlatform) => {
    if (!userId || followStatus[platform] || claimingPlatform) return;

    setClaimingPlatform(platform);
    // Open the social URL
    try {
      await Linking.openURL(SOCIAL_URLS[platform]);
    } catch {}

    // Claim the swipes in Supabase
    const result = await claimSocialFollow(userId, platform);
    if (result.success) {
      setFollowStatus(prev => ({ ...prev, [platform]: true }));
      onSwipesUpdated?.();
    }
    setClaimingPlatform(null);
  }, [userId, followStatus, claimingPlatform, onSwipesUpdated]);


  // Step fade-in animations
  const stepAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!visible) { stepAnims.forEach(a => a.setValue(0)); return; }
    stepAnims.forEach(a => a.setValue(0));
    Animated.stagger(250, stepAnims.map((anim, i) =>
      Animated.timing(anim, { toValue: 1, duration: 500, delay: 300 + i * 250, useNativeDriver: true })
    )).start();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        <View style={[s.sheet, { backgroundColor: bg }]}>
          <View style={s.handle} />

          {/* ── FIXED TOP SECTION ── */}
          <View style={s.fixedTop}>
            <View style={s.header}>
              <Text style={s.title}>Free Swipes</Text>
              <Pressable onPress={onClose} style={s.closeBtn}>
                <X size={16} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
            <Text style={s.subtitle}>Invite a friend — you both get 5 free swipes</Text>

            {/* Code card */}
            <View style={[s.codeCard, { backgroundColor: cardBg }]}>
              <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
              <Text style={s.code}>{referralStats?.referralCode || '—'}</Text>
              <Pressable style={s.copyBtn} onPress={onCopy}>
                <Text style={s.copyText}>Copy Code</Text>
              </Pressable>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { backgroundColor: cardBg }]}>
                <Text style={s.statNum}>{referralStats?.totalReferrals || 0}</Text>
                <Text style={s.statLabel}>Friends Joined</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: cardBg }]}>
                <Text style={s.statNum}>{referralStats?.totalSwipesEarned || 0}</Text>
                <Text style={s.statLabel}>Swipes Earned</Text>
              </View>
            </View>
          </View>

          {/* ── SCROLLABLE BOTTOM SECTION ── */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {/* Animated steps */}
            <View style={s.stepsSection}>
              <Text style={s.stepsTitle}>How it works</Text>
              {STEPS.map((step, i) => (
                <Animated.View
                  key={i}
                  style={[s.stepRow, {
                    opacity: stepAnims[i],
                    transform: [{ translateY: stepAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                  }]}
                >
                  <View style={s.stepEmoji}>
                    <Text style={{ fontSize: 20 }}>{step.emoji}</Text>
                  </View>
                  <Text style={s.stepText}>{step.text}</Text>
                </Animated.View>
              ))}
            </View>

            {/* ── SOCIAL FOLLOW FOR FREE SWIPES ── */}
            <View style={s.socialSection}>
              <Text style={s.stepsTitle}>Follow us for free swipes</Text>
              <Text style={s.socialSubtitle}>Get 2 free swipes for each follow!</Text>
              {SOCIAL_ITEMS.map(({ platform, label }) => {
                const claimed = followStatus[platform];
                const isClaiming = claimingPlatform === platform;
                return (
                  <Pressable
                    key={platform}
                    style={[s.socialBtn, { backgroundColor: cardBg }, claimed && s.socialBtnDisabled]}
                    onPress={() => handleSocialFollow(platform)}
                    disabled={claimed || !!claimingPlatform}
                  >
                    <View style={claimed ? { opacity: 0.4 } : undefined}>{SOCIAL_ICON_MAP[platform]}</View>
                    <Text style={[s.socialBtnText, claimed && s.socialBtnTextDisabled]}>
                      {claimed ? `${label} ✓` : label}
                    </Text>
                    {isClaiming ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={[s.socialBadge, claimed && s.socialBadgeClaimed]}>
                        <Text style={[s.socialBadgeText, claimed && s.socialBadgeTextClaimed]}>
                          {claimed ? 'Claimed' : '+2 swipes'}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>

          {/* ── STICKY SHARE BUTTON ── */}
          <View style={[s.stickyBar, { backgroundColor: bg }]}>
            <Pressable style={s.shareBtn} onPress={onShare}>
              <Share2 size={17} color="#000000" />
              <Text style={s.shareBtnText}>Share with Friends</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', flex: 1 },
  handle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  // Fixed top
  fixedTop: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 16 },
  codeCard: { borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 12 },
  codeLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 8 },
  code: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: 8, marginBottom: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 9 },
  copyText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  // Scrollable
  scrollContent: { paddingHorizontal: 20, paddingTop: 14 },
  stepsSection: { marginBottom: 24 },
  stepsTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  stepEmoji: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  stepText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  // Social follow section
  socialSection: { marginBottom: 24 },
  socialSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 12, marginTop: -8 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  socialBtnDisabled: { opacity: 0.5 },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  socialBtnTextDisabled: { color: 'rgba(255,255,255,0.4)' },
  socialBadge: { backgroundColor: 'rgba(76,175,80,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  socialBadgeClaimed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  socialBadgeText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
  socialBadgeTextClaimed: { color: 'rgba(255,255,255,0.3)' },

  // Sticky bar
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16 },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#000000' },
});
