import type { Router } from 'expo-router';

export function safeGoBack(router: Router, fallback: string = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
