import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, Check, Upload, Trash2, Eye } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '@/constants/colors';
import { Resume } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSubscriptionStatus } from '@/lib/subscription';
import { useQuery } from '@tanstack/react-query';

export default function ResumeManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supabaseUserId } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);

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
        const loadedResumes: Resume[] = files.map((file, idx) => ({
          id: `r${idx}`,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/^\d+\./, ''),
          fileName: file.name,
          uploadDate: file.created_at || new Date().toISOString(),
          isActive: idx === 0,
        }));
        setResumes(loadedResumes);
      }
    } catch (error) {
      console.log('Error loading resumes:', error);
    }
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

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${supabaseUserId}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: fileName,
      } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        Alert.alert('Error', 'Authentication required. Please sign in again.');
        setUploading(false);
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

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Upload error:', errorText);
        Alert.alert('Upload Failed', 'Could not upload resume. Please try again.');
        setUploading(false);
        return;
      }

      const newResume: Resume = {
        id: `r${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: fileName,
        uploadDate: new Date().toISOString(),
        isActive: resumes.length === 0,
      };

      setResumes((prev) => [...prev, newResume]);
      Alert.alert('Success', 'Resume uploaded successfully!');
      setUploading(false);
    } catch (error) {
      console.log('Error uploading resume:', error);
      Alert.alert('Error', 'Failed to upload resume. Please try again.');
      setUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Resumes</Text>
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

        <Text style={styles.subtitle}>
          Select your active resume to use when applying for jobs.
        </Text>

        {resumes.map((resume) => (
          <Pressable
            key={resume.id}
            style={[styles.resumeCard, resume.isActive && styles.resumeCardActive]}
            onPress={() => handleSetActive(resume.id)}
          >
            <View style={styles.resumeCardTop}>
              <View style={[styles.fileIcon, resume.isActive && styles.fileIconActive]}>
                <FileText size={22} color={resume.isActive ? Colors.surface : Colors.textSecondary} />
              </View>
              <View style={styles.resumeInfo}>
                <Text style={styles.resumeName}>{resume.name}</Text>
                <Text style={styles.resumeFileName}>{resume.fileName}</Text>
                <Text style={styles.resumeDate}>Uploaded {formatDate(resume.uploadDate)}</Text>
              </View>
              {resume.isActive && (
                <View style={styles.activeBadge}>
                  <Check size={14} color={Colors.surface} />
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
            <View style={styles.resumeActions}>
              <Pressable style={styles.viewBtn} onPress={() => handleView(resume)}>
                <Eye size={16} color={Colors.accent} />
              </Pressable>
              {!resume.isActive && (
                <Pressable style={styles.setActiveBtn} onPress={() => handleSetActive(resume.id)}>
                  <Text style={styles.setActiveBtnText}>Set as Active</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDelete(resume.id)}
              >
                <Trash2 size={16} color={Colors.error} />
              </Pressable>
            </View>
          </Pressable>
        ))}

        <Pressable 
          style={[styles.uploadCard, resumes.length >= resumeLimit && styles.uploadCardDisabled]} 
          onPress={handleUpload} 
          disabled={uploading || resumes.length >= resumeLimit}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Upload size={24} color={resumes.length >= resumeLimit ? Colors.textTertiary : Colors.accent} />
          )}
          <Text style={[styles.uploadText, resumes.length >= resumeLimit && styles.uploadTextDisabled]}>
            {uploading ? 'Uploading...' : resumes.length >= resumeLimit ? `Limit Reached (${resumeLimit} max)` : 'Upload New Resume'}
          </Text>
          <Text style={styles.uploadHint}>PDF, DOC, or DOCX (Max 5MB)</Text>
        </Pressable>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
          <Text style={styles.tipText}>
            Keep multiple resumes tailored for different roles. Select the most relevant one before applying to maximize your match score.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  limitText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  upgradeLink: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  resumeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  resumeCardActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  resumeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconActive: {
    backgroundColor: Colors.accent,
  },
  resumeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resumeName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  resumeFileName: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  resumeDate: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  resumeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setActiveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
  },
  setActiveBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  uploadCardDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginTop: 10,
  },
  uploadTextDisabled: {
    color: Colors.textTertiary,
  },
  uploadHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  tipCard: {
    backgroundColor: Colors.accentSoft,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: `${Colors.accent}20`,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.secondary,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
