import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

import ErrorBoundary from '@/components/ErrorBoundary';
import OfflineBanner from '@/components/OfflineBanner';
import { handleStaleSession } from '@/lib/supabase';

let Notifications: any;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Notifications not available in Expo Go on Android
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min default
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep in memory/disk longer for persistence
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_CACHE',
  throttleTime: 2000, // only write to disk every 2s to avoid thrashing
});


const APP_OPENED_KEY = 'nextquark_app_opened';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOnboardingComplete, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [appOpenedChecked, setAppOpenedChecked] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Handle notification responses (when user taps notification)
  useEffect(() => {
    if (!Notifications) return;

    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
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
    } else if (isAuthenticated && !isOnboardingComplete && !inOnboarding) {
      console.log('Redirecting to onboarding - profile incomplete');
      router.replace('/onboarding' as any);
    } else if (isAuthenticated && isOnboardingComplete && (inAuthGroup || inOnboarding)) {
      console.log('Redirecting to home - fully authenticated');
      router.replace('/(tabs)' as any);
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
        // Use setTimeout to avoid navigation race condition
        setTimeout(() => router.replace('/welcome-back' as any), 100);
      }
    } catch (e) {
      console.log('Error checking app opened status:', e);
      setAppOpenedChecked(true);
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
      <OfflineBanner />
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
        <Stack.Screen name="sign-up" options={{ headerShown: false, contentStyle: { backgroundColor: '#111111' } }} />
        <Stack.Screen name="mobile-signup" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false, contentStyle: { backgroundColor: '#111111' } }} />
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
        <Stack.Screen
          name="friend-profile"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="terms-of-service"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AuthGuard>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Lora_600SemiBold': require('@expo-google-fonts/lora/600SemiBold/Lora_600SemiBold.ttf'),
    'Lora_700Bold': require('@expo-google-fonts/lora/700Bold/Lora_700Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();

    // Catch unhandled refresh token errors globally
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      if (error?.message?.includes('Refresh Token') || error?.name === 'AuthApiError') {
        console.log('[GLOBAL] Caught stale refresh token error, forcing sign-out');
        handleStaleSession().catch(() => {});
        return; // Don't crash the app for auth errors
      }
      originalHandler(error, isFatal);
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary fallbackMessage="The app encountered an error. Tap below to restart.">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 1000 * 60 * 60 * 24, // persist cache for 24h
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Don't persist mutation-heavy or realtime queries
              const key = query.queryKey[0] as string;
              if (key === 'nextquark-mail') return false; // messages use realtime
              if (key === 'subscription-status') return false; // always fresh
              return query.state.status === 'success';
            },
          },
        }}
      >
        <GestureHandlerRootView>
          <ThemeProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default RootLayout;
