import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const SUPABASE_URL = 'https://widujxpahzlpegzjjpqp.supabase.co';
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpZHVqeHBhaHpscGVnempqcHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTI2NjIsImV4cCI6MjA4NzMyODY2Mn0.OyjX0Qg4UlDPfTmCwhdK3JuE30698f6A-a01LunhDtM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Handle stale / invalid refresh tokens gracefully.
 *
 * When the stored refresh token is revoked or expired, Supabase's auto-refresh
 * throws an AuthApiError ("Invalid Refresh Token: Refresh Token Not Found").
 * This can happen before the onAuthStateChange listener fires, so we catch it
 * here and force a clean sign-out so the user is redirected to the login screen
 * instead of seeing an unhandled error.
 */
export async function handleStaleSession(): Promise<void> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    // Only sign out on actual auth errors, not when session is simply null (still loading)
    if (error) {
      console.log('[SUPABASE] Stale session detected, signing out. Error:', error.message);
      await supabase.auth.signOut();
      await AsyncStorage.multiRemove(['nextquark_auth', 'nextquark_onboarding', 'nextquark_swiped_jobs']);
    }
  } catch (e: any) {
    // If getSession itself throws (e.g. invalid refresh token), force sign-out
    if (e?.message?.includes('Refresh Token') || e?.name === 'AuthApiError') {
      console.log('[SUPABASE] Invalid refresh token caught, forcing sign-out');
      try { await supabase.auth.signOut(); } catch (_) {}
      await AsyncStorage.multiRemove(['nextquark_auth', 'nextquark_onboarding', 'nextquark_swiped_jobs']).catch(() => {});
    }
  }
}

export function getStorageUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function getStorageUploadUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
}

export function getProfilePictureUrl(avatarPath: string): string {
  if (avatarPath.startsWith('http')) return avatarPath;
  return getStorageUrl('profile-pictures', avatarPath);
}

export function getCompanyLogoStorageUrl(logoPath: string): string {
  if (logoPath.startsWith('http')) return logoPath;
  return getStorageUrl('company-logos', logoPath);
}
