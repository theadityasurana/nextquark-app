import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Linking, Platform, Modal, TextInput, KeyboardAvoidingView, Image as RNImage, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, Check, Upload, Trash2, Eye, ExternalLink, ChevronRight, Pencil } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';

const CARD_WIDTH = Dimensions.get('window').width * 0.75;
const CARD_GAP = 12;
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const dk = {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceElevated: '#2A2A2A',
    border: '#333333',
    borderLight: '#2A2A2A',
    secondary: '#FFFFFF',
    accent: '#00E676',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
  };
  const colors = dk as any;  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supabaseUserId } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; mimeType: string; ext: string; originalName: string } | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renamingResume, setRenamingResume] = useState<Resume | null>(null);

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

  const handleRename = (resume: Resume) => {
    setRenamingResume(resume);
    setRenameText(resume.name);
  };

  const handleConfirmRename = async () => {
    if (!renamingResume || !renameText.trim()) return;
    const newName = renameText.trim();
    await saveResumeNameMapping(renamingResume.fileName, newName);
    setResumes(prev => prev.map(r => r.id === renamingResume.id ? { ...r, name: newName } : r));
    setRenamingResume(null);
    setRenameText('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#121212' }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', '#121212']} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>My Resumes</Text>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=200&fit=crop' }} style={styles.heroBanner} />
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Manage Your Resumes</Text>
          <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>Upload and organize resumes for different roles</Text>
        </View>
      </LinearGradient>

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
          Tap a resume to set it as active. Active resume is used when applying.
        </Text>

        {resumes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
          >
            {resumes.map((resume) => {
              const url = signedUrls[resume.id];
              const previewUrl = url ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}` : null;
              return (
                <Pressable
                  key={resume.id}
                  style={[styles.carouselCard, resume.isActive && styles.carouselCardActive]}
                  onPress={() => handleSetActive(resume.id)}
                >
                  {resume.isActive && (
                    <View style={styles.activeBadge}>
                      <Check size={10} color="#FFF" />
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                  <View style={styles.carouselPreview}>
                    {loadingUrls ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : previewUrl && Platform.OS !== 'web' ? (
                      <View style={styles.carouselWebViewWrap}>
                        <WebView source={{ uri: previewUrl }} style={{ flex: 1 }} scalesPageToFit scrollEnabled={false} />
                      </View>
                    ) : (
                      <FileText size={36} color={resume.isActive ? '#10B981' : colors.textTertiary} />
                    )}
                  </View>
                  <Text style={[styles.carouselName, { color: colors.textPrimary }]} numberOfLines={1}>{resume.name}</Text>
                  <Text style={[styles.carouselDate, { color: colors.textTertiary }]}>Uploaded {formatDate(resume.uploadDate)}</Text>
                  <View style={styles.carouselActions}>
                    <Pressable style={[styles.carouselActionBtn, { backgroundColor: colors.background }]} onPress={() => handleRename(resume)}>
                      <Pencil size={14} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable style={[styles.carouselActionBtn, { backgroundColor: colors.background }]} onPress={() => handleView(resume)}>
                      <ExternalLink size={14} color={colors.accent} />
                    </Pressable>
                    <Pressable style={[styles.carouselActionBtn, { backgroundColor: '#3A1B1B' }]} onPress={() => handleDelete(resume.id)}>
                      <Trash2 size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={[styles.stickyUploadBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: '#121212', borderTopColor: '#333333' }]}>
        <Pressable 
          style={[styles.uploadBtn, (uploading || resumes.length >= resumeLimit) && styles.uploadBtnDisabled]} 
          onPress={handleUpload} 
          disabled={uploading || resumes.length >= resumeLimit}
        >
          <Upload size={18} color={(uploading || resumes.length >= resumeLimit) ? '#999' : '#FFF'} />
          <Text style={[styles.uploadBtnText, (uploading || resumes.length >= resumeLimit) && styles.uploadBtnTextDisabled]}>
            {uploading ? 'Uploading...' : resumes.length >= resumeLimit ? `Limit Reached (${resumeLimit} max)` : 'Upload Resume'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={!!pendingFile || !!renamingResume} animationType="slide" transparent>
        <View style={styles.renameOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.renameContent}>
            <View style={styles.renameHeader}>
              <Text style={styles.renameTitle}>{renamingResume ? 'Rename Resume' : 'Name Your Resume'}</Text>
              <Pressable onPress={() => { setPendingFile(null); setRenamingResume(null); setRenameText(''); }}>
                <View style={styles.renameCloseBtn}>
                  <Text style={{ fontSize: 18, color: '#FFF' }}>✕</Text>
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
              style={[styles.renameConfirmBtn, (uploading && !renamingResume) && { opacity: 0.6 }]}
              onPress={renamingResume ? handleConfirmRename : handleConfirmUpload}
              disabled={renamingResume ? !renameText.trim() : (uploading || !renameText.trim())}
            >
              {uploading && !renamingResume ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.renameConfirmBtnText}>{renamingResume ? 'Rename' : 'Upload'}</Text>
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
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    textAlign: 'center',
  },
  heroSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  heroBanner: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  carouselContent: {
    paddingRight: 16,
    gap: CARD_GAP,
    marginBottom: 20,
  },
  carouselCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  carouselCardActive: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  activeBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 2,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  carouselPreview: {
    height: 320,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  carouselWebViewWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  carouselName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  carouselDate: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  carouselActions: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselActionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  limitText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  upgradeLink: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#00E676',
  },

  uploadBtn: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnDisabled: {
    opacity: 0.4,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  uploadBtnTextDisabled: {
    color: '#999999',
  },
  stickyUploadBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  renameContent: {
    backgroundColor: '#1E1E1E',
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
    color: '#FFFFFF',
  },
  renameCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#B0B0B0',
    marginBottom: 6,
  },
  renameInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
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
