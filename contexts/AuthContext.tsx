import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
import { UserProfile } from '@/types';
import { supabase, getProfilePictureUrl } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { getOrCreateProxyEmail } from '@/lib/resend';

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
      ? getProfilePictureUrl(profile.avatar_url)
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
    workdayEmail: profile.workday_email || undefined,
    workdayPassword: profile.workday_password || undefined,
    jobleverEmail: profile.joblever_email || undefined,
    jobleverPassword: profile.joblever_password || undefined,
    greenhouseEmail: profile.greenhouse_email || undefined,
    greenhousePassword: profile.greenhouse_password || undefined,
    taleoEmail: profile.taleo_email || undefined,
    taleoPassword: profile.taleo_password || undefined,
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
      if (__DEV__) console.log('[AUTH] fetchAndSetProfile for userId:', userId);
      
      // Clear previous user data first to prevent data leakage
      if (__DEV__) console.log('[AUTH] Clearing previous user data before fetching new profile');
      setUserProfile(null);
      setOnboardingData(defaultOnboardingData);
      setSwipedJobIds([]);
      
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
        if (__DEV__) console.log('No profile found, creating new one for user:', userId);
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        const parts = name.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        // Create proxy email and use it as the profile email
        const proxyEmail = await getOrCreateProxyEmail(userId, name);
        const profileEmail = proxyEmail || session.user.email || '';
        if (__DEV__) console.log('[AUTH] Proxy email for new profile:', profileEmail);

        const newProfile = {
          id: userId,
          email: profileEmail,
          full_name: name,
          first_name: firstName,
          last_name: lastName,
          is_onboarding_complete: false,
          applications_remaining: 40,
          applications_limit: 40,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(newProfile);

        const newAuthState: AuthState = {
          isAuthenticated: true,
          isOnboardingComplete: false,
          userEmail: profileEmail,
          userName: name,
          authMethod: 'email',
        };
        setAuthState(newAuthState);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newAuthState));
        
        setUserProfile(mapDbToUserProfile(newProfile, userId));

        const freshOnboardingData = {
          ...defaultOnboardingData,
          firstName,
          lastName,
        };
        setOnboardingData(freshOnboardingData);
        await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(freshOnboardingData));
        if (__DEV__) console.log('New user profile created, isOnboardingComplete: false');
        return;
      }

      if (error) {
        if (__DEV__) console.log('Error fetching profile (non-fatal):', error.message);
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
      if (__DEV__) console.log('Exception in fetchAndSetProfile:', e);
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
      if (__DEV__) console.log('[AUTH] Processing session from:', source, 'user:', session.user.id, 'email:', session.user.email);
      initialResolved = true;
      setSupabaseUserId(session.user.id);
      await fetchAndSetProfile(session.user.id, session);
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__) console.log('[AUTH] onAuthStateChange event:', event, 'hasSession:', !!session);

      if (event === 'INITIAL_SESSION' && session?.user) {
        await handleSession(session, 'onAuthStateChange-INITIAL_SESSION');
      } else if (event === 'SIGNED_IN' && session?.user) {
        await handleSession(session, 'onAuthStateChange-SIGNED_IN');
      } else if (event === 'INITIAL_SESSION' && !session) {
        if (__DEV__) console.log('[AUTH] INITIAL_SESSION with no session, clearing stale data');
        try {
          await AsyncStorage.multiRemove([AUTH_KEY, ONBOARDING_KEY, SWIPED_JOBS_KEY]);
        } catch (e) {
          if (__DEV__) console.log('[AUTH] Error clearing storage:', e);
        }
        if (!initialResolved) {
          initialResolved = true;
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (__DEV__) console.log('[AUTH] Signed out');
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
        if (__DEV__) console.log('[AUTH] General timeout reached, forcing loading to false');
        initialResolved = true;
        setIsLoading(false);
      }
    }, 5000);

    return () => subscription.unsubscribe();
  }, [fetchAndSetProfile]);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      if (__DEV__) console.log('signUpWithEmail called:', email, name);

      // Clear any existing user data before signing up
      if (__DEV__) console.log('[AUTH] Clearing previous user data before signup');
      setUserProfile(null);
      setOnboardingData(defaultOnboardingData);
      setSwipedJobIds([]);
      await AsyncStorage.multiRemove([ONBOARDING_KEY, SWIPED_JOBS_KEY]);

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
        if (__DEV__) console.log('Supabase signUp error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Sign up failed. Please try again.' };
      }

      if (__DEV__) console.log('Supabase signUp success, user:', data.user.id);
      setSupabaseUserId(data.user.id);

      // Create proxy email and use it as the profile email
      const proxyEmail = await getOrCreateProxyEmail(data.user.id, name);
      const profileEmail = proxyEmail || email;
      if (__DEV__) console.log('[AUTH] Proxy email for profile:', profileEmail);

      const parts = name.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const newProfile = {
        id: data.user.id,
        email: profileEmail,
        full_name: name,
        first_name: firstName,
        last_name: lastName,
        is_onboarding_complete: false,
        applications_remaining: 40,
        applications_limit: 40,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase.from('profiles').upsert(newProfile);
      if (profileError) {
        if (__DEV__) console.log('Profile creation error (non-fatal):', profileError.message);
      }

      const newState: AuthState = {
        isAuthenticated: true,
        isOnboardingComplete: false,
        userEmail: profileEmail,
        userName: name,
        authMethod: 'email',
      };
      setAuthState(newState);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newState));

      setUserProfile(mapDbToUserProfile(newProfile, data.user.id));
      
      const freshOnboardingData = {
        ...defaultOnboardingData,
        firstName,
        lastName,
      };
      setOnboardingData(freshOnboardingData);
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(freshOnboardingData));

      return { success: true, userId: data.user.id };
    } catch (e: any) {
      if (__DEV__) console.log('signUpWithEmail exception:', e);
      return { success: false, error: e?.message || 'An unexpected error occurred' };
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (__DEV__) console.log('signInWithEmail called:', email);

      // Clear any existing user data before signing in
      if (__DEV__) console.log('[AUTH] Clearing previous user data before signin');
      setUserProfile(null);
      setOnboardingData(defaultOnboardingData);
      setSwipedJobIds([]);
      await AsyncStorage.multiRemove([ONBOARDING_KEY, SWIPED_JOBS_KEY]);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (__DEV__) console.log('Supabase signIn error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Sign in failed. Please try again.' };
      }

      if (__DEV__) console.log('Supabase signIn success, user:', data.user.id);
      return { success: true };
    } catch (e: any) {
      if (__DEV__) console.log('signInWithEmail exception:', e);
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
              if (__DEV__) console.log('Avatar uploaded to profile-pictures:', path);
            } else {
              if (__DEV__) console.log('Avatar upload error:', uploadError.message);
            }
          } catch (uploadEx) {
            if (__DEV__) console.log('Avatar upload exception:', uploadEx);
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
              if (__DEV__) console.log('Resume uploaded:', resumeUrl);
            } else {
              if (__DEV__) console.log('Resume upload error:', uploadErr.message);
            }
          } catch (uploadEx) {
            if (__DEV__) console.log('Resume upload exception:', uploadEx);
          }
        }

        // Use the proxy email already stored in the profile, not the auth email
        const profileEmail = userProfile?.email || authState.userEmail;

        const profileData = {
          id: supabaseUserId,
          email: profileEmail,
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
          if (__DEV__) console.log('Error saving onboarding to Supabase:', error.message);
        } else {
          if (__DEV__) console.log('Onboarding data saved to Supabase');
          setUserProfile(mapDbToUserProfile(profileData, supabaseUserId));
        }

        // Send welcome email via Resend directly (works on all platforms)
        try {
          const userName = `${data.firstName} ${data.lastName}`.trim();
          if (__DEV__) console.log('Sending welcome email to:', profileEmail, 'for user:', userName);
          
          const { sendEmailViaResend } = await import('@/lib/resend');
          const sent = await sendEmailViaResend(
            `NextQuark <welcome@nextquark.in>`,
            profileEmail,
            `Welcome to NextQuark, ${userName}!`,
            `Hi ${userName},\n\nWelcome to NextQuark! Your profile is set up and you're ready to start swiping on jobs.\n\nSwipe right to apply, left to pass, and up to save for later.\n\nGood luck with your job search!\n\n— The NextQuark Team`,
            supabaseUserId,
          );
          
          if (sent) {
            if (__DEV__) console.log('Welcome email sent successfully');
          } else {
            if (__DEV__) console.log('Failed to send welcome email');
          }
        } catch (emailError) {
          if (__DEV__) console.log('Error sending welcome email (non-critical):', emailError);
        }
      } catch (e) {
        if (__DEV__) console.log('Exception saving onboarding to Supabase:', e);
      }
    }

    const newState: AuthState = {
      ...authState,
      isOnboardingComplete: true,
      userName: `${data.firstName} ${data.lastName}`.trim(),
    };
    setAuthState(newState);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newState));
  }, [authState, supabaseUserId, userProfile]);

  const updateOnboardingData = useCallback(async (partial: Partial<OnboardingData>) => {
    const updated = { ...onboardingData, ...partial };
    setOnboardingData(updated);
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(updated));
  }, [onboardingData]);

  const saveProfile = useCallback(async (profileData: Partial<UserProfile>): Promise<boolean> => {
    if (!supabaseUserId) {
      if (__DEV__) console.log('No Supabase user ID, skipping profile sync');
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
      if (profileData.workdayEmail !== undefined) dbData.workday_email = profileData.workdayEmail || null;
      if (profileData.workdayPassword !== undefined) dbData.workday_password = profileData.workdayPassword || null;
      if (profileData.jobleverEmail !== undefined) dbData.joblever_email = profileData.jobleverEmail || null;
      if (profileData.jobleverPassword !== undefined) dbData.joblever_password = profileData.jobleverPassword || null;
      if (profileData.greenhouseEmail !== undefined) dbData.greenhouse_email = profileData.greenhouseEmail || null;
      if (profileData.greenhousePassword !== undefined) dbData.greenhouse_password = profileData.greenhousePassword || null;
      if (profileData.taleoEmail !== undefined) dbData.taleo_email = profileData.taleoEmail || null;
      if (profileData.taleoPassword !== undefined) dbData.taleo_password = profileData.taleoPassword || null;

      const { error } = await supabase.from('profiles').upsert({
        id: supabaseUserId,
        ...dbData,
      });

      if (error) {
        if (__DEV__) console.log('Error saving profile to Supabase:', error.message);
        return false;
      }

      if (__DEV__) console.log('Profile synced to Supabase');
      return true;
    } catch (e) {
      if (__DEV__) console.log('Exception saving profile:', e);
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
        if (__DEV__) console.log('Avatar upload error:', error.message);
        return null;
      }

      await supabase.from('profiles').upsert({
        id: supabaseUserId,
        avatar_url: path,
        updated_at: new Date().toISOString(),
      });

      if (__DEV__) console.log('Avatar uploaded to profile-pictures:', path);
      return path;
    } catch (e) {
      if (__DEV__) console.log('Avatar upload exception:', e);
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
        if (__DEV__) console.log('Resume upload error:', error.message);
        return null;
      }

      const { data } = supabase.storage.from('resumes').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      await supabase.from('profiles').upsert({
        id: supabaseUserId,
        resume_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      if (__DEV__) console.log('Resume uploaded and profile updated:', publicUrl);
      return publicUrl;
    } catch (e) {
      if (__DEV__) console.log('Resume upload exception:', e);
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
      if (__DEV__) console.log('Supabase signOut error (non-critical):', e);
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
      // Delete profile data from Supabase (RLS allows users to delete their own row)
      if (supabaseUserId) {
        await supabase.from('profiles').delete().eq('id', supabaseUserId);
      }
      // Sign out (admin.deleteUser doesn't work from client-side anon key)
      await supabase.auth.signOut();
    } catch (e) {
      if (__DEV__) console.log('Delete account error:', e);
    }
    await AsyncStorage.multiRemove([AUTH_KEY, ONBOARDING_KEY, SWIPED_JOBS_KEY]);
    setAuthState(defaultAuthState);
    setOnboardingData(defaultOnboardingData);
    setUserProfile(null);
    setSupabaseUserId(null);
    setSwipedJobIds([]);
  }, [supabaseUserId]);

  const refetchProfile = useCallback(async () => {
    if (!supabaseUserId) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        await fetchAndSetProfile(supabaseUserId, session.session);
      }
    } catch (e) {
      if (__DEV__) console.log('Error refetching profile:', e);
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
