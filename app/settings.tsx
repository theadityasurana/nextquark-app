import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Linking, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck, HelpCircle, Info, MessageSquareMore, LogOut, Lightbulb, ChevronRight, BookOpen, Crown, Zap } from '@/components/ProfileIcons';
import { InstagramIcon, TwitterIcon, LinkedInIcon, WebsiteIcon } from '@/components/SocialIcons';
import * as Haptics from 'expo-haptics';
import { darkColors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import TutorialModal from '@/components/TutorialModal';
import { Image } from 'expo-image';
import { getSubscriptionStatus } from '@/lib/subscription';
import { useQuery } from '@tanstack/react-query';

export default function SettingsScreen() {
  const colors = darkColors;  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, userProfile, supabaseUserId } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-status-settings', supabaseUserId],
    queryFn: () => getSubscriptionStatus(supabaseUserId!),
    enabled: !!supabaseUserId,
  });
  const subType = subscriptionData?.subscription_type || 'free';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          console.log('User signed out');
        },
      },
    ]);
  };

  const menuItems = [
    { icon: Zap, label: 'Upgrade to Premium', route: '/premium', highlight: true },
    { icon: BookOpen, label: 'How to Use', action: () => setShowTutorial(true) },
    { icon: Lightbulb, label: 'Quick Tips', route: '/quick-tips' },
    { icon: ShieldCheck, label: 'Privacy Policy', route: '/privacy-policy' },
    { icon: HelpCircle, label: 'Help & Support', route: '/help-support' },
    { icon: MessageSquareMore, label: 'FAQs', route: '/faq' },
    { icon: Info, label: 'About Us', route: '/about-us' },
  ];

  const openSocialLink = async (url: string, appUrl?: string) => {
    try {
      if (appUrl && Platform.OS !== 'web') {
        const supported = await Linking.canOpenURL(appUrl);
        if (supported) {
          await Linking.openURL(appUrl);
          return;
        }
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const socialItems = [
    { icon: () => <TwitterIcon size={20} />, label: 'Twitter', url: 'https://twitter.com/nextquark', appUrl: 'twitter://user?screen_name=nextquark' },
    { icon: () => <InstagramIcon size={20} />, label: 'Instagram', url: 'https://instagram.com/nextquark', appUrl: 'instagram://user?username=nextquark' },
    { icon: () => <LinkedInIcon size={20} />, label: 'LinkedIn', url: 'https://linkedin.com/company/nextquark', appUrl: 'linkedin://company/nextquark' },
    { icon: () => <WebsiteIcon size={20} />, label: 'Website', url: 'https://nextquark.in' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', colors.background]} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={require('@/assets/images/image.png')} style={styles.heroBanner} />
        <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>Manage your account, preferences and more</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {userProfile && (
          <Pressable style={styles.profileCard} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Image source={{ uri: userProfile.avatar }} style={styles.profileAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profileHeadline} numberOfLines={1}>{userProfile.headline || userProfile.email}</Text>
            </View>
            <View style={[styles.subBadge, subType === 'premium' ? { backgroundColor: '#E65100' } : subType === 'pro' ? { backgroundColor: '#1565C0' } : { backgroundColor: '#9E9E9E' }]}>
              {subType !== 'free' && <Crown size={10} color="#FFF" />}
              <Text style={styles.subBadgeText}>{subType === 'premium' ? 'Premium' : subType === 'pro' ? 'Pro' : 'Free'}</Text>
            </View>
            <ChevronRight size={16} color="#9E9E9E" />
          </Pressable>
        )}

        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          {menuItems.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <Pressable
                key={idx}
                style={[styles.menuItem, idx < menuItems.length - 1 && styles.menuItemBorder]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  if (item.action) {
                    item.action();
                  } else if (item.route) {
                    router.push(item.route as any);
                  }
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceElevated || '#F5F5F5' }, (item as any).highlight && { backgroundColor: '#FFF3E0' }]}>
                  <IconComp size={20} color={(item as any).highlight ? '#E65100' : colors.textPrimary} />
                </View>
                <Text style={[styles.menuLabel, { color: (item as any).highlight ? '#E65100' : colors.textPrimary, fontWeight: (item as any).highlight ? '700' : '600' }]}>{item.label}</Text>
                <ChevronRight size={18} color="#9E9E9E" />
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          {socialItems.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <Pressable
                key={idx}
                style={[styles.menuItem, idx < socialItems.length - 1 && styles.menuItemBorder]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  openSocialLink(item.url, item.appUrl);
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: 'transparent' }]}>
                  <IconComp />
                </View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                <ChevronRight size={18} color="#9E9E9E" />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.versionText}>NextQuark v1.0.0</Text>
      </ScrollView>

      <TutorialModal visible={showTutorial} onClose={() => setShowTutorial(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroGradient: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  heroSubtext: { fontSize: 13, textAlign: 'center', marginTop: 0 },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1E1E1E', borderRadius: 16, padding: 14, marginTop: 12,
  },
  profileAvatar: { width: 48, height: 48, borderRadius: 16 },
  profileName: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  profileHeadline: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  subBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  subBadgeText: { fontSize: 10, fontWeight: '700' as const, color: '#FFF' },
  menuSection: {
    backgroundColor: '#1E1E1E', borderRadius: 16,
    marginTop: 12, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  menuIconContainer: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF' },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 16,
    height: 56, marginTop: 24,
  },
  signOutText: { fontSize: 16, fontWeight: '700' as const, color: '#EF4444' },
  versionText: {
    textAlign: 'center', color: 'rgba(255,255,255,0.4)',
    fontSize: 12, marginTop: 24,
  },
});
