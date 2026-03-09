import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Calendar, Clock, AlertTriangle } from 'lucide-react-native';
import { useColors } from '@/contexts/useColors';
import { Application } from '@/types';

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const applied = new Date(dateStr);
  const diffMs = now.getTime() - applied.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `Applied ${diffMins}m ago`;
  if (diffHours < 24) return `Applied ${diffHours}h ago`;
  if (diffDays === 1) return 'Applied yesterday';
  if (diffDays < 7) return `Applied ${diffDays} days ago`;
  if (diffDays < 30) return `Applied ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `Applied ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

interface ApplicationItemProps {
  application: Application;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Submitted', color: '#2E7D32' },
  applied: { label: 'Submitted', color: '#2E7D32' },
  under_review: { label: 'Need More Details', color: '#FF9800' },
  interviewing: { label: 'Interview', color: '#1565C0' },
  interview_scheduled: { label: 'Interview', color: '#1565C0' },
  offer: { label: 'Offer Received', color: '#2E7D32' },
  rejected: { label: 'Rejected', color: '#C62828' },
  withdrawn: { label: 'Withdrawn', color: '#616161' },
};

export default function ApplicationItem({ application }: ApplicationItemProps) {
  const router = useRouter();
  const colors = useColors();
  const status = statusConfig[application.status] || statusConfig.applied;
  const timeAgo = useMemo(() => getTimeAgo(application.appliedDate), [application.appliedDate]);

  const handlePress = () => {
    router.push({ pathname: '/application-details' as any, params: { id: application.id } });
  };

  return (
    <Pressable style={({ pressed }) => [styles.container, { backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]} onPress={handlePress}>
      <View style={styles.cardContent}>
        <Image source={{ uri: application.job.companyLogo }} style={styles.logo} />
        <View style={styles.content}>
          <Text style={[styles.jobTitle, { color: colors.textPrimary }]} numberOfLines={1}>{application.job.jobTitle}</Text>
          <Text style={[styles.companyName, { color: colors.textSecondary }]}>{application.job.companyName}</Text>
          <View style={styles.bottomRow}>
            <View style={styles.timeAgoRow}>
              <Clock size={10} color={colors.textTertiary} />
              <Text style={[styles.timeAgoText, { color: colors.textTertiary }]}>{timeAgo}</Text>
              <Text style={[styles.statusDot, { color: colors.textTertiary }]}>•</Text>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            {(application.status === 'applied' || application.status === 'under_review') && (
              <View style={styles.alertRow}>
                <AlertTriangle size={12} color="#E65100" />
                <Text style={styles.alertText}>Action needed</Text>
              </View>
            )}
            {application.interviewDate && (
              <View style={styles.dateRow}>
                <Calendar size={11} color={colors.statusInterview} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>{application.interviewDate}</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEEEEE',
  },
  content: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#111111',
  },
  companyName: {
    fontSize: 13,
    color: '#616161',
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeAgoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  timeAgoText: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  statusDot: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: '600' as const,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertText: {
    fontSize: 10,
    color: '#E65100',
    fontWeight: '700' as const,
  },
});
