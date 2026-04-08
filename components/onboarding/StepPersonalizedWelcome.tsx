import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { Rocket, Search, Sparkles } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { StepProps } from '@/types/onboarding';

const EXPERIENCE_LABELS: Record<string, string> = {
  internship: 'Internship', entry_level: 'Entry Level', junior: 'Junior',
  mid: 'Mid Level', senior: 'Senior', expert: 'Expert & Leadership',
};

const GOAL_LABELS: Record<string, string> = {
  land_asap: 'Land that job ASAP', more_money: 'Earn what you deserve',
  dream_job: 'Find your dream role', career_growth: 'Accelerate your growth',
  remote_work: 'Go remote', work_life: 'Find balance',
  learn_skills: 'Level up your skills', switch_industry: 'Make the switch',
};

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(400 + index * 150),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

export default function StepPersonalizedWelcome({ data, onNext }: StepProps) {
  const headerFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const expLabel = EXPERIENCE_LABELS[data.experienceLevel] || 'your';
  const goalLabel = GOAL_LABELS[data.goal] || 'succeed';
  const rolesSample = data.desiredRoles.slice(0, 3).join(', ') || 'your target';

  const cards = [
    { icon: Rocket, color: '#007AFF', title: 'Apply More, Faster', desc: `Swipe Right to apply instantly to ${rolesSample} roles. ${goalLabel}!` },
    { icon: Search, color: '#34C759', title: 'Find Meaningful Roles', desc: `We match your ${expLabel} skills with companies offering meaningful work.` },
    { icon: ({ size, color }: any) => <Ionicons name="bulb-outline" size={size} color={color} />, color: '#AF52DE', title: 'AI-Powered Matching', desc: 'Our algorithm learns your preferences with every swipe.' },
    { icon: Shield, color: '#FF9500', title: 'Track Everything', desc: 'Never lose track of an application. We organize your pipeline.' },
    { icon: Sparkles, color: '#FF2D55', title: 'Stand Out', desc: 'Your profile is optimized to catch recruiters\' attention.' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <Text style={styles.title}>Welcome to NextQuark!</Text>
          <Text style={styles.subtitle}>Here's how we'll help you succeed</Text>
        </Animated.View>

        {cards.map((card, idx) => (
          <AnimatedCard key={idx} index={idx}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: `${card.color}18` }]}>
                  <card.icon size={18} color={card.color} />
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
              </View>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </View>
          </AnimatedCard>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>Let's Go! 🚀</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 20, paddingBottom: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  header: { paddingTop: 24, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  cardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },
  footer: { paddingTop: 8 },
  nextButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
