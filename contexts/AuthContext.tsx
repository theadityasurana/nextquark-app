import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
import { UserProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';

const AUTH_KEY = 'nextquark_auth';
const ONBOARDING_KEY = 'nextquark_onboarding';
const SWIPED_JOBS_KEY = 'nextquark_swiped_jobs';

interface AuthState {
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  userEmail: string;
  userName: string;
  authMethod: 'email' | null;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  isOnboardingComplete: false,
  userEmail: '',
  userName: '',
  authMethod: null,
};

function mapDbToUserProfile(profile: Record<string, any>, userId: string): UserProfile {
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const topSkills = Array.isArray(profile.top_skills) ? profile.top_skills : [];
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  const achievements = Array.isArray(profile.achievements) ? profile.achievements : [];
  const favoriteCompanies = Array.isArray(profile.favorite_companies) ? profile.favorite_companies : [];

  let completionScore = 0;
  const total = 10;
  if (profile.full_name) completionScore++;
  if (profile.headline) completionScore++;
  if (profile.bio) completionScore++;
  if (profile.phone) completionScore++;
  if (profile.location) completionScore++;
  if (profile.avatar_url) completionScore++;
  if (skills.length > 0) completionScore++;
  if (experience.length > 0) completionScore++;
  if (education.length > 0) completionScore++;
  if (profile.linkedin_url || profile.github_url || profile.resume_url) completionScore++;

  return {
    id: userId,
    name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    headline: profile.headline || '',
    location: profile.location || '',
    avatar: profile.avatar_url 
      ? (profile.avatar_url.startsWith('http') 
          ? profile.avatar_url 
          : `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/public/profile-pictures/${profile.avatar_url}`)
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    bio: profile.bio || '',
    profileCompletion: Math.round((completionScore / total) * 100),
    totalApplications: 0,
    interviewsScheduled: 0,
    matchRate: 0,
    profileViews: 0,
    skills,
    topSkills,
    experience,
    education,
    certifications,
    achievements,
    jobPreferences: Array.isArray(profile.job_preferences) ? profile.job_preferences : [],
    workModePreferences: Array.isArray(profile.work_mode_preferences) ? profile.work_mode_preferences : [],
    salaryCurrency: profile.salary_currency || 'USD',
    salaryMinPref: profile.salary_min || 0,
    salaryMaxPref: profile.salary_max || 0,
    linkedinUrl: profile.linkedin_url || undefined,
    githubUrl: profile.github_url || undefined,
    isProfileVerified: false,
    veteranStatus: profile.veteran_status || undefined,
    disabilityStatus: profile.disability_status || undefined,
    ethnicity: profile.ethnicity || undefined,
    gender: profile.gender || undefined,
    coverLetter: profile.cover_letter || undefined,
    workAuthorizationStatus: profile.work_authorization_status || undefined,
    jobRequirements: Array.isArray(profile.job_requirements) ? profile.job_requirements : undefined,
    resumeUrl: profile.resume_url || undefined,
    desiredRoles: Array.isArray(profile.desired_roles) ? profile.desired_roles : undefined,
    preferredCities: Array.isArray(profile.preferred_cities) ? profile.preferred_cities : undefined,
    favoriteCompanies,
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [swipedJobIds, setSwipedJobIds] = useState<string[]>([]);
  const initDoneRef = useRef(false);

  const fetchAndSetProfile = useCallback(async (userId: string, session: Session) => {
    try {
      // Register for push notifications
      registerForPushNotifications().then(token => {
        if (token) {
          savePushToken(userId, token);
        }
      }).catch(err => console.log('Push notification registration error:', err));

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        console.log('No profile found, creating new one for user:', userId);
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        const parts = name.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        const newProfile = {
          id: userId,
          email,
          full_name: name,
          first_name: firstName,
          last_name: lastName,
          is_onboarding_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(newProfile);

        const newAuthState: AuthState = {
          isAuthenticated: true,
          isOnboardingComplete: false,
          userEmail: email,
          userName: name,
          authMethod: 'email',
        };
        setAuthState(newAuthState);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newAuthState));
        setOnboardingData({
          ...defaultOnboardingData,
          firstName,
          lastName,
        });
        console.log('New user profile created, isOnboardingComplete: false');
        return;
      }

      if (error) {
        console.log('Error fetching profile (non-fatal):', error.message);
        const fallbackState: AuthState = {
          isAuthenticated: true,
          isOnboardingComplete: false,
          userEmail: session.user.email || '',
          userName: '',
          authMethod: 'email',
        };
        setAuthState(fallbackState);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(fallbackState));
        return;
      }

      if (profile) {
        const isComplete = profile.is_onboarding_complete === true;
        const currentAuthState: AuthState = {
          isAuthenticated: true,
          isOnboardingComplete: isComplete,
          userEmail: profile.email || session.user.email || '',
          userName: profile.full_name || '',
          authMethod: 'email',
        };
        setAuthState(currentAuthState);

        if (profile.onboarding_data && typeof profile.onboarding_data === 'object' && Object.keys(profile.onboarding_data).length > 0) {
          setOnboardingData({ ...defaultOnboardingData, ...profile.onboarding_data });
        }

        const swipedIds = Array.isArray(profile.swiped_job_ids) ? profile.swiped_job_ids : [];
        setSwipedJobIds(swipedIds);
        await AsyncStorage.setItem(SWIPED_JOBS_KEY, JSON.stringify(swipedIds));

        setUserProfile(mapDbToUserProfile(profile, userId));
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(currentAuthState));
      }
    } catch (e) {
      console.log('Exception in fetchAndSetProfile:', e);
      const catchState: AuthState = {
        isAuthenticated: true,
        isOnboardingComplete: false,
        userEmail: session.user.email || '',
        userName: '',
        authMethod: 'email',
      };
      setAuthState(catchState);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(catchState));
    }
  }, []);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    let initialResolved = false;

    const handleSession = async (session: Session, source: string) => {
      console.log('[AUTH] Processing session from:', source, 'user:', session.user.id, 'email:', session.user.email);
      initialResolved = true;
      setSupabaseUserId(session.user.id);
      await fetchAndSetProfile(session.user.id, session);
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] onAuthStateChange event:', event, 'hasSession:', !!session);

      if (event === 'INITIAL_SESSION' && session?.user) {
        await handleSession(session, 'onAuthStateChange-INITIAL_SESSION');
      } else if (event === 'SIGNED_IN' && session?.user) {
        await handleSession(session, 'onAuthStateChange-SIGNED_IN');
      } else if (event === 'INITIAL_SESSION' && !session) {
        console.log('[AUTH] INITIAL_SESSION with no session');
        try {
          const [authStr, onbStr] = await Promise.all([
            AsyncStorage.getItem(AUTH_KEY),
            AsyncStorage.getItem(ONBOARDING_KEY),
          ]);
          if (authStr) {
            const localAuth = JSON.parse(authStr) as AuthState;
            console.log('[AUTH] Loaded local auth state, isAuthenticated:', localAuth.isAuthenticated);
            setAuthState(localAuth);
          } else {
            console.log('[AUTH] No local auth state found');
          }
          if (onbStr) {
            setOnboardingData(JSON.parse(onbStr) as OnboardingData);
          }
        } catch (e) {
          console.log('[AUTH] Error loading local storage:', e);
        }
        if (!initialResolved) {
          initialResolved = true;
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AUTH] Signed out');
        initialResolved = true;
        setSupabaseUserId(null);
        setAuthState(defaultAuthState);
        setOnboardingData(defaultOnboardingData);
        setUserProfile(null);
        await AsyncStorage.multiRemove([AUTH_KEY, ONBOARDING_KEY, SWIPED_JOBS_KEY]);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setSupabaseUserId(session.user.id);
      }
    });

    setTimeout(() => {
      if (!initialResolved) {
        console.log('[AUTH] General timeout reached, forcing loading to false');
        initialResolved = true;
        setIsLoading(false);
      }
    }, 5000);

    return () => subscription.unsubscribe();
  }, [fetchAndSetProfile]);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      console.log('signUpWithEmail called:', email, name);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.log('Supabase signUp error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Sign up failed. Please try again.' };
      }

      console.log('Supabase signUp success, user:', data.user.id);
      setSupabaseUserId(data.user.id);

      const parts = name.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const newProfile = {
        id: data.user.id,
        email,
        full_name: name,
        first_name: firstName,
        last_name: lastName,
        is_onboarding_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase.from('profiles').upsert(newProfile);
      if (profileError) {
        console.log('Profile creation error (non-fatal):', profileError.message);
      }

      const newState: AuthState = {
        isAuthenticated: true,
        isOnboardingComplete: false,
        userEmail: email,
        userName: name,
        authMethod: 'email',
      };
      setAuthState(newState);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newState));
      setOnboardingData({
        ...defaultOnboardingData,
        firstName,
        lastName,
      });

      return { success: true, userId: data.user.id };
    } catch (e: any) {
      console.log('signUpWithEmail exception:', e);
      return { success: false, error: e?.message || 'An unexpected error occurred' };
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('signInWithEmail called:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Supabase signIn error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Sign in failed. Please try again.' };
      }

      console.log('Supabase signIn success, user:', data.user.id);
      return { success: true };
    } catch (e: any) {
      console.log('signInWithEmail exception:', e);
      return { success: false, error: e?.message || 'An unexpected error occurred' };
    }
  }, []);

  const completeOnboarding = useCallback(async (data: OnboardingData) => {
    console.log('completeOnboarding called');
    setOnboardingData(data);
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));

    if (supabaseUserId) {
      try {
        let avatarUrl = data.profilePicture;
        let resumeUrl = data.resumeUri;

        if (data.profilePicture && !data.profilePicture.startsWith('http')) {
          try {
            const ext = data.profilePicture.split('.').pop()?.split('?')[0] || 'jpg';
            const path = `${supabaseUserId}/avatar_${Date.now()}.${ext}`;
            
            const response = await fetch(data.profilePicture);
            const blob = await response.blob();
            
            const { error: uploadError } = await supabase.storage
              .from('profile-pictures')
              .upload(path, blob, {
                contentType: `image/${ext}`,
                upsert: true,
              });
            
            if (!uploadError) {
              avatarUrl = path;
              console.log('Avatar uploaded to profile-pictures:', path);
            } else {
              console.log('Avatar upload error:', uploadError.message);
            }
          } catch (uploadEx) {
            console.log('Avatar upload exception:', uploadEx);
          }
        }

        if (data.resumeUri && !data.resumeUri.startsWith('http')) {
          try {
            const fileName = data.resumeUri.split('/').pop() || 'resume.pdf';
            const path = `${supabaseUserId}/${fileName}`;
            const response = await fetch(data.resumeUri);
            const blob = await response.blob();
            const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
            const { error: uploadErr } = await supabase.storage.from('resumes').upload(path, blob, {
              contentType,
              upsert: true,
            });
            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(path);
              resumeUrl = urlData.publicUrl;
              console.log('Resume uploaded:', resumeUrl);
            } else {
              console.log('Resume upload error:', uploadErr.message);
            }
          } catch (uploadEx) {
            console.log('Resume upload exception:', uploadEx);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email || authState.userEmail;

        const profileData = {
          id: supabaseUserId,
          email: userEmail,
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`.trim(),
          gender: data.gender || null,
          phone: data.phone || null,
          country_code: data.countryCode || null,
          location: data.location || null,
          headline: data.headline || null,
          linkedin_url: data.linkedInUrl || null,
          github_url: data.githubUrl || null,
          avatar_url: avatarUrl || null,
          resume_url: resumeUrl || null,
          skills: data.skills.map(s => s.name),
          work_preferences: data.workPreferences,
          desired_roles: data.desiredRoles,
          salary_currency: data.salaryCurrency,
          salary_min: data.salaryMin,
          salary_max: data.salaryMax,
          preferred_cities: data.preferredCities,
          veteran_status: data.veteranStatus || null,
          disability_status: data.disabilityStatus || null,
          ethnicity: data.ethnicity || null,
          experience: data.workExperience,
          education: data.education,
          work_authorization_status: data.workAuthorizationStatus || null,
          onboarding_data: data,
          is_onboarding_complete: true,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('profiles').upsert(profileData);
        if (error) {
          console.log('Error saving onboarding to Supabase:', error.message);
        } else {
          console.log('Onboarding data saved to Supabase');
        }
      } catch (e) {
        console.log('Exception saving onboarding to Supabase:', e);
      }
    }

    const newState: AuthState = {
      ...authState,
      isOnboardingComplete: true,
      userName: `${data.firstName} ${data.lastName}`.trim(),
    };
    setAuthState(newState);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newState));
  }, [authState, supabaseUserId]);

  const updateOnboardingData = useCallback(async (partial: Partial<OnboardingData>) => {
    const updated = { ...onboardingData, ...partial };
    setOnboardingData(updated);
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(updated));
  }, [onboardingData]);

  const saveProfile = useCallback(async (profileData: Partial<UserProfile>): Promise<boolean> => {
    if (!supabaseUserId) {
      console.log('No Supabase user ID, skipping profile sync');
      return false;
    }

    try {
      const dbData: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (profileData.name !== undefined) dbData.full_name = profileData.name;
      if (profileData.email !== undefined) dbData.email = profileData.email;
      if (profileData.phone !== undefined) dbData.phone = profileData.phone;
      if (profileData.headline !== undefined) dbData.headline = profileData.headline;
      if (profileData.location !== undefined) dbData.location = profileData.location;
      if (profileData.bio !== undefined) dbData.bio = profileData.bio;
      if (profileData.avatar !== undefined) dbData.avatar_url = profileData.avatar;
      if (profileData.linkedinUrl !== undefined) dbData.linkedin_url = profileData.linkedinUrl || null;
      if (profileData.githubUrl !== undefined) dbData.github_url = profileData.githubUrl || null;
      if (profileData.skills !== undefined) dbData.skills = profileData.skills;
      if (profileData.topSkills !== undefined) dbData.top_skills = profileData.topSkills;
      if (profileData.experience !== undefined) dbData.experience = profileData.experience;
      if (profileData.education !== undefined) dbData.education = profileData.education;
      if (profileData.certifications !== undefined) dbData.certifications = profileData.certifications;
      if (profileData.achievements !== undefined) dbData.achievements = profileData.achievements;
      if (profileData.jobPreferences !== undefined) dbData.job_preferences = profileData.jobPreferences;
      if (profileData.workModePreferences !== undefined) dbData.work_mode_preferences = profileData.workModePreferences;
      if (profileData.salaryCurrency !== undefined) dbData.salary_currency = profileData.salaryCurrency;
      if (profileData.salaryMinPref !== undefined) dbData.salary_min = profileData.salaryMinPref;
      if (profileData.salaryMaxPref !== undefined) dbData.salary_max = profileData.salaryMaxPref;
      if (profileData.veteranStatus !== undefined) dbData.veteran_status = profileData.veteranStatus || null;
      if (profileData.disabilityStatus !== undefined) dbData.disability_status = profileData.disabilityStatus || null;
      if (profileData.ethnicity !== undefined) dbData.ethnicity = profileData.ethnicity || null;
      if (profileData.gender !== undefined) dbData.gender = profileData.gender || null;
      if (profileData.coverLetter !== undefined) dbData.cover_letter = profileData.coverLetter || null;
      if (profileData.workAuthorizationStatus !== undefined) dbData.work_authorization_status = profileData.workAuthorizationStatus || null;
      if (profileData.jobRequirements !== undefined) dbData.job_requirements = profileData.jobRequirements || null;
      if (profileData.resumeUrl !== undefined) dbData.resume_url = profileData.resumeUrl || null;
      if (profileData.favoriteCompanies !== undefined) dbData.favorite_companies = profileData.favoriteCompanies;
      if (profileData.desiredRoles !== undefined) dbData.desired_roles = profileData.desiredRoles;
      if (profileData.preferredCities !== undefined) dbData.preferred_cities = profileData.preferredCities;

      const { error } = await supabase.from('profiles').upsert({
        id: supabaseUserId,
        ...dbData,
      });

      if (error) {
        console.log('Error saving profile to Supabase:', error.message);
        return false;
      }

      console.log('Profile synced to Supabase');
      return true;
    } catch (e) {
      console.log('Exception saving profile:', e);
      return false;
    }
  }, [supabaseUserId]);

  const uploadAvatar = useCallback(async (uri: string): Promise<string | null> => {
    if (!supabaseUserId) return null;
    try {
      const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const path = `${supabaseUserId}/avatar_${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage.from('profile-pictures').upload(path, blob, {
        contentType: `image/${ext}`,
        upsert: true,
      });

      if (error) {
        console.log('Avatar upload error:', error.message);
        return null;
      }

      await supabase.from('profiles').upsert({
        id: supabaseUserId,
        avatar_url: path,
        updated_at: new Date().toISOString(),
      });

      console.log('Avatar uploaded to profile-pictures:', path);
      return path;
    } catch (e) {
      console.log('Avatar upload exception:', e);
      return null;
    }
  }, [supabaseUserId]);

  const uploadResume = useCallback(async (uri: string, fileName: string): Promise<string | null> => {
    if (!supabaseUserId) return null;
    try {
      const path = `${supabaseUserId}/${fileName}_${Date.now()}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

      const { error } = await supabase.storage.from('resumes').upload(path, blob, {
        contentType,
        upsert: true,
      });

      if (error) {
        console.log('Resume upload error:', error.message);
        return null;
      }

      const { data } = supabase.storage.from('resumes').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      await supabase.from('profiles').upsert({
        id: supabaseUserId,
        resume_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      console.log('Resume uploaded and profile updated:', publicUrl);
      return publicUrl;
    } catch (e) {
      console.log('Resume upload exception:', e);
      return null;
    }
  }, [supabaseUserId]);

  const addSwipedJobId = useCallback(async (jobId: string) => {
    setSwipedJobIds(prev => {
      if (prev.includes(jobId)) return prev;
      const updated = [...prev, jobId];
      AsyncStorage.setItem(SWIPED_JOBS_KEY, JSON.stringify(updated));
      if (supabaseUserId) {
        supabase.from('profiles').upsert({
          id: supabaseUserId,
          swiped_job_ids: updated,
          updated_at: new Date().toISOString(),
        }).then(({ error }) => {
          if (error) console.log('Error saving swiped job IDs to Supabase:', error.message);
          else console.log('Swiped job IDs synced to Supabase, total:', updated.length);
        });
      }
      return updated;
    });
  }, [supabaseUserId]);

  const logout = useCallback(async () => {
    console.log('logout called');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Supabase signOut error (non-critical):', e);
    }
    await AsyncStorage.multiRemove([AUTH_KEY, ONBOARDING_KEY, SWIPED_JOBS_KEY]);
    setAuthState(defaultAuthState);
    setOnboardingData(defaultOnboardingData);
    setUserProfile(null);
    setSupabaseUserId(null);
    setSwipedJobIds([]);
  }, []);

  const deleteAccount = useCallback(async () => {
    console.log('deleteAccount called');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
      }
    } catch (e) {
      console.log('Delete account error:', e);
    }
    await AsyncStorage.multiRemove([AUTH_KEY, ONBOARDING_KEY, SWIPED_JOBS_KEY]);
    setAuthState(defaultAuthState);
    setOnboardingData(defaultOnboardingData);
    setUserProfile(null);
    setSupabaseUserId(null);
    setSwipedJobIds([]);
  }, []);

  const refetchProfile = useCallback(async () => {
    if (!supabaseUserId) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        await fetchAndSetProfile(supabaseUserId, session.session);
      }
    } catch (e) {
      console.log('Error refetching profile:', e);
    }
  }, [supabaseUserId, fetchAndSetProfile]);

  return {
    ...authState,
    onboardingData,
    userProfile,
    isLoading,
    supabaseUserId,
    swipedJobIds,
    signUpWithEmail,
    signInWithEmail,
    completeOnboarding,
    updateOnboardingData,
    saveProfile,
    uploadAvatar,
    uploadResume,
    addSwipedJobId,
    logout,
    deleteAccount,
    refetchProfile,
  };
});
