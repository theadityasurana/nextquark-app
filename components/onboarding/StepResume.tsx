import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, Alert, ScrollView } from 'react-native';
import { Upload, FileText, Camera, Crown, Zap } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { StepProps } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getStorageUploadUrl } from '@/lib/supabase';

type UserType = 'fresher' | 'job_switch' | null;

export default function StepResume({ data, onUpdate, onNext }: StepProps) {
  const { supabaseUserId } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('Resume.pdf');
  const [userType, setUserType] = useState<UserType>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const simulateProcessing = (name: string) => {
    setFileName(name);
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const next = prev + Math.random() * 20;
        if (next >= 100) {
          clearInterval(interval);
          Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
          setTimeout(() => {
            setUploading(false);
            onUpdate({ resumeUri: name });
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 500);
          return 100;
        }
        Animated.timing(progressAnim, { toValue: next / 100, duration: 200, useNativeDriver: false }).start();
        return next;
      });
    }, 300);
  };

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
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          clearInterval(interval);
          setUploading(false);
          Alert.alert('Upload Failed', 'Could not upload resume. Please try again.');
          return;
        }

        let parsedData = {};
        try {
          const fileResponse = await fetch(asset.uri);
          const fileBlob = await fileResponse.blob();
          const reader = new FileReader();
          
          const base64Promise = new Promise((resolve) => {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(fileBlob);
          });

          const base64 = await base64Promise;
          
          const geminiResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBPoWkh6Y-WHAqXq__TTOlPyk23dMpNsx4',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: 'Extract resume data as JSON: {"firstName":"","lastName":"","phone":"","location":"","headline":"","linkedInUrl":"","workExperience":[{"id":"1","title":"","company":"","employmentType":"Full-time","location":"","isRemote":false,"startMonth":"","startYear":"","endMonth":"","endYear":"","isCurrent":false,"description":""}],"education":[{"id":"1","institution":"","degree":"","field":"","startYear":"","endYear":""}],"skills":[{"name":"","level":"intermediate","yearsOfExperience":2}]}. Return only JSON.' },
                    { inline_data: { mime_type: asset.mimeType || 'application/pdf', data: base64 } }
                  ]
                }]
              })
            }
          );

          const geminiData = await geminiResponse.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.log('Parse error:', parseError);
        }

        clearInterval(interval);
        setUploadProgress(100);
        Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
        setTimeout(() => {
          setUploading(false);
          onUpdate({ resumeUri: uploadFileName, ...parsedData });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 500);
      }
    } catch (e) {
      console.log('Document picker error:', e);
      setUploading(false);
      Alert.alert('Error', 'Could not pick document. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    Alert.alert('Photo Upload', 'Please use the document picker to upload your resume as a PDF or document file.');
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const renderUserTypeSelector = () => (
    <View style={styles.userTypeSection}>
      <Text style={styles.userTypeTitle}>What describes you best?</Text>
      <View style={styles.userTypeRow}>
        <Pressable
          style={[styles.userTypeOption, userType === 'fresher' && styles.userTypeSelected]}
          onPress={() => setUserType('fresher')}
        >
          <Text style={styles.userTypeEmoji}>🎓</Text>
          <Text style={[styles.userTypeLabel, userType === 'fresher' && styles.userTypeLabelSelected]}>Fresher</Text>
          <Text style={styles.userTypeDesc}>New to the workforce</Text>
        </Pressable>
        <Pressable
          style={[styles.userTypeOption, userType === 'job_switch' && styles.userTypeSelected]}
          onPress={() => setUserType('job_switch')}
        >
          <Text style={styles.userTypeEmoji}>🔄</Text>
          <Text style={[styles.userTypeLabel, userType === 'job_switch' && styles.userTypeLabelSelected]}>Job Switch</Text>
          <Text style={styles.userTypeDesc}>Looking for a change</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPremiumUpsell = () => {
    if (userType !== 'job_switch') return null;
    return (
      <View style={styles.upsellSection}>
        <Text style={styles.upsellTitle}>⚡ Supercharge your job switch</Text>
        <Text style={styles.upsellSubtitle}>Get more swipes and land your dream role faster</Text>

        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Zap size={18} color="#FFD700" />
            <Text style={styles.planName}>Pro</Text>
          </View>
          <Text style={styles.planBenefit}>+200 extra swipes/month</Text>
          <Text style={styles.planExtra}>AI auto-fill • Priority support</Text>
        </View>

        <View style={[styles.planCard, styles.planCardHighlight]}>
          <View style={styles.planHeader}>
            <Crown size={18} color="#FFD700" />
            <Text style={styles.planName}>Premium</Text>
            <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>Best Value</Text></View>
          </View>
          <Text style={styles.planBenefit}>+500 extra swipes/month</Text>
          <Text style={styles.planExtra}>Everything in Pro • Profile boost • Smart matching</Text>
        </View>

        <Pressable style={styles.upgradeButton} onPress={() => router.push('/premium?from=onboarding')}>
          <Crown size={18} color="#000000" />
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </Pressable>
      </View>
    );
  };

  if (uploading) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.centerContent}>
          <Text style={styles.processingEmoji}>⚙️</Text>
          <Text style={styles.processingTitle}>Analyzing your resume...</Text>
          <View style={styles.fileCard}>
            <FileText size={20} color="#FFFFFF" />
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
            <View style={styles.stepRow}><Text style={styles.stepIcon}>{uploadProgress > 30 ? '✅' : '🔍'}</Text><Text style={styles.stepText}>Extracting skills</Text></View>
            <View style={styles.stepRow}><Text style={styles.stepIcon}>{uploadProgress > 60 ? '✅' : '📊'}</Text><Text style={styles.stepText}>Matching with profile</Text></View>
            <View style={styles.stepRow}><Text style={styles.stepIcon}>{uploadProgress > 90 ? '✅' : '✨'}</Text><Text style={styles.stepText}>Enhancing details</Text></View>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (data.resumeUri) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.mainTitle}>Resume uploaded!</Text>
            <Text style={styles.subtitle}>Your profile has been enhanced</Text>
            <View style={styles.fileCard}>
              <FileText size={20} color="#10B981" />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{data.resumeUri}</Text>
                <Text style={[styles.fileSize, { color: '#10B981' }]}>Processed ✓</Text>
              </View>
            </View>
            {renderUserTypeSelector()}
            {renderPremiumUpsell()}
          </View>
        </ScrollView>
        <Pressable style={styles.nextButton} onPress={onNext} testID="next-button">
          <Text style={styles.nextButtonText}>Looks Good! →</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.titleEmoji}>📄</Text>
            <Text style={styles.mainTitle}>Upload your resume</Text>
          </View>
          <Text style={styles.subtitle}>Upload your resume and we'll auto-fill your profile details</Text>

          <View style={styles.autofillInfoCard}>
            <View style={styles.autofillRow}>
              <Text style={styles.autofillIcon}>✨</Text>
              <Text style={styles.autofillText}>Auto-fills work experience</Text>
            </View>
            <View style={styles.autofillRow}>
              <Text style={styles.autofillIcon}>🎓</Text>
              <Text style={styles.autofillText}>Auto-fills education details</Text>
            </View>
            <View style={styles.autofillRow}>
              <Text style={styles.autofillIcon}>⚡</Text>
              <Text style={styles.autofillText}>Extracts skills automatically</Text>
            </View>
            <View style={styles.autofillRow}>
              <Text style={styles.autofillIcon}>🚀</Text>
              <Text style={styles.autofillText}>Saves you 10+ minutes of typing</Text>
            </View>
          </View>
          <Pressable style={styles.uploadArea} onPress={handlePickDocument}>
            <View style={styles.uploadInner}>
              <Upload size={32} color="#9E9E9E" />
              <Text style={styles.uploadText}>Tap to upload your resume</Text>
              <Text style={styles.uploadFormats}>PDF, DOC, DOCX • Max 10MB</Text>
            </View>
          </Pressable>
          <Pressable style={styles.photoButton} onPress={handleTakePhoto}>
            <Camera size={18} color="#FFFFFF" />
            <Text style={styles.photoButtonText}>Take Photo of Resume</Text>
          </Pressable>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Uploading a resume boosts your profile strength by 15%</Text>
          </View>

          {renderUserTypeSelector()}
          {renderPremiumUpsell()}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  scrollView: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 20 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  titleEmoji: { fontSize: 28 },
  emoji: { fontSize: 48, marginBottom: 16 },
  mainTitle: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', marginBottom: 8, flex: 1 },
  subtitle: { fontSize: 15, color: '#9E9E9E', marginBottom: 32, lineHeight: 22 },
  uploadArea: {
    borderWidth: 2, borderColor: '#333333', borderStyle: 'dashed',
    borderRadius: 18, padding: 32, marginBottom: 20,
  },
  uploadInner: { alignItems: 'center', gap: 12 },
  uploadText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
  uploadFormats: { color: '#9E9E9E', fontSize: 12 },
  photoButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#333333',
  },
  photoButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
  autofillInfoCard: {
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#333333',
  },
  autofillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  autofillIcon: { fontSize: 16 },
  autofillText: { fontSize: 14, color: '#E0E0E0', fontWeight: '500' as const },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: '#9E9E9E', fontSize: 14 },
  processingEmoji: { fontSize: 48, marginBottom: 20 },
  processingTitle: { fontSize: 22, fontWeight: '800' as const, color: '#FFFFFF', marginBottom: 24 },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#333333', width: '100%', marginBottom: 20,
  },
  fileInfo: { flex: 1 },
  fileName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  fileSize: { color: '#9E9E9E', fontSize: 12, marginTop: 2 },
  progressBarBg: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: '#333333', overflow: 'hidden', marginBottom: 8,
  },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  progressText: { color: '#9E9E9E', fontSize: 13, marginBottom: 28 },
  stepsContainer: { gap: 16, alignSelf: 'flex-start', width: '100%', paddingHorizontal: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { fontSize: 18 },
  stepText: { color: '#9E9E9E', fontSize: 14 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#111111' },

  // User type selector
  userTypeSection: { marginTop: 12 },
  userTypeTitle: { fontSize: 18, fontWeight: '800' as const, color: '#FFFFFF', marginBottom: 14 },
  userTypeRow: { flexDirection: 'row', gap: 12 },
  userTypeOption: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: '#333333',
  },
  userTypeSelected: { borderColor: '#FFFFFF', backgroundColor: '#222222' },
  userTypeEmoji: { fontSize: 28, marginBottom: 8 },
  userTypeLabel: { fontSize: 15, fontWeight: '700' as const, color: '#CCCCCC', marginBottom: 4 },
  userTypeLabelSelected: { color: '#FFFFFF' },
  userTypeDesc: { fontSize: 12, color: '#777777', textAlign: 'center' },

  // Premium upsell
  upsellSection: { marginTop: 24, backgroundColor: '#1A1A1A', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#333333' },
  upsellTitle: { fontSize: 18, fontWeight: '800' as const, color: '#FFFFFF', marginBottom: 4 },
  upsellSubtitle: { fontSize: 13, color: '#9E9E9E', marginBottom: 16 },
  planCard: {
    backgroundColor: '#222222', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#333333',
  },
  planCardHighlight: { borderColor: '#FFD700' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  planName: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  bestBadge: { backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bestBadgeText: { fontSize: 10, fontWeight: '800' as const, color: '#000000' },
  planBenefit: { fontSize: 15, fontWeight: '600' as const, color: '#E0E0E0', marginBottom: 4 },
  planExtra: { fontSize: 12, color: '#777777' },
  upgradeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: 14, backgroundColor: '#FFD700', marginTop: 6,
  },
  upgradeButtonText: { fontSize: 16, fontWeight: '800' as const, color: '#000000' },
});
