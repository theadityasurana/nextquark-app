import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Shield size={28} color={Colors.accent} />
          </View>
          <Text style={styles.lastUpdated}>Last updated: February 15, 2026</Text>
        </View>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.body}>
          Welcome to JobSwipe. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services. By accessing or using JobSwipe, you agree to the terms outlined in this policy. If you do not agree with the terms of this privacy policy, please discontinue use of the application immediately. We encourage you to read this policy carefully and contact us if you have any questions or concerns about our privacy practices.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information that you voluntarily provide to us when you register on the application, express interest in obtaining information about us or our products, participate in activities on the application, or otherwise contact us. The personal information we collect may include your name, email address, phone number, mailing address, job title, employment history, educational background, skills, resume data, profile photographs, and any other information you choose to provide. We also automatically collect certain information when you visit, use, or navigate the application, including device and usage information such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, and information about how and when you use our application. This information is primarily needed to maintain the security and operation of our application and for our internal analytics and reporting purposes.
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your personal information for a variety of business purposes, including: to facilitate account creation and login; to deliver and facilitate delivery of services to you; to respond to your inquiries and solve any potential issues; to send you marketing and promotional communications (with your consent); to deliver targeted advertising to you; to protect our services, including fraud monitoring and prevention; to enforce our terms, conditions, and policies; to respond to legal requests and prevent harm; to manage your account and provide customer support; to match you with relevant job opportunities based on your profile and preferences; to provide personalized job recommendations using our AI-powered matching algorithms; and to improve our application and develop new features and services. We process your information based on legitimate business interests, the fulfillment of our contract with you, compliance with our legal obligations, and your consent where applicable.
        </Text>

        <Text style={styles.sectionTitle}>4. Sharing Your Information</Text>
        <Text style={styles.body}>
          We may share your information with third parties in certain situations. We may share your data with third-party service providers who perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance. When you apply to a job through our platform, your profile information and resume may be shared with the respective employer or recruiter associated with that job listing. We may also share your information with our business partners to offer you certain products, services, or promotions. If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will never sell your personal information to third parties for their direct marketing purposes without your explicit consent.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.body}>
          We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure. We cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our application is at your own risk. We use encryption, access controls, regular security audits, and industry-standard practices to safeguard your data at rest and in transit.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Privacy Rights</Text>
        <Text style={styles.body}>
          Depending on your location, you may have certain rights regarding your personal information. These rights may include the right to access, correct, or delete the personal data we hold about you; the right to restrict or object to our processing of your personal data; the right to data portability; and the right to withdraw consent at any time where we rely on consent to process your information. You may update, amend, or delete your account information at any time by logging into your account settings. If you wish to delete your account entirely, please contact us at privacy@jobswipe.com and we will process your request within 30 days. You also have the right to opt out of marketing communications at any time by clicking the unsubscribe link in any marketing email we send or by adjusting your notification preferences within the application.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.body}>
          We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy policy, unless a longer retention period is required or permitted by law. When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information. If deletion is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible. We retain application history and job match data for up to two years after your last activity to provide you with continuity of service.
        </Text>

        <Text style={styles.sectionTitle}>8. Cookies and Tracking</Text>
        <Text style={styles.body}>
          We may use cookies and similar tracking technologies to access or store information. You can set your device to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our application. We use analytics tools to understand how users interact with our application, which helps us improve the user experience and develop better features. These tools may collect information such as how often you use the application, what pages or features you use most, and your general interaction patterns.
        </Text>

        <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
        <Text style={styles.body}>
          Our application is not intended for individuals under the age of 16. We do not knowingly collect personal information from children under 16. If we learn that we have collected personal information from a child under age 16 without verification of parental consent, we will take steps to delete that information. If you believe we might have any information from or about a child under 16, please contact us immediately at privacy@jobswipe.com.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this privacy policy from time to time. The updated version will be indicated by an updated "Last Updated" date and the updated version will be effective as soon as it is accessible. We encourage you to review this privacy policy frequently to be informed of how we are protecting your information. If we make material changes to this privacy policy, we may notify you either through the email address you have provided us or by placing a prominent notice within the application.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions or comments about this policy, you may contact our Data Protection Officer by email at privacy@jobswipe.com, or by mail at: JobSwipe Inc., 100 Market Street, Suite 400, San Francisco, CA 94105, United States. For any privacy-related concerns or requests, we aim to respond within 30 business days.
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
});
