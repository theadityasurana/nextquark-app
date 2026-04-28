import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Eye } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isPasswordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isPasswordValid && passwordsMatch;

  const handleReset = async () => {
    if (!isFormValid || loading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setSuccess(true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.replace('/sign-in' as any), 2000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color="#34C759" />
          <Text style={styles.successTitle}>Password Updated</Text>
          <Text style={styles.successSub}>Redirecting to sign in...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/sign-in' as any)} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>Set New Password</Text>
          <Text style={styles.subheading}>Enter your new password below</Text>

          {error.length > 0 && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min 6 characters"
                placeholderTextColor="#555"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? <Ionicons name="eye-off-outline" size={18} color="#555" /> : <Eye size={18} color="#555" />}
              </Pressable>
            </View>
            <View style={styles.rowSeparator} />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Confirm</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="#555"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                returnKeyType="done"
                onSubmitEditing={handleReset}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                {showConfirm ? <Ionicons name="eye-off-outline" size={18} color="#555" /> : <Eye size={18} color="#555" />}
              </Pressable>
            </View>
          </View>

          {password.length > 0 && password.length < 6 && (
            <Text style={styles.hintError}>Password must be at least 6 characters</Text>
          )}
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={styles.hintError}>Passwords do not match</Text>
          )}

          <Pressable
            style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={[styles.buttonText, (!isFormValid || loading) && styles.buttonTextDisabled]}>
                Update Password
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subheading: { fontSize: 14, color: '#777', marginBottom: 24 },
  errorBanner: {
    backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
  },
  errorText: { color: '#FF453A', fontSize: 13, textAlign: 'center' },
  inputGroup: { backgroundColor: '#1C1C1E', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 44 },
  rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#38383A', marginLeft: 16 },
  inputLabel: { width: 80, fontSize: 16, color: '#FFFFFF' },
  input: { flex: 1, fontSize: 16, color: '#FFFFFF', padding: 0 },
  hintError: { color: '#FF453A', fontSize: 13, marginBottom: 8, paddingHorizontal: 4 },
  button: { height: 50, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#1C1C1E' },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#111111' },
  buttonTextDisabled: { color: '#555' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  successSub: { fontSize: 14, color: '#777' },
});
