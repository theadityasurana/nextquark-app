import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Linking, Platform, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, Check, Upload, Trash2, Eye, ExternalLink } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/contexts/useColors';
import Colors from '@/constants/colors';
import { Resume } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getStorageUploadUrl } from '@/lib/supabase';
import { getSubscriptionStatus } from '@/lib/subscription';
import { useQuery } from '@tanstack/react-query';

const RESUME_NAMES_KEY = 'resume_custom_names';

async function getResumeNamesMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(RESUME_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveResumeNameMapping(fileName: string, customName: string) {
  const map = await getResumeNamesMap();
  map[fileName] = customName;
  await AsyncStorage.setItem(RESUME_NAMES_KEY, JSON.stringify(map));
}

async function removeResumeNameMapping(fileName: string) {
  const map = await getResumeNamesMap();
  delete map[fileName];
  await AsyncStorage.setItem(RESUME_NAMES_KEY, JSON.stringify(map));
}

export default function ResumeManagementScreen() {
  const colors = useColors();  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supabaseUserId } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; mimeType: string; ext: string; originalName: string } | null>(null);
  const [renameText, setRenameText] = useState('');

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-status', supabaseUserId],
    queryFn: () => getSubscriptionStatus(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const getResumeLimit = () => {
    if (!subscriptionData) return 1;
    switch (subscriptionData.subscription_type) {
      case 'premium': return 5;
      case 'pro': return 3;
      default: return 1;
    }
  };

  const resumeLimit = getResumeLimit();

  useEffect(() => {
    if (supabaseUserId) {
      loadResumes();
    }
  }, [supabaseUserId]);

  const loadResumes = async () => {
    if (!supabaseUserId) return;
    try {
      const { data: files, error } = await supabase.storage
        .from('resumes')
        .list(supabaseUserId);
      
      if (error) throw error;
      
      if (files && files.length > 0) {
        const namesMap = await getResumeNamesMap();
        const loadedResumes: Resume[] = files.map((file, idx) => ({
          id: `r${idx}`,
          name: namesMap[file.name] || file.name.replace(/\.[^/.]+$/, '').replace(/^\d+\./, ''),
          fileName: file.name,
          uploadDate: file.created_at || new Date().toISOString(),
          isActive: idx === 0,
        }));
        setResumes(loadedResumes);
        loadSignedUrls(loadedResumes);
      }
    } catch (error) {
      console.log('Error loading resumes:', error);
    }
  };

  const loadSignedUrls = async (resumeList: Resume[]) => {
    if (!supabaseUserId) return;
    setLoadingUrls(true);
    const urls: Record<string, string> = {};
    for (const resume of resumeList) {
      try {
        const filePath = `${supabaseUserId}/${resume.fileName}`;
        const { data } = await supabase.storage
          .from('resumes')
          .createSignedUrl(filePath, 3600);
        if (data?.signedUrl) {
          urls[resume.id] = data.signedUrl;
        }
      } catch (e) {
        console.log('Error getting signed URL for', resume.fileName, e);
      }
    }
    setSignedUrls(urls);
    setLoadingUrls(false);
  };

  const handleSetActive = (id: string) => {
    setResumes((prev) =>
      prev.map((r) => ({ ...r, isActive: r.id === id }))
    );
    console.log(`Set active resume: ${id}`);
  };

  const handleView = async (resume: Resume) => {
    if (!supabaseUserId) return;
    try {
      const filePath = `${supabaseUserId}/${resume.fileName}`;
      const { data } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 3600);
      
      if (data?.signedUrl) {
        await Linking.openURL(data.signedUrl);
      }
    } catch (error) {
      console.log('Error viewing resume:', error);
      Alert.alert('Error', 'Failed to load resume.');
    }
  };

  const handleDelete = async (id: string) => {
    const resume = resumes.find((r) => r.id === id);
    if (resume?.isActive) {
      Alert.alert('Cannot Delete', 'You cannot delete the active resume. Please select another resume as active first.');
      return;
    }
    Alert.alert(
      'Delete Resume',
      `Are you sure you want to delete "${resume?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (resume?.fileName && supabaseUserId) {
              const filePath = `${supabaseUserId}/${resume.fileName}`;
              await supabase.storage.from('resumes').remove([filePath]);
              await removeResumeNameMapping(resume.fileName);
            }
            setResumes((prev) => prev.filter((r) => r.id !== id));
            console.log(`Deleted resume: ${id}`);
          },
        },
      ]
    );
  };

  const handleUpload = async () => {
    if (!supabaseUserId) {
      Alert.alert('Error', 'You must be logged in to upload a resume.');
      return;
    }

    // Check resume limit
    if (resumes.length >= resumeLimit) {
      const upgradeMessage = subscriptionData?.subscription_type === 'free'
        ? 'Upgrade to Pro (3 resumes) or Premium (5 resumes) to upload more.'
        : subscriptionData?.subscription_type === 'pro'
        ? 'Upgrade to Premium to upload up to 5 resumes.'
        : 'You have reached the maximum limit of 5 resumes.';
      
      Alert.alert(
        'Resume Limit Reached',
        `You can upload up to ${resumeLimit} resume${resumeLimit > 1 ? 's' : ''} with your ${subscriptionData?.subscription_type || 'free'} plan. ${upgradeMessage}`,
        [
          { text: 'OK', style: 'cancel' },
          subscriptionData?.subscription_type !== 'premium' && {
            text: 'Upgrade',
            onPress: () => router.push('/premium' as any),
          },
        ].filter(Boolean) as any
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 5MB.');
        return;
      }

      const fileExt = file.name.split('.').pop() || 'pdf';
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      setPendingFile({ uri: file.uri, mimeType: file.mimeType || 'application/pdf', ext: fileExt, originalName });
      setRenameText(originalName);
    } catch (error) {
      console.log('Error picking resume:', error);
      Alert.alert('Error', 'Failed to pick resume. Please try again.');
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !supabaseUserId || !renameText.trim()) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}.${pendingFile.ext}`;
      const filePath = `${supabaseUserId}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: pendingFile.uri,
        type: pendingFile.mimeType,
        name: fileName,
      } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please sign in again.');
        setUploading(false);
        return;
      }

      const uploadUrl = getStorageUploadUrl('resumes', filePath);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        Alert.alert('Upload Failed', 'Could not upload resume. Please try again.');
        setUploading(false);
        return;
      }

      const customName = renameText.trim();
      await saveResumeNameMapping(fileName, customName);

      const newResume: Resume = {
        id: `r${Date.now()}`,
        name: customName,
        fileName: fileName,
        uploadDate: new Date().toISOString(),
        isActive: resumes.length === 0,
      };

      setResumes((prev) => [...prev, newResume]);
      setPendingFile(null);
      setRenameText('');
      Alert.alert('Success', 'Resume uploaded successfully!');
    } catch (error) {
      console.log('Error uploading resume:', error);
      Alert.alert('Error', 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Resumes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.limitBanner}>
          <Text style={styles.limitText}>
            {resumes.length} / {resumeLimit} resume{resumeLimit > 1 ? 's' : ''} uploaded
          </Text>
          {subscriptionData?.subscription_type === 'free' && (
            <Pressable onPress={() => router.push('/premium' as any)}>
              <Text style={styles.upgradeLink}>Upgrade for more</Text>
            </Pressable>
          )}
          {subscriptionData?.subscription_type === 'pro' && (
            <Pressable onPress={() => router.push('/premium' as any)}>
              <Text style={styles.upgradeLink}>Get Premium (5 resumes)</Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select your active resume to use when applying for jobs.
        </Text>

        {resumes.map((resume) => {
          const url = signedUrls[resume.id];
          const previewUrl = url ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}` : null;
          return (
            <View key={resume.id} style={styles.resumeWrapper}>
              {loadingUrls ? (
                <View style={[styles.previewFallback, { height: 520 }]}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.previewFallbackText, { color: colors.textTertiary }]}>Loading preview...</Text>
                </View>
              ) : previewUrl && Platform.OS !== 'web' ? (
                <View style={styles.previewWebViewWrap}>
                  <WebView
                    source={{ uri: previewUrl }}
                    style={styles.previewWebView}
                    scalesPageToFit
                    scrollEnabled={false}
                    nestedScrollEnabled={false}
                  />
                </View>
              ) : url ? (
                <Pressable style={[styles.previewFallback, { height: 520 }]} onPress={() => handleView(resume)}>
                  <FileText size={40} color={colors.textTertiary} />
                  <Text style={[styles.previewFallbackText, { color: colors.textTertiary }]}>Tap to view resume</Text>
                </Pressable>
              ) : (
                <View style={[styles.previewFallback, { height: 520 }]}>
                  <FileText size={40} color={colors.textTertiary} />
                  <Text style={[styles.previewFallbackText, { color: colors.textTertiary }]}>Preview unavailable</Text>
                </View>
              )}

              <View style={styles.resumeBottomBar}>
                <Text style={[styles.resumeNameSmall, { color: colors.textPrimary }]} numberOfLines={1}>{resume.name}</Text>
                <View style={styles.resumeIconActions}>
                  <Pressable style={[styles.iconBtn, { backgroundColor: colors.surface }]} onPress={() => handleView(resume)}>
                    <ExternalLink size={16} color={colors.accent} />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: colors.surface }, resume.isActive && styles.iconBtnActive]}
                    onPress={() => handleSetActive(resume.id)}
                  >
                    <Check size={16} color={resume.isActive ? '#FFFFFF' : colors.textTertiary} />
                  </Pressable>
                  <Pressable style={[styles.iconBtn, { backgroundColor: colors.surface }]} onPress={() => handleDelete(resume.id)}>
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        <Pressable 
          style={[styles.uploadBtn, (uploading || resumes.length >= resumeLimit) && styles.uploadBtnDisabled]} 
          onPress={handleUpload} 
          disabled={uploading || resumes.length >= resumeLimit}
        >
          <Upload size={18} color={(uploading || resumes.length >= resumeLimit) ? '#999' : '#000'} />
          <Text style={[styles.uploadBtnText, (uploading || resumes.length >= resumeLimit) && styles.uploadBtnTextDisabled]}>
            {uploading ? 'Uploading...' : resumes.length >= resumeLimit ? `Limit Reached (${resumeLimit} max)` : 'Upload Resume'}
          </Text>
        </Pressable>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
          <Text style={styles.tipText}>
            Keep multiple resumes tailored for different roles. Select the most relevant one before applying to maximize your match score.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!pendingFile} animationType="slide" transparent>
        <View style={styles.renameOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.renameContent}>
            <View style={styles.renameHeader}>
              <Text style={styles.renameTitle}>Name Your Resume</Text>
              <Pressable onPress={() => { setPendingFile(null); setRenameText(''); }}>
                <View style={styles.renameCloseBtn}>
                  <Text style={{ fontSize: 18, color: '#000' }}>✕</Text>
                </View>
              </Pressable>
            </View>
            <Text style={styles.renameLabel}>Resume name</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              selectTextOnFocus
              placeholder="e.g. Software Engineer Resume"
              placeholderTextColor="#999"
            />
            <Pressable
              style={[styles.renameConfirmBtn, uploading && { opacity: 0.6 }]}
              onPress={handleConfirmUpload}
              disabled={uploading || !renameText.trim()}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.renameConfirmBtnText}>Upload</Text>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  limitText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: "#000",
  },
  upgradeLink: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: "#000",
  },
  resumeWrapper: {
    marginBottom: 24,
  },
  previewWebViewWrap: {
    height: 520,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  previewFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  previewFallbackText: {
    fontSize: 13,
  },
  resumeBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  resumeNameSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
    marginRight: 8,
  },
  resumeIconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: {
    backgroundColor: '#111',
  },
  uploadBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadBtnDisabled: {
    opacity: 0.4,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000000',
  },
  uploadBtnTextDisabled: {
    color: '#999999',
  },
  tipCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: "#000",
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: "#000",
    lineHeight: 20,
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  renameContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  renameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  renameTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#000',
  },
  renameCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 6,
  },
  renameInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  renameConfirmBtn: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  renameConfirmBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});
