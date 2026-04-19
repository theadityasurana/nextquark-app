import { useEffect, useState, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import { useQuery } from '@tanstack/react-query';
import { fetchUserApplications, fetchJobsFromSupabase } from '@/lib/jobs';
import { initUnreadMailListener, cleanupUnreadMailListener, subscribeUnreadCount } from '@/lib/unreadMail';
import { CommonActions } from '@react-navigation/native';

function TabBarBadge({ count, type = 'count' }: { count: number; type?: 'count' | 'alert' }) {
  if (count === 0 && type === 'count') return null;
  
  return (
    <View style={styles.badge}>
      {type === 'alert' ? (
        <Ionicons name="alert-circle" size={8} color="#FFFFFF" />
      ) : (
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      )}
    </View>
  );
}

function TabIcon({ name, color, focused, badgeCount, badgeType }: {
  name: string; color: string; focused: boolean;
  badgeCount?: number; badgeType?: 'count' | 'alert';
}) {
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name={(focused ? name : `${name}-outline`) as any} size={22} color={color} />
      {badgeCount != null && badgeCount > 0 && <TabBarBadge count={badgeCount} type={badgeType} />}
    </View>
  );
}

export default function TabLayout() {
  const { supabaseUserId, userProfile, swipedJobIds } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const insets = useSafeAreaInsets();
  
  const { data: applications = [] } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    queryFn: () => fetchUserApplications(supabaseUserId!),
    enabled: !!supabaseUserId,
    staleTime: 1000 * 60 * 3, // 3 min
  });

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!supabaseUserId) {
      cleanupUnreadMailListener();
      return;
    }
    initUnreadMailListener(supabaseUserId);
    const unsub = subscribeUnreadCount(setUnreadMessages);
    return () => {
      unsub();
      cleanupUnreadMailListener();
    };
  }, [supabaseUserId]);

  const applicationsCount = applications.length;
  const isProfileIncomplete = (userProfile?.profileCompletion || 0) < 100;
  const favoriteCompaniesCount = userProfile?.favoriteCompanies?.length || 0;

  const { data: supabaseJobs } = useQuery({
    queryKey: ['supabase-jobs'],
    queryFn: fetchJobsFromSupabase,
    staleTime: 1000 * 60 * 5,
  });

  const forYouCount = useMemo(() => {
    const allJobs = supabaseJobs || [];
    let filtered = allJobs;
    if (swipedJobIds.length > 0) {
      const swipedSet = new Set(swipedJobIds);
      filtered = filtered.filter(job => !swipedSet.has(job.id));
    }
    // India filter
    filtered = filtered.filter(job => {
      const keyword = 'india';
      return job.jobTitle.toLowerCase().includes(keyword) ||
        job.companyName.toLowerCase().includes(keyword) ||
        job.location.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword) ||
        job.skills.some((skill: string) => skill.toLowerCase().includes(keyword));
    });
    // Desired roles filter
    if (userProfile?.desiredRoles && userProfile.desiredRoles.length > 0) {
      filtered = filtered.filter(job =>
        userProfile.desiredRoles!.some((role: string) => {
          const roleLower = role.toLowerCase();
          return job.jobTitle.toLowerCase().includes(roleLower) ||
            job.description.toLowerCase().includes(roleLower) ||
            job.skills.some((skill: string) => skill.toLowerCase().includes(roleLower));
        })
      );
    }
    return filtered.length;
  }, [supabaseJobs, swipedJobIds, userProfile]);

  const resetStackOnTabPress = ({ navigation }: any) => ({
    tabPress: (e: any) => {
      try {
        const state = navigation.getState();
        const currentRoute = state.routes[state.index];
        if (currentRoute.state && currentRoute.state.index && currentRoute.state.index > 0) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: currentRoute.name }],
            })
          );
        }
      } catch {}
    },
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
          elevation: 0,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint={theme === 'dark' ? 'dark' : 'light'}
              intensity={80}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="person" color={color} focused={focused}
              badgeCount={isProfileIncomplete ? 1 : 0} badgeType="alert" />
          ),
        }}
        listeners={resetStackOnTabPress}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="compass" color={color} focused={focused}
              badgeCount={favoriteCompaniesCount} />
          ),
        }}
        listeners={resetStackOnTabPress}
      />
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="briefcase" color={color} focused={focused}
              badgeCount={forYouCount} />
          ),
        }}
        listeners={resetStackOnTabPress}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="document-text" color={color} focused={focused}
              badgeCount={applicationsCount} />
          ),
        }}
        listeners={resetStackOnTabPress}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="chatbubble" color={color} focused={focused}
              badgeCount={unreadMessages} />
          ),
        }}
        listeners={resetStackOnTabPress}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
});
