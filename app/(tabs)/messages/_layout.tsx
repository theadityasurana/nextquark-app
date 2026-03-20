import { Stack } from 'expo-router';
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function MessagesLayout() {
  return (
    <ErrorBoundary fallbackMessage="Something went wrong loading messages. Tap to retry.">
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
