import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import TutorialModal from '@/components/TutorialModal';

let Notifications: any;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('Notifications not available in Expo Go on Android');
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const TUTORIAL_COMPLETED_KEY = 'nextquark_tutorial_completed';
const APP_OPENED_KEY = 'nextquark_app_opened';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOnboardingComplete, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [appOpenedChecked, setAppOpenedChecked] = useState(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Handle notification responses (when user taps notification)
  useEffect(() => {
    if (!Notifications) return;

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      
      // Handle navigation based on notification data
      if (data.screen) {
        router.push(data.screen as any);
      }
      if (data.job_id) {
        router.push(`/job-details?id=${data.job_id}` as any);
      }
    });

    return () => {
      if (Notifications?.removeNotificationSubscription) {
        Notifications.removeNotificationSubscription(notificationListener.current);
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  useEffect(() => {
    if (isLoading || !appOpenedChecked) return;

    const seg = segments[0] as string;
    const inAuthGroup = seg === 'welcome' || seg === 'sign-up' || seg === 'sign-in' || seg === 'email-verification' || seg === 'mobile-signup';
    const inOnboarding = seg === 'onboarding';
    const inTabs = seg === '(tabs)';
    const inWelcomeBack = seg === 'welcome-back';

    if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      console.log('Redirecting to welcome - not authenticated');
      router.replace('/welcome' as any);
    } else if (isAuthenticated && isOnboardingComplete && (inAuthGroup || inOnboarding)) {
      console.log('Redirecting to home - fully authenticated');
      router.replace('/(tabs)' as any);
    } else if (isAuthenticated && isOnboardingComplete && inTabs) {
      checkAndShowTutorial();
    }
  }, [isAuthenticated, isOnboardingComplete, isLoading, segments, appOpenedChecked]);

  useEffect(() => {
    if (isLoading) return;
    checkAppOpened();
  }, [isLoading]);

  const checkAppOpened = async () => {
    if (appOpenedChecked) return;
    try {
      const opened = await AsyncStorage.getItem(APP_OPENED_KEY);
      setAppOpenedChecked(true);
      if (isAuthenticated && isOnboardingComplete && !opened) {
        router.replace('/welcome-back' as any);
      }
    } catch (e) {
      console.log('Error checking app opened status:', e);
      setAppOpenedChecked(true);
    }
  };

  const checkAndShowTutorial = async () => {
    if (tutorialChecked) return;
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
      if (!completed) {
        setShowTutorial(true);
      }
      setTutorialChecked(true);
    } catch (e) {
      console.log('Error checking tutorial status:', e);
      setTutorialChecked(true);
    }
  };

  const handleCloseTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      setShowTutorial(false);
    } catch (e) {
      console.log('Error saving tutorial status:', e);
      setShowTutorial(false);
    }
  };

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      {children}
      <TutorialModal visible={showTutorial} onClose={handleCloseTutorial} />
    </>
  );
}

const loadingStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});

function RootLayoutNav() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerBackTitle: 'Back' }}>
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="welcome-back" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="mobile-signup" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="email-verification" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="job-details"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="chat"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile-preview"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="application-details"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="privacy-policy"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="resume-management"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="saved-jobs"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="premium"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="quick-tips"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="help-support"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="about-us"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="faq"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="report-ticket"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="company-profile"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
