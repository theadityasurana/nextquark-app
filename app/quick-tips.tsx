import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Lightbulb } from 'lucide-react-native';
import Colors from '@/constants/colors';

const tips = [
  {
    title: 'Crafting the Perfect Profile',
    body: 'Your profile is your first impression. Think of it as a living, breathing resume that recruiters see before anything else. A strong profile can be the difference between getting noticed and getting lost in the crowd. Make sure every section is complete, your photo is professional, and your headline clearly communicates your value proposition.',
    dark: true,
  },
  {
    title: '1. Write a Compelling Headline',
    body: 'Your headline is the first thing recruiters see. Instead of just listing your job title, highlight what makes you unique. For example, instead of "Software Engineer," try "Full-Stack Engineer | React & Node.js | Building Scalable Products." This immediately tells recruiters what you bring to the table and makes your profile searchable for specific skills. Keep it under 100 characters and focus on the skills most relevant to the roles you are targeting.',
    dark: false,
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=300&fit=crop',
  },
  {
    title: '2. Optimize Your Bio',
    body: 'Your bio should tell a story, not just list facts. Start with what you are passionate about, then mention your key achievements and what you are looking for. Use specific numbers whenever possible — "increased user engagement by 40%" is far more compelling than "improved user engagement." Keep it concise but impactful, ideally between 200-500 characters. Remember, recruiters scan profiles quickly, so front-load the most important information.',
    dark: true,
  },
  {
    title: '3. Showcase Your Top Skills',
    body: 'Select your five strongest skills as "Top Skills" on your profile. These should align with the roles you are targeting. Our AI matching algorithm gives extra weight to top skills, so choosing wisely can significantly improve your match scores. Review job descriptions for the roles you want and ensure your top skills mirror the most commonly requested ones. Update them regularly as you acquire new competencies or shift your career focus.',
    dark: false,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=300&fit=crop',
  },
  {
    title: 'Mastering the Swipe',
    body: 'The swipe mechanism is designed to help you quickly evaluate opportunities. But being strategic with your swipes yields much better results than swiping right on everything. Our algorithm learns from your preferences and adapts over time, surfacing increasingly relevant matches the more thoughtfully you engage with the platform.',
    dark: true,
  },
  {
    title: '4. Be Strategic with Your Swipes',
    body: 'Do not just swipe right on everything. Our algorithm learns from your preferences. If you consistently apply to roles that match your skills, the algorithm will surface better matches over time. Take a moment to read through the job details before swiping. Quality applications always beat quantity. Saving jobs (swipe up) is a great way to bookmark interesting opportunities for later review without committing to an application immediately.',
    dark: false,
  },
  {
    title: '5. Use Filters Effectively',
    body: 'Do not waste time scrolling through irrelevant jobs. Set your filters for location, salary range, job type, and work mode. This ensures you only see opportunities that genuinely interest you. Remember to adjust your filters periodically — the job market changes, and new opportunities arise in different locations and salary bands. Using role-based filters can also help you discover positions you might not have considered.',
    dark: true,
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=300&fit=crop',
  },
  {
    title: 'Interview Preparation',
    body: 'Getting an interview is a milestone worth celebrating — but the real work begins now. Preparation is what separates candidates who get offers from those who don\'t. Use our Practice for Interview feature to run through common questions and refine your responses before the big day.',
    dark: false,
  },
  {
    title: '6. Research the Company Thoroughly',
    body: 'Before any interview, spend at least 30 minutes researching the company. Read their about page, recent blog posts, and press releases. Understand their products, culture, and recent achievements. During the interview, reference specific things you learned — it shows genuine interest and preparation. Check their LinkedIn page for recent updates and employee insights. Understanding the company culture helps you tailor your responses and ask informed questions.',
    dark: true,
  },
  {
    title: '7. Prepare Your Story',
    body: 'Every interview is an opportunity to tell your professional story. Use the STAR method (Situation, Task, Action, Result) to structure your answers. Prepare 5-7 stories from your experience that demonstrate different skills — leadership, problem-solving, collaboration, handling failure, and technical expertise. Practice telling these stories out loud until they feel natural. Time yourself to ensure each response is between 2-3 minutes.',
    dark: false,
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=300&fit=crop',
  },
  {
    title: '8. Follow Up Professionally',
    body: 'After applying or interviewing, a thoughtful follow-up can set you apart. Send a brief thank-you message within 24 hours. Reference something specific from your conversation to make it personal. If you have not heard back after a week, a polite follow-up showing continued interest is appropriate. Use our messaging feature to maintain professional communication with recruiters.',
    dark: true,
  },
  {
    title: '9. Keep Your Profile Updated',
    body: 'An outdated profile is a missed opportunity. Update your experience, skills, and preferences regularly. When you complete a new project, earn a certification, or learn a new skill, add it immediately. Active profiles rank higher in recruiter searches and receive better AI-powered job matches. Set a reminder to review your profile at least once a month and make necessary updates.',
    dark: false,
  },
  {
    title: '10. Leverage Your Network',
    body: 'While our platform connects you with great opportunities, do not underestimate the power of networking. Share your profile with colleagues, attend industry events, and engage with professional communities. Many of the best opportunities come through referrals. When a company shows interest in your profile, research mutual connections who might provide insights or recommendations.',
    dark: true,
  },
];

export default function QuickTipsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Quick Tips</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Lightbulb size={32} color="#FF9800" />
          <Text style={styles.heroTitle}>Level Up Your Job Search</Text>
          <Text style={styles.heroSubtext}>Expert tips to help you stand out and land your dream role faster.</Text>
        </View>

        {tips.map((tip, idx) => (
          <View key={idx}>
            {tip.image && (
              <Image source={{ uri: tip.image }} style={styles.tipImage} />
            )}
            <View style={[styles.tipCard, tip.dark && styles.tipCardDark]}>
              <Text style={[styles.tipTitle, tip.dark && styles.tipTitleDark]}>{tip.title}</Text>
              <Text style={[styles.tipBody, tip.dark && styles.tipBodyDark]}>{tip.body}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF5FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  scrollContent: { paddingHorizontal: 16 },
  heroCard: { alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 20, padding: 24, marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800' as const, color: Colors.secondary, marginTop: 12, textAlign: 'center' },
  heroSubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  tipCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 12,
  },
  tipCardDark: {
    backgroundColor: '#111111',
  },
  tipTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary, marginBottom: 10 },
  tipTitleDark: { color: '#FFFFFF' },
  tipBody: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  tipBodyDark: { color: 'rgba(255,255,255,0.75)' },
  tipImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 12, backgroundColor: Colors.borderLight },
});
