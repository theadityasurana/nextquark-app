import { supabase } from './supabase';

const DAILY_SWIPES_LIMIT = 10;

interface DailySwipeData {
  remaining: number;
  resetAt: string | null; // ISO timestamp when swipes reset
}

let cachedData: DailySwipeData | null = null;
let cachedUserId: string | null = null;

function isResetDue(resetAt: string | null): boolean {
  if (!resetAt) return false;
  return Date.now() >= new Date(resetAt).getTime();
}

async function fetchFromSupabase(userId: string): Promise<DailySwipeData> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('daily_swipes_remaining, daily_swipes_reset_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { remaining: DAILY_SWIPES_LIMIT, resetAt: null };
    }

    let remaining = data.daily_swipes_remaining ?? DAILY_SWIPES_LIMIT;
    let resetAt = data.daily_swipes_reset_at ?? null;

    // If reset time has passed, grant fresh swipes
    if (isResetDue(resetAt)) {
      remaining = DAILY_SWIPES_LIMIT;
      resetAt = null;
      await supabase
        .from('profiles')
        .update({ daily_swipes_remaining: DAILY_SWIPES_LIMIT, daily_swipes_reset_at: null })
        .eq('id', userId);
    }

    const result = { remaining, resetAt };
    cachedData = result;
    cachedUserId = userId;
    return result;
  } catch {
    return cachedData || { remaining: DAILY_SWIPES_LIMIT, resetAt: null };
  }
}

export async function getDailySwipes(userId: string): Promise<{ remaining: number; resetAt: number }> {
  // Use cache if same user and not stale
  if (cachedData && cachedUserId === userId) {
    // Check if cached reset time has passed
    if (cachedData.resetAt && isResetDue(cachedData.resetAt)) {
      cachedData = null; // force refresh
    } else {
      return {
        remaining: cachedData.remaining,
        resetAt: cachedData.resetAt ? new Date(cachedData.resetAt).getTime() : 0,
      };
    }
  }

  const data = await fetchFromSupabase(userId);
  return {
    remaining: data.remaining,
    resetAt: data.resetAt ? new Date(data.resetAt).getTime() : 0,
  };
}

/** Force refresh from Supabase (call after earning swipes) */
export async function refreshDailySwipesFromServer(userId: string): Promise<{ remaining: number; resetAt: number }> {
  cachedData = null;
  return getDailySwipes(userId);
}

/** Decrement daily free swipes. Returns true if a free swipe was available. */
export async function useDailySwipe(userId: string): Promise<boolean> {
  const data = await fetchFromSupabase(userId);
  if (data.remaining <= 0) return false;

  const newRemaining = data.remaining - 1;
  // Start 24h timer on first swipe use (when resetAt is null)
  const newResetAt = data.resetAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('profiles')
    .update({ daily_swipes_remaining: newRemaining, daily_swipes_reset_at: newResetAt })
    .eq('id', userId);

  cachedData = { remaining: newRemaining, resetAt: newResetAt };
  cachedUserId = userId;
  return true;
}

/** Add bonus swipes to daily counter (called when referral/social swipes are earned) */
export async function addBonusDailySwipes(userId: string, count: number): Promise<void> {
  const data = await fetchFromSupabase(userId);
  const newRemaining = data.remaining + count;

  await supabase
    .from('profiles')
    .update({ daily_swipes_remaining: newRemaining })
    .eq('id', userId);

  cachedData = { remaining: newRemaining, resetAt: data.resetAt };
  cachedUserId = userId;
}

export { DAILY_SWIPES_LIMIT };
