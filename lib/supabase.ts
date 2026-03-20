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

// Handle stale refresh tokens gracefully - sign out if token is invalid
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Token refresh failed, clear stale session
    await AsyncStorage.multiRemove(['nextquark_auth', 'nextquark_onboarding', 'nextquark_swiped_jobs']);
  }
});

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
