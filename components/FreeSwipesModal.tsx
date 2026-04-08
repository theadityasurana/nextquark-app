import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { X, Share2, Star } from '@/components/ProfileIcons';

const TESTIMONIALS = [
  { quote: 'Got 3 interview calls in my first week. The auto-apply is a game changer!', name: 'Priya S.', role: 'Software Engineer', rating: 5, avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { quote: 'Went from 0 callbacks to 5 interviews in 2 weeks. Incredibly accurate matching.', name: 'Rahul M.', role: 'Product Manager', rating: 5, avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { quote: 'Recruiters started reaching out directly after the profile boost!', name: 'Ananya K.', role: 'UX Designer', rating: 4, avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { quote: 'Applied to 150 jobs in one weekend. Would have taken a month manually.', name: 'Vikram T.', role: 'Data Scientist', rating: 5, avatar: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { quote: 'Premium paid for itself after my first offer letter. No regrets.', name: 'Arjun D.', role: 'Backend Developer', rating: 5, avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
  { quote: 'As a fresh grad, this gave me a huge edge. Placed within 3 weeks!', name: 'Divya L.', role: 'Junior Analyst', rating: 5, avatar: 'https://randomuser.me/api/portraits/women/17.jpg' },
];

const CARD_H = 110;
const CARD_GAP = 10;
const VISIBLE_CARDS = 2;

const STEPS = [
  { emoji: '📤', text: 'Share your code with a friend' },
  { emoji: '✍️', text: 'They sign up using your code' },
  { emoji: '🎉', text: 'You both get 5 free swipes' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: string;
  colors: any;
  referralStats: any;
  onShare: () => void;
  onCopy: () => void;
}

export default function FreeSwipesModal({ visible, onClose, theme, colors, referralStats, onShare, onCopy }: Props) {
  const bg = '#0F0F0F';
  const cardBg = '#1A1A1A';

  // Testimonial auto-scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    scrollY.setValue(0);
    const totalH = TESTIMONIALS.length * (CARD_H + CARD_GAP);
    const anim = Animated.loop(
      Animated.timing(scrollY, { toValue: -totalH, duration: TESTIMONIALS.length * 4000, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

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

            {/* Testimonial carousel */}
            <Text style={s.testimonialTitle}>Loved by thousands</Text>
            <View style={s.carouselWrap}>
              <LinearGradient colors={[bg, 'transparent']} style={s.fadeTop} pointerEvents="none" />
              <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
                  <View key={idx} style={[s.tCard, { backgroundColor: cardBg }]}>
                    <Text style={s.tQuote} numberOfLines={2}>"{t.quote}"</Text>
                    <View style={s.tFooter}>
                      <Image source={{ uri: t.avatar }} style={s.tAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.tName}>{t.name}</Text>
                        <Text style={s.tRole}>{t.role}</Text>
                      </View>
                      <View style={s.tStars}>
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} size={10} color="#FFD700" fill="#FFD700" />
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </Animated.View>
              <LinearGradient colors={['transparent', bg]} style={s.fadeBottom} pointerEvents="none" />
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
  testimonialTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  carouselWrap: { height: (CARD_H + CARD_GAP) * VISIBLE_CARDS, overflow: 'hidden', position: 'relative', marginBottom: 8 },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 24, zIndex: 2 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, zIndex: 2 },
  tCard: { borderRadius: 14, padding: 14, height: CARD_H, marginBottom: CARD_GAP, justifyContent: 'space-between' },
  tQuote: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', lineHeight: 20 },
  tFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  tName: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  tRole: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  tStars: { flexDirection: 'row', gap: 1 },
  // Sticky bar
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16 },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#000000' },
});
