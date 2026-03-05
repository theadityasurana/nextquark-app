import { Tabs } from 'expo-router';
import { Home, Briefcase, MessageCircle, User, AlertCircle, Compass } from 'lucide-react-native';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchUserApplications } from '@/lib/jobs';

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
  
  const { data: applications = [] } = useQuery({
    queryKey: ['user-applications', supabaseUserId],
    queryFn: () => fetchUserApplications(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const applicationsCount = applications.length;
  const isProfileIncomplete = (userProfile?.profileCompletion || 0) < 100;
  const unreadMessages = 0;
  const jobsRemaining = Math.max(0, 20 - swipedJobIds.length);
  const favoriteCompaniesCount = userProfile?.favoriteCompanies?.length || 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <User size={size} color={color} fill={focused ? color : 'none'} />
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
              <Compass size={size} color={color} fill={focused ? color : 'none'} />
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
              <Home size={size} color={color} fill={focused ? color : 'none'} />
              {jobsRemaining > 0 && <TabBarBadge count={jobsRemaining} />}
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
              <Briefcase size={size} color={color} fill={focused ? color : 'none'} />
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
              <MessageCircle size={size} color={color} fill={focused ? color : 'none'} />
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
