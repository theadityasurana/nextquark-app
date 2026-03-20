import { Stack } from 'expo-router';
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function HomeLayout() {
  return (
    <ErrorBoundary fallbackMessage="Something went wrong loading jobs. Tap to retry.">
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
