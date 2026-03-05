import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, Alert } from 'react-native';
import { Upload, FileText, Camera } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { StepProps } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { parseResumeText } from '@/utils/resumeParser';

export default function StepResume({ data, onUpdate, onNext }: StepProps) {
  const { supabaseUserId } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('Resume.pdf');
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

        // Parse resume text
        let parsedData = {};
        try {
          const fileContent = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
          parsedData = parseResumeText(fileContent);
        } catch (parseError) {
          console.log('Parse error:', parseError);
        }

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

        const uploadUrl = `https://widujxpahzlpegzjjpqp.supabase.co/storage/v1/object/resumes/${filePath}`;
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        clearInterval(interval);

        if (!response.ok) {
          setUploading(false);
          Alert.alert('Upload Failed', 'Could not upload resume. Please try again.');
          return;
        }

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

  if (uploading) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.centerContent}>
          <Text style={styles.processingEmoji}>⚙️</Text>
          <Text style={styles.processingTitle}>Analyzing your resume...</Text>
          <View style={styles.fileCard}>
            <FileText size={20} color="#111111" />
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
        </View>
        <Pressable style={styles.nextButton} onPress={onNext} testID="next-button">
          <Text style={styles.nextButtonText}>Looks Good! →</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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
          <Camera size={18} color="#111111" />
          <Text style={styles.photoButtonText}>Take Photo of Resume</Text>
        </Pressable>
        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>Uploading a resume boosts your profile strength by 15%</Text>
        </View>
      </View>
      <Pressable onPress={onNext} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  content: { paddingTop: 20 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  titleEmoji: { fontSize: 28 },
  emoji: { fontSize: 48, marginBottom: 16 },
  mainTitle: { fontSize: 24, fontWeight: '900' as const, color: '#111111', marginBottom: 8, flex: 1 },
  subtitle: { fontSize: 15, color: '#616161', marginBottom: 32, lineHeight: 22 },
  uploadArea: {
    borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed',
    borderRadius: 18, padding: 32, marginBottom: 20,
  },
  uploadInner: { alignItems: 'center', gap: 12 },
  uploadText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  uploadFormats: { color: '#9E9E9E', fontSize: 12 },
  photoButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  photoButtonText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
  autofillInfoCard: {
    backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  autofillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  autofillIcon: { fontSize: 16 },
  autofillText: { fontSize: 14, color: '#111111', fontWeight: '500' as const },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: '#616161', fontSize: 14 },
  processingEmoji: { fontSize: 48, marginBottom: 20 },
  processingTitle: { fontSize: 22, fontWeight: '800' as const, color: '#111111', marginBottom: 24 },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E0E0E0', width: '100%', marginBottom: 20,
  },
  fileInfo: { flex: 1 },
  fileName: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  fileSize: { color: '#9E9E9E', fontSize: 12, marginTop: 2 },
  progressBarBg: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: '#E0E0E0', overflow: 'hidden', marginBottom: 8,
  },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: '#111111' },
  progressText: { color: '#616161', fontSize: 13, marginBottom: 28 },
  stepsContainer: { gap: 16, alignSelf: 'flex-start', width: '100%', paddingHorizontal: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { fontSize: 18 },
  stepText: { color: '#616161', fontSize: 14 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
});
