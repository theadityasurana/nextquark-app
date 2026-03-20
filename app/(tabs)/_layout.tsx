import { useEffect, useState, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Home, Briefcase, MessageCircle, User, AlertCircle, Compass } from 'lucide-react-native';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import { useQuery } from '@tanstack/react-query';
import { fetchUserApplications, fetchJobsFromSupabase } from '@/lib/jobs';
import { initUnreadMailListener, cleanupUnreadMailListener, subscribeUnreadCount } from '@/lib/unreadMail';

function TabBarBadge({ count, type = 'count' }: { count: number; type?: 'count' | 'alert' }) {
  if (count === 0 && type === 'count') return null;
  
  return (
    <View style={styles.badge}>
      {type === 'alert' ? (
        <AlertCircle size={8} color="#FFFFFF" />
      ) : (
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { supabaseUserId, userProfile, swipedJobIds } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  
  const { data: applications = [] } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    queryFn: () => fetchUserApplications(supabaseUserId!),
    enabled: !!supabaseUserId,
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <User size={size} color={color} fill={focused ? colors.surface : 'none'} strokeWidth={focused ? 2.5 : 2} />
              {isProfileIncomplete && <TabBarBadge count={1} type="alert" />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Compass size={size} color={color} fill={focused ? colors.surface : 'none'} strokeWidth={focused ? 2.5 : 2} />
              {favoriteCompaniesCount > 0 && <TabBarBadge count={favoriteCompaniesCount} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Home size={size} color={color} fill={focused ? colors.surface : 'none'} strokeWidth={focused ? 2.5 : 2} />
              {forYouCount > 0 && <TabBarBadge count={forYouCount} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Briefcase size={size} color={color} fill={focused ? colors.surface : 'none'} strokeWidth={focused ? 2.5 : 2} />
              {applicationsCount > 0 && <TabBarBadge count={applicationsCount} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <MessageCircle size={size} color={color} fill={focused ? colors.surface : 'none'} strokeWidth={focused ? 2.5 : 2} />
              {unreadMessages > 0 && <TabBarBadge count={unreadMessages} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700' as const,
  },
});
