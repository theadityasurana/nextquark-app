import { Stack } from 'expo-router';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DiscoverLayout() {
  return (
    <ErrorBoundary fallbackMessage="Something went wrong loading Discover. Tap to retry.">
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
