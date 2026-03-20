import { Stack } from 'expo-router';
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function ApplicationsLayout() {
  return (
    <ErrorBoundary fallbackMessage="Something went wrong loading applications. Tap to retry.">
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
