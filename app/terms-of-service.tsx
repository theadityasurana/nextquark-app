import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <FileText size={28} color={Colors.accent} />
          </View>
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
        </View>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By accessing or using our mobile application and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.{"\n\n"}
          These terms constitute a legally binding agreement between you and our company.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.body}>
          Our platform provides an AI-powered job application automation service that helps users discover job opportunities, manage applications, and streamline the job search process.{"\n\n"}
          Services include:{"\n"}
          • Job discovery and recommendations{"\n"}
          • Automated job application submissions{"\n"}
          • Resume management and optimization{"\n"}
          • Application tracking and status updates{"\n"}
          • Email integration for application monitoring{"\n"}
          • AI-assisted application form filling
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.subheading}>Account Creation</Text>
        <Text style={styles.body}>
          You must create an account to use our services. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
        </Text>
        <Text style={styles.subheading}>Account Security</Text>
        <Text style={styles.body}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
        </Text>
        <Text style={styles.subheading}>Account Eligibility</Text>
        <Text style={styles.body}>
          You must be at least 16 years old to use our services. By creating an account, you represent that you meet this age requirement.
        </Text>

        <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
        <Text style={styles.body}>
          You agree to:{"\n"}
          • Provide accurate and truthful information in your profile and applications{"\n"}
          • Use the service only for lawful job search purposes{"\n"}
          • Not misrepresent your qualifications or experience{"\n"}
          • Not use the platform to spam or harass employers{"\n"}
          • Not attempt to circumvent security measures{"\n"}
          • Not share your account with others{"\n"}
          • Comply with all applicable laws and regulations
        </Text>

        <Text style={styles.sectionTitle}>5. Automated Applications</Text>
        <Text style={styles.body}>
          By using our automated application features, you authorize us to submit job applications on your behalf using the information you provide. You acknowledge that:{"\n\n"}
          • You are responsible for the accuracy of information submitted{"\n"}
          • Applications are submitted to third-party platforms beyond our control{"\n"}
          • We cannot guarantee application success or interview opportunities{"\n"}
          • You may review and approve applications before submission where applicable
        </Text>

        <Text style={styles.sectionTitle}>6. Subscription and Payments</Text>
        <Text style={styles.subheading}>Premium Features</Text>
        <Text style={styles.body}>
          Certain features may require a paid subscription. Subscription terms, pricing, and billing cycles will be clearly displayed before purchase.
        </Text>
        <Text style={styles.subheading}>Billing</Text>
        <Text style={styles.body}>
          Subscriptions automatically renew unless canceled before the renewal date. You authorize us to charge your payment method for recurring subscription fees.
        </Text>
        <Text style={styles.subheading}>Refunds</Text>
        <Text style={styles.body}>
          Refund policies will be provided at the time of purchase. Generally, subscription fees are non-refundable except as required by law.
        </Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
        <Text style={styles.body}>
          All content, features, and functionality of our platform, including but not limited to text, graphics, logos, software, and AI algorithms, are owned by us and protected by intellectual property laws.{"\n\n"}
          You may not copy, modify, distribute, or reverse engineer any part of our platform without written permission.
        </Text>

        <Text style={styles.sectionTitle}>8. User Content</Text>
        <Text style={styles.body}>
          You retain ownership of content you upload (resumes, profiles, etc.). By uploading content, you grant us a license to use, store, and process this content to provide our services.{"\n\n"}
          You represent that you have the right to upload all content and that it does not violate any third-party rights.
        </Text>

        <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
        <Text style={styles.body}>
          Our platform integrates with third-party job boards, company career portals, and email services. We are not responsible for the availability, accuracy, or practices of these third-party services.{"\n\n"}
          Your use of third-party services is subject to their respective terms and policies.
        </Text>

        <Text style={styles.sectionTitle}>10. Disclaimers</Text>
        <Text style={styles.body}>
          Our services are provided "as is" without warranties of any kind. We do not guarantee:{"\n"}
          • Job placement or interview opportunities{"\n"}
          • Accuracy of job listings{"\n"}
          • Uninterrupted or error-free service{"\n"}
          • Specific results from using our platform{"\n\n"}
          We are not an employment agency and do not guarantee employment outcomes.
        </Text>

        <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services, including but not limited to lost opportunities, data loss, or business interruption.
        </Text>

        <Text style={styles.sectionTitle}>12. Termination</Text>
        <Text style={styles.body}>
          We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our discretion.{"\n\n"}
          You may terminate your account at any time through the app settings or by contacting us. Upon termination, your right to use the service will immediately cease.
        </Text>

        <Text style={styles.sectionTitle}>13. Changes to Terms</Text>
        <Text style={styles.body}>
          We may modify these Terms of Service at any time. We will notify you of significant changes via email or in-app notification. Continued use of the service after changes constitutes acceptance of the modified terms.
        </Text>

        <Text style={styles.sectionTitle}>14. Governing Law</Text>
        <Text style={styles.body}>
          These terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved in the appropriate courts.
        </Text>

        <Text style={styles.sectionTitle}>15. Contact Information</Text>
        <Text style={styles.body}>
          If you have questions about these Terms of Service, please contact us at:{"\n\n"}
          Email: support@nextquark.com{"\n"}
          Support: founders.nextquark@gmail.com
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
});
