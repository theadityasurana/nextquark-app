import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, ChevronDown, Search, X } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { countryCodes } from '@/constants/onboarding';

type Step = 'phone' | 'otp';

export default function MobileSignUpScreen() {
  const { signUpWithEmail } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [step]);

  useEffect(() => {
    if (step === 'otp' && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, resendTimer]);

  const filteredCountries = countryCodes.filter(c =>
    c.country.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
  );

  const handleSendOtp = () => {
    if (phoneNumber.length < 6) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('otp');
    setResendTimer(30);
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await signUpWithEmail(`${selectedCountry.code}${phoneNumber}@phone.local`, 'tempPass123!', 'New User');
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResendTimer(30);
    setOtp(['', '', '', '', '', '']);
  };

  if (step === 'otp') {
    const otpCode = otp.join('');
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Pressable onPress={() => setStep('phone')} style={styles.backButton}>
                <ArrowLeft size={24} color="#111111" />
              </Pressable>

              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.otpIconContainer}>
                  <Phone size={32} color="#111111" />
                </View>
                <Text style={styles.title}>Verify Your Number</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={styles.phoneHighlight}>{selectedCountry.code} {phoneNumber}</Text>
                </Text>

                <View style={styles.otpContainer}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={ref => { otpRefs.current[i] = ref; }}
                      style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                      value={digit}
                      onChangeText={v => handleOtpChange(v.slice(-1), i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      testID={`otp-input-${i}`}
                    />
                  ))}
                </View>

                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Didn't receive it? </Text>
                  <Pressable onPress={handleResend} disabled={resendTimer > 0}>
                    <Text style={[styles.resendLink, resendTimer > 0 && styles.resendDisabled]}>
                      {resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend Code'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>

              <View style={styles.bottomSection}>
                <Pressable
                  style={[styles.verifyButton, otpCode.length !== 6 && styles.buttonDisabled]}
                  onPress={handleVerify}
                  disabled={otpCode.length !== 6}
                >
                  <Text style={[styles.verifyButtonText, otpCode.length !== 6 && styles.buttonTextDisabled]}>Verify</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#111111" />
            </Pressable>

            <View style={styles.headerSection}>
              <Text style={styles.title}>Let's Get{'\n'}Started</Text>
              <Text style={styles.subtitle}>Enter your mobile number to create an account</Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>MOBILE NUMBER</Text>
                <View style={styles.phoneRow}>
                  <Pressable style={styles.countryCodeButton} onPress={() => setShowCountryPicker(true)}>
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                    <ChevronDown size={14} color="#9E9E9E" />
                  </Pressable>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter your number"
                    placeholderTextColor="#9E9E9E"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    autoFocus
                    testID="phone-input"
                  />
                </View>
              </View>
            </View>

            <View style={styles.bottomSection}>
              <Pressable
                style={[styles.continueButton, phoneNumber.length < 6 && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={phoneNumber.length < 6}
              >
                <Text style={[styles.continueButtonText, phoneNumber.length < 6 && styles.buttonTextDisabled]}>
                  Send OTP
                </Text>
              </Pressable>
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal visible={showCountryPicker} animationType="slide" transparent onRequestClose={() => setShowCountryPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <Pressable onPress={() => setShowCountryPicker(false)}><X size={22} color="#111111" /></Pressable>
              </View>
              <View style={styles.searchWrapper}>
                <Search size={16} color="#9E9E9E" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#9E9E9E"
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  autoFocus
                />
              </View>
              <FlatList
                data={filteredCountries}
                keyExtractor={(item, i) => `${item.code}-${item.country}-${i}`}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.countryRow}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      setSelectedCountry(item);
                      setShowCountryPicker(false);
                      setCountrySearch('');
                    }}
                  >
                    <Text style={styles.countryRowFlag}>{item.flag}</Text>
                    <Text style={styles.countryRowName}>{item.country}</Text>
                    <Text style={styles.countryRowCode}>{item.code}</Text>
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1 },
  backButton: { width: 44, height: 44, justifyContent: 'center', marginTop: 8 },
  headerSection: { marginTop: 16, marginBottom: 32 },
  title: { fontSize: 34, fontWeight: '900' as const, color: '#111111', lineHeight: 42 },
  subtitle: { fontSize: 16, color: '#616161', marginTop: 10, lineHeight: 22 },
  formSection: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCodeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 54, borderRadius: 14, paddingHorizontal: 14,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  countryFlag: { fontSize: 18 },
  countryCodeText: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  phoneInput: {
    flex: 1, height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 16,
  },
  bottomSection: { flex: 1, justifyContent: 'flex-end', gap: 16, paddingTop: 32 },
  continueButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  continueButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  buttonDisabled: { backgroundColor: '#E0E0E0' },
  buttonTextDisabled: { color: '#9E9E9E' },
  termsText: { textAlign: 'center', fontSize: 12, color: '#9E9E9E', lineHeight: 18 },
  termsLink: { color: '#111111' },
  otpIconContainer: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, marginTop: 24,
  },
  phoneHighlight: { color: '#111111', fontWeight: '700' as const },
  otpContainer: { flexDirection: 'row', gap: 10, marginTop: 32, marginBottom: 24, justifyContent: 'center' },
  otpInput: {
    width: 48, height: 56, borderRadius: 14,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    textAlign: 'center', fontSize: 22, fontWeight: '700' as const, color: '#111111',
  },
  otpInputFilled: { borderColor: '#111111', backgroundColor: '#FFFFFF' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { color: '#9E9E9E', fontSize: 14 },
  resendLink: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  resendDisabled: { color: '#9E9E9E', fontWeight: '400' as const },
  verifyButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  verifyButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' as const, color: '#111111' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 14,
    height: 44, borderRadius: 12, backgroundColor: '#F5F5F5',
  },
  searchInput: { flex: 1, color: '#111111', fontSize: 15 },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  countryRowFlag: { fontSize: 22 },
  countryRowName: { flex: 1, color: '#111111', fontSize: 15 },
  countryRowCode: { color: '#9E9E9E', fontSize: 14 },
});
