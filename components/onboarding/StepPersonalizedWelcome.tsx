import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { Rocket, Search, Brain, Shield, Sparkles } from 'lucide-react-native';
import { StepProps } from '@/types/onboarding';

const EXPERIENCE_LABELS: Record<string, string> = {
  internship: 'Internship',
  entry_level: 'Entry Level',
  junior: 'Junior',
  mid: 'Mid Level',
  senior: 'Senior',
  expert: 'Expert & Leadership',
};

const GOAL_LABELS: Record<string, string> = {
  land_asap: 'Land that job ASAP',
  more_money: 'Earn what you deserve',
  dream_job: 'Find your dream role',
  career_growth: 'Accelerate your growth',
  remote_work: 'Go remote',
  work_life: 'Find balance',
  learn_skills: 'Level up your skills',
  switch_industry: 'Make the switch',
};

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600 + index * 700),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
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
  const headerSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const expLabel = EXPERIENCE_LABELS[data.experienceLevel] || 'your';
  const goalLabel = GOAL_LABELS[data.goal] || 'succeed';
  const rolesSample = data.desiredRoles.slice(0, 3).join(', ') || 'your target';

  const cards = [
    {
      icon: Rocket, color: '#3B82F6', num: '1',
      title: 'Apply More, Faster',
      desc: `Stop letting the application volume slow you down. Swipe Right to apply instantly to all your target ${rolesSample} roles. ${goalLabel}!`,
    },
    {
      icon: Search, color: '#10B981', num: '2',
      title: 'Find Meaningful Roles',
      desc: `We match your ${expLabel} skills with companies offering meaningful work. Let our AI surface the right fit immediately.`,
    },
    {
      icon: Brain, color: '#8B5CF6', num: '3',
      title: 'AI-Powered Matching',
      desc: `Our algorithm learns your preferences with every swipe. The more you use NextQuark, the better your matches get.`,
    },
    {
      icon: Shield, color: '#F59E0B', num: '4',
      title: 'Track Everything',
      desc: `Never lose track of an application again. We organize your pipeline so you can focus on preparing for interviews.`,
    },
    {
      icon: Sparkles, color: '#EC4899', num: '5',
      title: 'Stand Out from the Crowd',
      desc: `Your profile is optimized to catch recruiters' attention. We highlight what makes you unique for every application.`,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
          <View style={styles.titleRow}>
            <Text style={styles.welcomeEmoji}>⚡</Text>
            <Text style={styles.title}>Welcome to NextQuark!</Text>
          </View>
          <Text style={styles.subtitle}>Based on your profile, here's how we'll help you succeed:</Text>
        </Animated.View>

        {cards.map((card, idx) => (
          <AnimatedCard key={idx} index={idx}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.numBadge, { backgroundColor: `${card.color}20` }]}>
                  <Text style={[styles.numText, { color: card.color }]}>{card.num}</Text>
                </View>
                <card.icon size={20} color={card.color} />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
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
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, paddingBottom: 24 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  header: { paddingTop: 12, marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  welcomeEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', flex: 1 },
  subtitle: { fontSize: 15, color: '#9E9E9E', lineHeight: 22 },
  card: {
    backgroundColor: '#1E1E1E', borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  numBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { fontSize: 14, fontWeight: '800' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#9E9E9E', lineHeight: 21 },
  footer: { paddingTop: 8 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700', color: '#111111' },
});
