import { Stack } from 'expo-router';
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function ProfileLayout() {
  return (
    <ErrorBoundary fallbackMessage="Something went wrong loading your profile. Tap to retry.">
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
