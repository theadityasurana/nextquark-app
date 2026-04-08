import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck as Shield } from '@/components/ProfileIcons';
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
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
        </View>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.body}>
          We value your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile application, website, and related services.{"\n\n"}
          By using our services, you agree to the collection and use of information in accordance with this policy.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.subheading}>Personal Information</Text>
        <Text style={styles.body}>
          When you create an account or use our services, we may collect: name, email address, phone number, resume or CV, work experience, skills, education history, salary expectations, and job preferences. This information is used to help automate and submit job applications on your behalf.
        </Text>
        <Text style={styles.subheading}>Account & Login Information</Text>
        <Text style={styles.body}>
          If you sign in using third-party services (such as Google), we may receive basic profile information including email address, name, and profile picture.
        </Text>
        <Text style={styles.subheading}>Application Data</Text>
        <Text style={styles.body}>
          When using the platform to apply for jobs, we may store: jobs you swipe or interact with, companies you apply to, application status, application timestamps, and AI-generated application data.
        </Text>
        <Text style={styles.subheading}>Email Integration Data</Text>
        <Text style={styles.body}>
          If you connect your email account (such as Gmail), we may access emails related to job applications, interview confirmations, and application responses. We only access this information to help you track your job applications within the platform. We do not read unrelated personal emails.
        </Text>
        <Text style={styles.subheading}>Device & Usage Data</Text>
        <Text style={styles.body}>
          We may automatically collect: device type, operating system, IP address, app usage behavior, and crash logs. This helps us improve the reliability and performance of the platform.
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your information to:{"\n"}
          • Create and manage your account{"\n"}
          • Automate job applications on your behalf{"\n"}
          • Upload resumes to job portals{"\n"}
          • Track and display application status{"\n"}
          • Improve our AI systems{"\n"}
          • Provide analytics about job trends{"\n"}
          • Improve the user experience{"\n"}
          • Communicate important service updates
        </Text>

        <Text style={styles.sectionTitle}>4. AI Automation</Text>
        <Text style={styles.body}>
          Our platform may use AI-powered systems to assist with job applications by filling out application forms, uploading resumes, and submitting applications to company career portals. These actions are performed only with your authorization.
        </Text>

        <Text style={styles.sectionTitle}>5. Sharing of Information</Text>
        <Text style={styles.body}>
          We do not sell your personal information.{"\n\n"}
          We may share information with:{"\n"}
          • Job Platforms & Employers: When submitting job applications on your behalf{"\n"}
          • Service Providers: Third-party services used for hosting, analytics, authentication, and email processing{"\n"}
          • Legal Requirements: If required by law or government authorities
        </Text>

        <Text style={styles.sectionTitle}>6. Data Security</Text>
        <Text style={styles.body}>
          We implement industry-standard security practices to protect your information, including encrypted connections (HTTPS), secure servers, and restricted data access. However, no system can guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.body}>
          We retain your information only for as long as necessary to provide our services. You may request deletion of your data at any time by contacting us.
        </Text>

        <Text style={styles.sectionTitle}>8. Your Rights</Text>
        <Text style={styles.body}>
          Depending on your location, you may have the right to:{"\n"}
          • Access your personal data{"\n"}
          • Update or correct your information{"\n"}
          • Request deletion of your account{"\n"}
          • Withdraw consent for data processing{"\n\n"}
          To make a request, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>9. Third-Party Links</Text>
        <Text style={styles.body}>
          Our platform may contain links to external job portals and company websites. We are not responsible for the privacy practices of those websites.
        </Text>

        <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
        <Text style={styles.body}>
          Our services are not intended for individuals under the age of 16. We do not knowingly collect data from children.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy periodically. Any updates will be posted on this page with the revised date.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions about this Privacy Policy, please contact us at support@nextquark.com
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
