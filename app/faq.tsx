import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';

const faqs = [
  { q: 'How does NextQuark work?', a: 'NextQuark uses a swipe-based interface combined with AI matching to connect you with relevant job opportunities. Swipe right to apply, left to pass, and up to save a job for later. Our algorithm learns your preferences over time to surface better matches.' },
  { q: 'Is NextQuark free to use?', a: 'Yes! The basic version is completely free with 40 applications per month. You can create a profile, swipe on jobs, apply, and message recruiters. We also offer Pro (100 apps/month) and Premium (500 apps/month) plans with additional features like AI auto-apply, priority visibility, and resume optimization.' },
  { q: 'How does swiping right on a job work?', a: 'Swiping right on a job instantly submits your application to that company. Your profile, resume, and cover letter are automatically sent to the recruiter. The job then moves to your Applications tab where you can track its status. Make sure your profile is complete before swiping right for the best results.' },
  { q: 'How do I save a job for later?', a: 'Swipe up on any job card to save it for later viewing. Saved jobs appear in your Saved Jobs section accessible from your Profile tab. You can review saved jobs anytime and apply when ready. Saved jobs do not count toward your monthly application limit.' },
  { q: 'How does AI resume parsing work?', a: 'During onboarding, upload your resume and our AI automatically extracts your work experience, education, skills, and contact information to pre-fill your profile. This saves you 10+ minutes of manual typing and ensures accuracy. Supported formats: PDF, DOC, DOCX (max 5MB).' },
  { q: 'What is the Friends section in Discover?', a: 'The Friends section on the Discover page shows profiles of other NextQuark users you can connect with. View their profile pictures, names, subscription tiers, and tap to see their full profile including companies they are interested in, their skills, and job preferences. Build your professional network!' },
  { q: 'What is the Leaderboard?', a: 'The Leaderboard shows top users ranked by total job applications (swipes). Access it from the Discover page to see who is most active in their job search. It displays user profiles with their swipe counts, subscription tiers (Free, Pro, Premium), and profile pictures. Tap any user to view their public profile.' },
  { q: 'What are Top Companies Hiring This Week?', a: 'The Top Companies section on the Discover page highlights companies with the most active job postings this week. See company logos, names, and open position counts. Tap any company to view their profile, all open roles, and company details. This helps you discover high-volume hirers.' },
  { q: 'How does Recently Posted work?', a: 'Recently Posted shows the newest job listings added to the platform, sorted by posting date. Find fresh opportunities before other candidates by checking this section regularly. Jobs posted within the last 24-48 hours appear here, giving you a competitive advantage in applying early.' },
  { q: 'What are Insights in the Discover page?', a: 'Insights provide personalized analytics about your job search activity including total applications, match rate, profile views, and trending skills in your field. Use these metrics to optimize your profile and application strategy. Premium users get advanced insights like best times to apply and industry trends.' },
  { q: 'How do Favorite Companies work?', a: 'Mark companies as favorites to follow their job postings and updates. Access your Favorite Companies list from your Profile. When a favorite company posts new jobs, you will receive priority notifications. Tap the heart icon on any company profile to add them to favorites.' },
  { q: 'How do I refer friends?', a: 'Go to Profile > Settings to find your unique referral code. Share this code with friends during their signup. When they create an account using your code, you both receive 5 bonus swipes instantly! You can also share your referral link via social media, email, or messaging apps. There is no limit to referrals.' },
  { q: 'How does the matching algorithm work?', a: 'Our AI analyzes your skills, experience, preferences, and behavior patterns to calculate a match score for each job. The algorithm considers factors like skill overlap, experience level, salary alignment, location preferences, and company culture fit.' },
  { q: 'Can I undo a swipe?', a: 'Currently, swipes cannot be undone on the free plan. Pro and Premium users have access to the undo feature. However, you can always find saved jobs in your Saved Jobs section and previously applied jobs in your Applications tab.' },
  { q: 'How do I improve my match score?', a: 'Complete your profile fully, add relevant skills, keep your experience updated, and upload a current resume. The more information you provide, the better our AI can match you with suitable opportunities. Selecting accurate top skills also significantly improves match quality.' },
  { q: 'What does it mean when a company shows interest?', a: 'When a company shows interest, it means a recruiter or hiring manager has reviewed your profile and believes you could be a great fit for their role. This appears in your Matches tab and often leads to direct conversations.' },
  { q: 'How do I message a recruiter?', a: 'You can message recruiters directly from the Matches tab when a company shows interest in you. Simply tap on the match card, view the job details, and use the Message button to start a conversation. All conversations appear in your Messages tab.' },
  { q: 'Can I apply to multiple jobs at the same time?', a: 'Absolutely! Free users get 40 applications per month, Pro users get 100, and Premium users get 500. We recommend being selective and applying to roles that genuinely interest you. Quality applications with tailored messages tend to get better responses.' },
  { q: 'How do I update my resume?', a: 'Go to your Profile tab, tap on Resume Management, and you can upload new resumes or change your active resume. You can store multiple resumes and select different ones for different applications. Supported formats include PDF, DOC, and DOCX.' },
  { q: 'What is profile verification?', a: 'Profile verification is a process that confirms the authenticity of your profile information. Verified profiles receive a badge that builds trust with employers and can lead to more interview invitations. Complete all profile sections to become eligible.' },
  { q: 'How do salary preferences work?', a: 'You can set your desired salary range and currency in your Profile under Salary Preferences. We support USD, INR, EUR, GBP, CAD, AUD, SGD, AED, JPY, and CHF. This information is kept private and only used by our algorithm to match you with jobs in your desired compensation range.' },
  { q: 'Can I change my location preferences?', a: 'Yes! You can update your location anytime from the Profile tab. You can also set work mode preferences (Remote, Onsite, Hybrid) and select preferred cities for job matching. These preferences help our AI show you the most relevant opportunities.' },
  { q: 'How do I prepare for interviews?', a: 'For applications with scheduled interviews, you will find a "Practice for Interview" button on the application details page. We also offer Quick Tips in your Profile section with comprehensive interview preparation advice.' },
  { q: 'What happens after I apply?', a: 'After swiping right (applying), the job moves to your Applications tab where you can track its status. Statuses include Applied, Under Review, Interview Scheduled, Offer, and Not Selected. You will receive push notifications for status updates.' },
  { q: 'How do push notifications work?', a: 'Enable push notifications to receive real-time alerts for new job matches, application status updates, recruiter messages, and interview invitations. You can customize notification preferences in Settings > Notification Settings.' },
  { q: 'How do I delete my account?', a: 'To delete your account, go to Profile > Settings > Help & Support > Report a Problem. Select "Account Deletion" and submit your request. We will process it within 48 hours and permanently remove all your data in compliance with GDPR and privacy regulations.' },
  { q: 'Is my data secure?', a: 'Yes, we take data security very seriously. All data is encrypted in transit and at rest using industry-standard protocols. We comply with GDPR, CCPA, and other privacy regulations. Your personal information is never sold to third parties. Profile pictures and resumes are stored securely in encrypted cloud storage.' },
  { q: 'How do filters work in the Discover section?', a: 'Filters allow you to narrow down jobs by location, salary range, job type, work mode, posting date, and role. You can select multiple options within each category. Filters persist until you reset them, ensuring a consistent browsing experience.' },
  { q: 'What is the Premium plan?', a: 'Premium offers 500 applications/month, AI auto-apply, top profile placement, resume optimization, salary negotiation insights, unlimited messages, priority support, exclusive job listings, video interview coaching, and a profile analytics dashboard. Annual plans save 25%.' },
  { q: 'Can I switch between currencies for salary?', a: 'Yes! You can change your preferred currency in both the Profile salary preferences and the Discover filter. We support USD, INR, EUR, GBP, CAD, AUD, SGD, AED, JPY, and CHF with appropriate salary ranges for each currency.' },
  { q: 'How do I report a fraudulent job listing?', a: 'If you encounter a suspicious or fraudulent job listing, please report it immediately through Help & Support > Report a Problem. Our trust and safety team reviews all reports within 24 hours and takes appropriate action to protect our community.' },
  { q: 'Can I use NextQuark on multiple devices?', a: 'Yes! Your NextQuark account syncs across all your devices in real-time. Simply sign in with the same credentials on any device to access your profile, applications, messages, and matches. All data is automatically synchronized via the cloud.' },
  { q: 'How often are new jobs posted?', a: 'New jobs are posted continuously throughout the day. We partner with thousands of companies worldwide, and our job feed is refreshed in real-time. Use the "Posted Within" filter in Discover to see the most recent listings.' },
  { q: 'What should I do if I get an offer?', a: 'Congratulations! When you receive an offer, it will appear in your Applications tab with the "Offer" status. You can continue the conversation with the recruiter through our messaging system. Premium users also get access to salary negotiation insights.' },
  { q: 'How do I add certifications to my profile?', a: 'Go to Profile, scroll to the Licenses & Certifications section, and tap the + button. You can add the certification name, issuing organization, credential URL, and related skills. Certifications boost your profile strength and improve match scores.' },
  { q: 'What are Top Skills?', a: 'Top Skills are the five skills you select as your strongest competencies. They appear prominently on your profile with a gold badge and carry extra weight in our matching algorithm. Choose skills that best represent your expertise and align with your target roles.' },
  { q: 'What payment methods are supported?', a: 'We support all major payment methods through Razorpay including credit/debit cards, UPI, net banking, and digital wallets. Payments are processed securely with bank-level encryption. You can pay in INR for Indian users or USD for international users.' },
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
          <Pressable
            key={idx}
            style={[styles.faqCard, expandedIdx === idx && styles.faqCardExpanded]}
            onPress={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              {expandedIdx === idx ? (
                <Ionicons name="chevron-up" size={20} color={Colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={Colors.textTertiary} />
              )}
            </View>
            {expandedIdx === idx && (
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            )}
          </Pressable>
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
});
