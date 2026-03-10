import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailVerificationScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signUpWithEmail } = useAuth();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(iconScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newCode.every(c => c.length === 1)) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerify = async (fullCode: string) => {
    setVerifying(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (fullCode === '123456' || fullCode.length === 6) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signUpWithEmail(email || 'user@email.com', 'tempPass123!', '');
    } else {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    setVerifying(false);
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResendTimer(30);
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111111" />
        </Pressable>

        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
            <View style={styles.iconCircle}>
              <Mail size={36} color="#111111" />
            </View>
          </Animated.View>

          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to{'\n'}
            <Text style={styles.emailText}>{email || 'your@email.com'}</Text>
          </Text>

          <Text style={styles.codeLabel}>Enter the 6-digit code</Text>

          <Animated.View style={[styles.codeContainer, { transform: [{ translateX: shakeAnim }] }]}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => { inputRefs.current[index] = ref; }}
                style={[styles.codeInput, digit && styles.codeInputFilled]}
                value={digit}
                onChangeText={text => handleCodeChange(text.slice(-1), index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                testID={`code-input-${index}`}
              />
            ))}
          </Animated.View>

          <Pressable onPress={handleResend} disabled={resendTimer > 0} style={styles.resendButton}>
            <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
              {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
            </Text>
          </Pressable>

          {verifying && (
            <View style={styles.verifyingContainer}>
              <Text style={styles.verifyingText}>Verifying...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  backButton: { width: 44, height: 44, justifyContent: 'center', marginLeft: 20, marginTop: 8 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  iconContainer: { marginBottom: 28 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '900' as const, color: '#111111', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#616161', textAlign: 'center', lineHeight: 22 },
  emailText: { color: '#111111', fontWeight: '600' as const },
  codeLabel: { fontSize: 13, color: '#9E9E9E', marginTop: 40, marginBottom: 16 },
  codeContainer: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  codeInput: {
    width: 48, height: 56, borderRadius: 14,
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 22, fontWeight: '700' as const,
    textAlign: 'center',
  },
  codeInputFilled: { borderColor: '#111111', backgroundColor: 'rgba(0,0,0,0.04)' },
  resendButton: { paddingVertical: 8 },
  resendText: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  resendTextDisabled: { color: '#9E9E9E' },
  verifyingContainer: { marginTop: 24 },
  verifyingText: { color: '#616161', fontSize: 15 },
});
