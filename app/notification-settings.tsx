import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Briefcase, MessageCircle, Calendar, Star, Zap, Mail } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface NotificationSetting {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor: string;
  enabled: boolean;
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      key: 'push_all',
      title: 'Push Notifications',
      description: 'Enable or disable all push notifications',
      icon: Bell,
      iconColor: Colors.accent,
      enabled: true,
    },
    {
      key: 'new_matches',
      title: 'New Job Matches',
      description: 'Get notified when new jobs match your profile',
      icon: Zap,
      iconColor: '#FF8F00',
      enabled: true,
    },
    {
      key: 'application_updates',
      title: 'Application Updates',
      description: 'Status changes on your applications',
      icon: Briefcase,
      iconColor: Colors.textPrimary,
      enabled: true,
    },
    {
      key: 'messages',
      title: 'Messages',
      description: 'New messages from recruiters and companies',
      icon: MessageCircle,
      iconColor: '#1E88E5',
      enabled: true,
    },
    {
      key: 'interview_reminders',
      title: 'Interview Reminders',
      description: 'Reminders for upcoming interviews',
      icon: Calendar,
      iconColor: '#E65100',
      enabled: true,
    },
    {
      key: 'saved_job_updates',
      title: 'Saved Job Updates',
      description: 'Updates on jobs you have saved',
      icon: Star,
      iconColor: '#FFB300',
      enabled: false,
    },
    {
      key: 'email_digest',
      title: 'Weekly Email Digest',
      description: 'Receive a weekly summary of your activity',
      icon: Mail,
      iconColor: '#7B1FA2',
      enabled: true,
    },
  ]);

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
    console.log(`Toggled notification setting: ${key}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {settings.map((setting, idx) => {
            const IconComponent = setting.icon;
            return (
              <View
                key={setting.key}
                style={[
                  styles.settingRow,
                  idx < settings.length - 1 && styles.settingRowBorder,
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: `${setting.iconColor}15` }]}>
                  <IconComponent size={20} color={setting.iconColor} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{setting.title}</Text>
                  <Text style={styles.settingDesc}>{setting.description}</Text>
                </View>
                <Switch
                  value={setting.enabled}
                  onValueChange={() => toggleSetting(setting.key)}
                  trackColor={{ false: Colors.borderLight, true: Colors.accentSoft }}
                  thumbColor={setting.enabled ? Colors.accent : Colors.textTertiary}
                  ios_backgroundColor={Colors.borderLight}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Quiet Hours</Text>
          <Text style={styles.infoDesc}>
            Notifications are automatically silenced between 10:00 PM and 7:00 AM in your local timezone.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Notification Channels</Text>
          <Text style={styles.infoDesc}>
            You can also manage notification permissions in your device settings. Changes made there will override the settings above.
          </Text>
        </View>

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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
