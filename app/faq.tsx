import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';

const FAQ_IMAGES: Record<number, string> = {
  0: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=300&fit=crop',
  4: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=300&fit=crop',
  8: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=300&fit=crop',
  12: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=300&fit=crop',
  17: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop',
  21: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=300&fit=crop',
};

const faqs = [
  { q: 'How does NextQuark work?', a: 'NextQuark uses a swipe-based interface combined with AI matching to connect you with relevant job opportunities. Swipe right to apply, left to pass, and up to save a job for later. Our algorithm learns your preferences over time to surface better matches.' },
  { q: 'Is NextQuark free to use?', a: 'Yes! The basic version of NextQuark is completely free. You can create a profile, swipe on jobs, apply, and message recruiters. We also offer Pro and Premium plans with additional features like unlimited swipes, priority visibility, and AI resume optimization.' },
  { q: 'How does the matching algorithm work?', a: 'Our AI analyzes your skills, experience, preferences, and behavior patterns to calculate a match score for each job. The algorithm considers factors like skill overlap, experience level, salary alignment, location preferences, and company culture fit.' },
  { q: 'Can I undo a swipe?', a: 'Currently, swipes cannot be undone on the free plan. Pro and Premium users have access to the undo feature. However, you can always find saved jobs in your Saved Jobs section and previously applied jobs in your Applications tab.' },
  { q: 'How do I improve my match score?', a: 'Complete your profile fully, add relevant skills, keep your experience updated, and upload a current resume. The more information you provide, the better our AI can match you with suitable opportunities. Selecting accurate top skills also significantly improves match quality.' },
  { q: 'What does it mean when a company shows interest?', a: 'When a company shows interest, it means a recruiter or hiring manager has reviewed your profile and believes you could be a great fit for their role. This appears in your Matches tab and often leads to direct conversations.' },
  { q: 'How do I message a recruiter?', a: 'You can message recruiters directly from the Matches tab when a company shows interest in you. Simply tap on the match card, view the job details, and use the Message button to start a conversation. All conversations appear in your Inbox.' },
  { q: 'Can I apply to multiple jobs at the same time?', a: 'Absolutely! There is no limit to the number of jobs you can apply to. However, we recommend being selective and applying to roles that genuinely interest you. Quality applications with tailored messages tend to get better responses.' },
  { q: 'How do I update my resume?', a: 'Go to your Profile tab, tap on Resume, and you can upload new resumes or change your active resume. You can store multiple resumes and select different ones for different applications. Supported formats include PDF, DOC, and DOCX.' },
  { q: 'What is profile verification?', a: 'Profile verification is a process that confirms the authenticity of your profile information. Verified profiles receive a badge that builds trust with employers and can lead to more interview invitations. Complete all profile sections to become eligible.' },
  { q: 'How do salary preferences work?', a: 'You can set your desired salary range and currency in your Profile under Salary Preferences. This information is kept private and is only used by our algorithm to match you with jobs in your desired compensation range. It is never shared directly with employers.' },
  { q: 'Can I change my location preferences?', a: 'Yes! You can update your location anytime from the Profile tab. You can also set work mode preferences (Remote, Onsite, Hybrid) and select preferred cities for job matching.' },
  { q: 'How do I prepare for interviews?', a: 'For applications with scheduled interviews, you will find a "Practice for Interview" button on the application details page. We also offer Quick Tips in your Profile section with comprehensive interview preparation advice.' },
  { q: 'What happens after I apply?', a: 'After swiping right (applying), the job moves to your Applications tab where you can track its status. Statuses include Applied, Under Review, Interview Scheduled, Offer, and Not Selected. You will receive notifications for status updates.' },
  { q: 'How do I delete my account?', a: 'To delete your account, go to Profile > Help & Support > Contact Us. Send an email requesting account deletion. We will process your request within 48 hours and permanently remove all your data in compliance with privacy regulations.' },
  { q: 'Is my data secure?', a: 'Yes, we take data security very seriously. All data is encrypted in transit and at rest. We follow industry-standard security practices and comply with GDPR, CCPA, and other privacy regulations. Your personal information is never sold to third parties.' },
  { q: 'How do filters work in the Discover section?', a: 'Filters allow you to narrow down jobs by location, salary range, job type, work mode, posting date, and role. You can select multiple options within each category. Filters persist until you reset them, ensuring a consistent browsing experience.' },
  { q: 'What is the Premium plan?', a: 'Premium is our top-tier plan offering unlimited swipes, top profile placement, AI resume optimization, salary negotiation insights, unlimited messages, priority support, exclusive job listings, video interview coaching, and a profile analytics dashboard.' },
  { q: 'Can I switch between currencies for salary?', a: 'Yes! You can change your preferred currency in both the Profile salary preferences and the Discover filter. We support USD, INR, EUR, GBP, CAD, AUD, SGD, AED, JPY, and CHF with appropriate salary ranges for each currency.' },
  { q: 'How do I report a fraudulent job listing?', a: 'If you encounter a suspicious or fraudulent job listing, please report it immediately through Help & Support > Report a Problem. Our trust and safety team reviews all reports within 24 hours and takes appropriate action to protect our community.' },
  { q: 'Can I use NextQuark on multiple devices?', a: 'Yes! Your NextQuark account syncs across all your devices. Simply sign in with the same credentials on any device to access your profile, applications, messages, and matches.' },
  { q: 'How often are new jobs posted?', a: 'New jobs are posted continuously throughout the day. We partner with thousands of companies worldwide, and our job feed is refreshed in real-time. Use the "Posted Within" filter to see the most recent listings.' },
  { q: 'What should I do if I get an offer?', a: 'Congratulations! When you receive an offer, it will appear in your Applications tab with the "Offer" status. You can continue the conversation with the recruiter through our messaging system. Premium users also get access to salary negotiation insights.' },
  { q: 'How do I add certifications to my profile?', a: 'Go to Profile, scroll to the Licenses & Certifications section, and tap the + button. You can add the certification name, issuing organization, credential URL, and related skills.' },
  { q: 'What are Top Skills?', a: 'Top Skills are the five skills you select as your strongest competencies. They appear prominently on your profile with a gold badge and carry extra weight in our matching algorithm. Choose skills that best represent your expertise and align with your target roles.' },
];

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>FAQs</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
        <Text style={styles.heroSubtext}>Find answers to common questions about using NextQuark.</Text>

        {faqs.map((faq, idx) => (
          <View key={idx}>
            {FAQ_IMAGES[idx] && (
              <Image source={{ uri: FAQ_IMAGES[idx] }} style={styles.faqImage} contentFit="cover" />
            )}
            <Pressable
              style={[styles.faqCard, expandedIdx === idx && styles.faqCardExpanded]}
              onPress={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                {expandedIdx === idx ? (
                  <ChevronUp size={20} color={Colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={Colors.textTertiary} />
                )}
              </View>
              {expandedIdx === idx && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}
            </Pressable>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  scrollContent: { paddingHorizontal: 16 },
  heroTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.secondary, marginTop: 12 },
  heroSubtext: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, marginBottom: 20 },
  faqCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 8 },
  faqCardExpanded: { borderWidth: 1, borderColor: Colors.accent },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary, flex: 1, marginRight: 12 },
  faqAnswer: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  faqImage: { width: '100%', height: 160, borderRadius: 14, marginBottom: 8 },
});
