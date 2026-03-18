import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const PENDING_STEP_COUNT = 11; // must match application-details.tsx
const LAST_STEP = PENDING_STEP_COUNT - 2 - 1; // 8

/**
 * Given a list of application IDs, returns a Set of IDs
 * whose local step progress has reached the end (i.e. "locked in").
 * Re-checks every time the screen gains focus.
 */
export function useCompletedApps(appIds: string[]): Set<string> {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const check = useCallback(() => {
    if (appIds.length === 0) {
      setCompleted(new Set());
      return;
    }
    const keys = appIds.map((id) => `app_step_${id}`);
    AsyncStorage.multiGet(keys).then((results) => {
      const done = new Set<string>();
      results.forEach(([key, val]) => {
        if (val !== null) {
          const step = parseInt(val, 10);
          if (!isNaN(step) && step >= LAST_STEP) {
            done.add(key.replace('app_step_', ''));
          }
        }
      });
      setCompleted(done);
    });
  }, [appIds]);

  // Re-check on focus (when navigating back from details page)
  useFocusEffect(
    useCallback(() => {
      check();
    }, [check])
  );

  return completed;
}
