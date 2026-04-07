import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, Alert, ScrollView } from 'react-native';
import { Upload, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import { StepProps } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getStorageUploadUrl, getStorageUrl } from '@/lib/supabase';
import { extractAndParsePdf } from '@/lib/resume-parser/pdf-reader';
import { parseResumeFromText, mapToOnboardingData } from '@/lib/resume-parser';
import { sanitizeParsedData } from '@/lib/resume-parser/sanitize';

const LOG_PREFIX = '[RESUME-PARSER]';

export default function StepResume({ data, onUpdate, onNext }: StepProps) {
  const { supabaseUserId } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('Resume.pdf');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handlePickDocument = async () => {
    if (!supabaseUserId) {
      Alert.alert('Error', 'Please sign in to upload a resume.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log(LOG_PREFIX, '📄 File picked:', { name: asset.name, size: asset.size, mimeType: asset.mimeType });

        if (asset.size && asset.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 5MB.');
          return;
        }

        setFileName(asset.name || 'Resume.pdf');
        setUploading(true);
        setUploadProgress(0);
        
        const interval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const fileExt = asset.name.split('.').pop();
        const uploadFileName = `${Date.now()}.${fileExt}`;
        const filePath = `${supabaseUserId}/${uploadFileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'application/pdf',
          name: uploadFileName,
        } as any);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          clearInterval(interval);
          setUploading(false);
          Alert.alert('Error', 'Authentication required. Please sign in again.');
          return;
        }

        const uploadUrl = getStorageUploadUrl('resumes', filePath);
        console.log(LOG_PREFIX, '⬆️ Uploading to Supabase storage:', filePath);
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          clearInterval(interval);
          setUploading(false);
          console.log(LOG_PREFIX, '❌ Upload failed:', response.status);
          Alert.alert('Upload Failed', 'Could not upload resume. Please try again.');
          return;
        }
        console.log(LOG_PREFIX, '✅ Upload successful');

        let parsedData: Record<string, any> = {};
        try {
          console.log(LOG_PREFIX, '🔍 Starting hybrid PDF parsing...');
          const result = await extractAndParsePdf(asset.uri);

          if (result.method === 'gemini' && result.geminiData) {
            console.log(LOG_PREFIX, '🤖 Using Gemini-parsed data');
            parsedData = result.geminiData;
          } else if (result.rawText && result.rawText.trim().length > 20) {
            console.log(LOG_PREFIX, '🔧 Gemini unavailable, using regex fallback');
            const parsed = parseResumeFromText(result.rawText);
            parsedData = mapToOnboardingData(parsed);
          } else {
            console.log(LOG_PREFIX, '⚠️ No usable data from PDF');
          }

          if (Object.keys(parsedData).length > 0) {
            console.log(LOG_PREFIX, '🔎 Running sanity check on parsed data...');
            parsedData = sanitizeParsedData(parsedData);
          }

          console.log(LOG_PREFIX, '📋 Final parsed data:');
          console.log(LOG_PREFIX, '  → method:', result.method);
          console.log(LOG_PREFIX, '  → firstName:', parsedData.firstName);
          console.log(LOG_PREFIX, '  → lastName:', parsedData.lastName);
          console.log(LOG_PREFIX, '  → phone:', parsedData.phone);
          console.log(LOG_PREFIX, '  → location:', parsedData.location);
          console.log(LOG_PREFIX, '  → headline:', parsedData.headline);
          console.log(LOG_PREFIX, '  → linkedInUrl:', parsedData.linkedInUrl);
          console.log(LOG_PREFIX, '  → githubUrl:', parsedData.githubUrl);
          console.log(LOG_PREFIX, '  → experienceLevel:', parsedData.experienceLevel);
          console.log(LOG_PREFIX, '  → workExperience:', parsedData.workExperience?.length);
          console.log(LOG_PREFIX, '  → education:', parsedData.education?.length);
          console.log(LOG_PREFIX, '  → skills:', parsedData.skills?.length);
          console.log(LOG_PREFIX, '  → projects:', parsedData.projects?.length);
          console.log(LOG_PREFIX, '  → certifications:', parsedData.certifications?.length);
          console.log(LOG_PREFIX, '  → achievements:', parsedData.achievements?.length);
        } catch (parseError) {
          console.log(LOG_PREFIX, '❌ Resume parse error (non-fatal):', parseError);
        }

        if (supabaseUserId && Object.keys(parsedData).length > 0) {
          try {
            console.log(LOG_PREFIX, '💾 Saving parsed data to Supabase immediately...');
            const skills = Array.isArray(parsedData.skills)
              ? parsedData.skills.map((s: any) => typeof s === 'string' ? s : s.name)
              : [];

            const ts = Date.now();
            const profileExperience = (parsedData.workExperience || []).map((w: any, i: number) => ({
              id: w.id || `e${ts}${i}`,
              title: w.title || '',
              company: w.company || '',
              employmentType: w.employmentType || 'Full-time',
              workMode: w.workMode || 'Onsite',
              jobLocation: w.jobLocation || w.location || '',
              isCurrent: w.isCurrent || false,
              startDate: w.startDate || '',
              endDate: w.isCurrent ? null : (w.endDate || ''),
              description: w.description || '',
              skills: w.skills || [],
            }));

            const profileEducation = (parsedData.education || []).map((e: any, i: number) => ({
              id: e.id || `ed${ts}${i}`,
              institution: e.institution || '',
              degree: e.degree || '',
              field: e.field || '',
              startDate: e.startDate || e.startYear || '',
              endDate: e.endDate || e.endYear || '',
              description: e.description || undefined,
              achievements: e.achievements || undefined,
              extracurriculars: e.extracurriculars || undefined,
            }));

            const profileProjects = (parsedData.projects || []).map((p: any, i: number) => ({
              id: p.id || `proj${ts}${i}`,
              title: p.title || '',
              organization: p.organization || '',
              date: p.date || '',
              exposure: Array.isArray(p.exposure) ? p.exposure : [],
              bullets: Array.isArray(p.bullets) ? p.bullets : [],
              link: p.link || '',
            }));

            const profileCertifications = (parsedData.certifications || []).map((c: any, i: number) => ({
              id: c.id || `cert${ts}${i}`,
              name: c.name || '',
              issuingOrganization: c.issuingOrganization || '',
              credentialUrl: c.credentialUrl || '',
              skills: c.skills || [],
            }));

            const profileAchievements = (parsedData.achievements || []).map((a: any, i: number) => ({
              id: a.id || `ach${ts}${i}`,
              title: a.title || '',
              issuer: a.issuer || '',
              date: a.date || '',
              description: a.description || '',
            }));

            const profileUpdate: Record<string, any> = {
              id: supabaseUserId,
              updated_at: new Date().toISOString(),
            };
            if (parsedData.firstName || parsedData.lastName) {
              profileUpdate.first_name = parsedData.firstName || null;
              profileUpdate.last_name = parsedData.lastName || null;
              profileUpdate.full_name = `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim() || null;
            }
            if (parsedData.phone) profileUpdate.phone = parsedData.phone;
            if (parsedData.location) profileUpdate.location = parsedData.location;
            if (parsedData.headline) profileUpdate.headline = parsedData.headline;
            if (parsedData.linkedInUrl) profileUpdate.linkedin_url = parsedData.linkedInUrl;
            if (parsedData.githubUrl) profileUpdate.github_url = parsedData.githubUrl;
            if (parsedData.experienceLevel) profileUpdate.experience_level = parsedData.experienceLevel;
            if (skills.length > 0) profileUpdate.skills = skills;
            if (profileExperience.length > 0) profileUpdate.experience = profileExperience;
            if (profileEducation.length > 0) profileUpdate.education = profileEducation;
            if (profileProjects.length > 0) profileUpdate.projects = profileProjects;
            if (profileCertifications.length > 0) profileUpdate.certifications = profileCertifications;
            if (profileAchievements.length > 0) profileUpdate.achievements = profileAchievements;

            const { error: saveError } = await supabase.from('profiles').upsert(profileUpdate);
            if (saveError) {
              console.log(LOG_PREFIX, '⚠️ Supabase save error (non-fatal):', saveError.message);
            } else {
              console.log(LOG_PREFIX, '✅ Parsed data saved to Supabase profile');
              console.log(LOG_PREFIX, '  → experience:', profileExperience.length);
              console.log(LOG_PREFIX, '  → education:', profileEducation.length);
              console.log(LOG_PREFIX, '  → projects:', profileProjects.length);
              console.log(LOG_PREFIX, '  → certifications:', profileCertifications.length);
              console.log(LOG_PREFIX, '  → achievements:', profileAchievements.length);
              console.log(LOG_PREFIX, '  → skills:', skills.length);
            }
          } catch (saveErr) {
            console.log(LOG_PREFIX, '⚠️ Supabase save exception (non-fatal):', saveErr);
          }
        }

        clearInterval(interval);
        setUploadProgress(100);
        Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
        setTimeout(() => {
          setUploading(false);
          console.log(LOG_PREFIX, '✅ Updating local onboarding data with parsed resume fields');
          onUpdate({ resumeUri: uploadFileName, ...parsedData });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 500);
      }
    } catch (e) {
      console.log(LOG_PREFIX, '❌ Document picker error:', e);
      setUploading(false);
      Alert.alert('Error', 'Could not pick document. Please try again.');
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const handleUserTypeSelect = (type: 'fresher' | 'job_switch') => {
    onUpdate({ userType: data.userType === type ? '' : type });
  };

  const handleReupload = async () => {
    if (!supabaseUserId) return;

    if (data.resumeUri) {
      const filePath = `${supabaseUserId}/${data.resumeUri}`;
      console.log(LOG_PREFIX, '🗑️ Deleting old resume from storage:', filePath);
      try {
        const { error } = await supabase.storage.from('resumes').remove([filePath]);
        if (error) {
          console.log(LOG_PREFIX, '⚠️ Storage delete error (non-fatal):', error.message);
        } else {
          console.log(LOG_PREFIX, '✅ Old resume deleted from storage');
        }
      } catch (e) {
        console.log(LOG_PREFIX, '⚠️ Storage delete exception (non-fatal):', e);
      }
    }

    console.log(LOG_PREFIX, '🗑️ Clearing parsed data from Supabase profiles table...');
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: null, last_name: null, full_name: null,
        phone: null, location: null, headline: null,
        linkedin_url: null, github_url: null, resume_url: null,
        experience_level: null, skills: [], experience: [],
        education: [], projects: [], certifications: [],
        achievements: [], desired_roles: [], desired_role_categories: [],
        updated_at: new Date().toISOString(),
      }).eq('id', supabaseUserId);
      if (error) {
        console.log(LOG_PREFIX, '⚠️ Profile clear error (non-fatal):', error.message);
      } else {
        console.log(LOG_PREFIX, '✅ Parsed data cleared from Supabase profile');
      }
    } catch (e) {
      console.log(LOG_PREFIX, '⚠️ Profile clear exception (non-fatal):', e);
    }

    console.log(LOG_PREFIX, '🔄 Clearing local onboarding data for re-upload');
    onUpdate({
      resumeUri: null, firstName: '', lastName: '', phone: '',
      location: '', headline: '', linkedInUrl: '', githubUrl: '',
      workExperience: [], education: [], skills: [],
      experienceLevel: '', projects: [], certifications: [],
      achievements: [], desiredRoles: [], desiredRoleCategories: [],
    });
  };

  const renderUserTypeSelector = () => (
    <View style={styles.userTypeSection}>
      <Text style={styles.sectionHeader}>WHAT DESCRIBES YOU BEST?</Text>
      <View style={styles.groupedCard}>
        <Pressable
          style={[styles.userTypeRow, styles.rowBorder]}
          onPress={() => handleUserTypeSelect('fresher')}
        >
          <Text style={styles.rowEmoji}>🎓</Text>
          <View style={styles.userTypeInfo}>
            <Text style={styles.userTypeLabel}>Fresher</Text>
            <Text style={styles.userTypeDesc}>New to the workforce</Text>
          </View>
          <View style={[styles.radio, data.userType === 'fresher' && styles.radioSelected]}>
            {data.userType === 'fresher' && <View style={styles.radioDot} />}
          </View>
        </Pressable>
        <Pressable
          style={styles.userTypeRow}
          onPress={() => handleUserTypeSelect('job_switch')}
        >
          <Text style={styles.rowEmoji}>🔄</Text>
          <View style={styles.userTypeInfo}>
            <Text style={styles.userTypeLabel}>Job Switch</Text>
            <Text style={styles.userTypeDesc}>Looking for a change</Text>
          </View>
          <View style={[styles.radio, data.userType === 'job_switch' && styles.radioSelected]}>
            {data.userType === 'job_switch' && <View style={styles.radioDot} />}
          </View>
        </Pressable>
      </View>
    </View>
  );

  if (uploading) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.centerContent}>
          <Text style={styles.processingEmoji}>⚙️</Text>
          <Text style={styles.processingTitle}>Analyzing your resume</Text>
          <Text style={styles.processingSubtitle}>This may take a moment...</Text>

          <View style={styles.fileCard}>
            <FileText size={20} color="#007AFF" />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{fileName}</Text>
              <Text style={styles.fileSize}>Processing...</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>

          <View style={styles.stepsContainer}>
            <View style={styles.stepRow}>
              <Text style={styles.stepIcon}>{uploadProgress > 30 ? '✅' : '🔍'}</Text>
              <Text style={styles.stepText}>Extracting skills</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepIcon}>{uploadProgress > 60 ? '✅' : '📊'}</Text>
              <Text style={styles.stepText}>Matching with profile</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepIcon}>{uploadProgress > 90 ? '✅' : '✨'}</Text>
              <Text style={styles.stepText}>Enhancing details</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (data.resumeUri) {
    const pdfUrl = supabaseUserId
      ? getStorageUrl('resumes', `${supabaseUserId}/${data.resumeUri}`)
      : '';
    const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;

    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.previewTitle}>Your Resume</Text>
        <View style={styles.resumeWebViewContainer}>
          <WebView
            source={{ uri: viewerUrl }}
            style={styles.resumeWebView}
            startInLoadingState
            scalesPageToFit
          />
        </View>
        {renderUserTypeSelector()}
        <Pressable style={styles.nextButton} onPress={onNext} testID="next-button">
          <Text style={styles.nextButtonText}>Looks Good!</Text>
        </Pressable>
        <Pressable style={styles.reuploadButton} onPress={handleReupload}>
          <Text style={styles.reuploadText}>Upload a different resume</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Upload your resume</Text>
          <Text style={styles.subtitle}>We'll auto-fill your profile details from it</Text>

          <Pressable style={styles.uploadArea} onPress={handlePickDocument}>
            <View style={styles.uploadInner}>
              <View style={styles.uploadIconWrap}>
                <Upload size={28} color="#007AFF" />
              </View>
              <Text style={styles.uploadText}>Tap to upload</Text>
              <Text style={styles.uploadFormats}>PDF, DOC, DOCX · Max 5MB</Text>
            </View>
          </Pressable>

          {renderUserTypeSelector()}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 16 },
  scrollView: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 20 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 32 },
  uploadArea: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed',
    borderRadius: 16, padding: 36, marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  uploadInner: { alignItems: 'center', gap: 10 },
  uploadIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  uploadText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  uploadFormats: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  processingEmoji: { fontSize: 48, marginBottom: 16 },
  processingTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  processingSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 28 },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16,
    width: '100%', marginBottom: 20,
  },
  fileInfo: { flex: 1 },
  fileName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  fileSize: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  progressBarBg: {
    width: '100%', height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 8,
  },
  progressBarFill: { height: 4, borderRadius: 2, backgroundColor: '#007AFF' },
  progressText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 28 },
  stepsContainer: { gap: 16, alignSelf: 'flex-start', width: '100%', paddingHorizontal: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { fontSize: 18 },
  stepText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  nextButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  reuploadButton: { alignItems: 'center', paddingVertical: 14 },
  reuploadText: { color: '#007AFF', fontSize: 15 },
  previewTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 12, marginBottom: 12 },
  resumeWebViewContainer: { flex: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  resumeWebView: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  userTypeSection: { marginTop: 8 },
  sectionHeader: {
    fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5, marginBottom: 8, marginLeft: 4,
  },
  groupedCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  userTypeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  rowEmoji: { fontSize: 22, marginRight: 14 },
  userTypeInfo: { flex: 1 },
  userTypeLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  userTypeDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
});
