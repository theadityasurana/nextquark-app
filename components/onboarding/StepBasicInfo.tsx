import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList, Alert, Linking, Dimensions } from 'react-native';
import { MapPin, ChevronDown, Search, X, Camera, Link2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { countryCodes, majorCities } from '@/constants/onboarding';
import { StepProps } from '@/types/onboarding';

const COUNTER_EPOCH = 1735689600000;
const COUNTER_BASE = 1347892;
const COUNTER_RATE = 3.7;

function AnimatedOption({ index, children }: { index: number; children: React.ReactNode }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(100 + index * 120),
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

export default function StepBasicInfo({ data, onUpdate, onNext }: StepProps) {
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  const [locationQuery, setLocationQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [liveJobCount, setLiveJobCount] = useState(() =>
    Math.floor(COUNTER_BASE + ((Date.now() - COUNTER_EPOCH) / 1000) * COUNTER_RATE)
  );

  useEffect(() => {
    if (!data.countryCode) {
      onUpdate({ countryCode: '+91' });
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveJobCount(Math.floor(COUNTER_BASE + ((Date.now() - COUNTER_EPOCH) / 1000) * COUNTER_RATE));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const isValid = 
    data.firstName.trim().length > 0 && 
    data.lastName.trim().length > 0 && 
    data.phone.trim().length >= 6 && 
    data.location.trim().length > 0;

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (!data.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!data.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (data.phone.trim().length < 6) newErrors.phone = 'Phone number is required';
    if (!data.location.trim()) newErrors.location = 'Location is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) onNext();
  };

  const filteredCountries = countryCodes.filter(c =>
    c.country.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
  );

  const filteredCities = majorCities.filter(c =>
    c.toLowerCase().includes(locationQuery.toLowerCase())
  );

  const selectedCountry = countryCodes.find(c => c.code === data.countryCode) || countryCodes.find(c => c.code === '+91') || countryCodes[0];

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to upload your photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onUpdate({ profilePicture: result.assets[0].uri });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.counterCard}>
            <Text style={styles.counterEmoji}>🔥</Text>
            <View style={styles.counterTextWrap}>
              <Text style={styles.counterNumber}>{liveJobCount.toLocaleString()}</Text>
              <Text style={styles.counterLabel}>jobs added and counting</Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Let's get started!</Text>
          </View>
          <Text style={styles.subtitle}>Tell us about yourself</Text>

          <AnimatedOption index={0}>
            <View style={styles.photoSection}>
              <Text style={styles.sectionLabel}>PROFILE PHOTO (OPTIONAL)</Text>
              <Pressable style={styles.photoUpload} onPress={handlePickImage}>
                {data.profilePicture ? (
                  <Image source={{ uri: data.profilePicture }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={28} color="#9E9E9E" />
                    <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </AnimatedOption>

          <AnimatedOption index={1}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FIRST NAME <Text style={styles.asterisk}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Alex"
                placeholderTextColor="#9E9E9E"
                value={data.firstName}
                onChangeText={v => { onUpdate({ firstName: v }); if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' })); }}
                returnKeyType="next"
              />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>
          </AnimatedOption>

          <AnimatedOption index={2}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>LAST NAME <Text style={styles.asterisk}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Rivera"
                placeholderTextColor="#9E9E9E"
                value={data.lastName}
                onChangeText={v => { onUpdate({ lastName: v }); if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' })); }}
                returnKeyType="next"
              />
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>
          </AnimatedOption>

          <AnimatedOption index={3}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER <Text style={styles.asterisk}>*</Text></Text>
              <View style={styles.phoneRow}>
                <Pressable style={styles.countryCodeButton} onPress={() => setShowCountryPicker(true)}>
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCode}>{data.countryCode}</Text>
                  <ChevronDown size={14} color="#9E9E9E" />
                </Pressable>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="(555) 123-4567"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="phone-pad"
                  value={data.phone}
                  onChangeText={v => { onUpdate({ phone: v }); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }}
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>
          </AnimatedOption>

          <AnimatedOption index={4}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CURRENT LOCATION <Text style={styles.asterisk}>*</Text></Text>
              <Pressable style={styles.locationInput} onPress={() => setShowLocationSearch(true)}>
                <MapPin size={18} color="#9E9E9E" />
                <Text style={data.location ? styles.locationValue : styles.locationPlaceholder}>
                  {data.location || 'Search your city...'}
                </Text>
              </Pressable>
              {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
            </View>
          </AnimatedOption>

          <AnimatedOption index={5}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>LINKEDIN URL (OPTIONAL)</Text>
              <View style={styles.urlInputWrapper}>
                <Link2 size={18} color="#9E9E9E" />
                <TextInput
                  style={styles.urlInput}
                  placeholder="https://linkedin.com/in/yourprofile"
                  placeholderTextColor="#9E9E9E"
                  value={data.linkedInUrl}
                  onChangeText={v => onUpdate({ linkedInUrl: v })}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>
          </AnimatedOption>

          <AnimatedOption index={6}>
            <View style={styles.tipRow}>
              <Text style={styles.tipIcon}>{"\ud83d\udca1"}</Text>
              <Text style={styles.tipText}>You can add more details like experience and education later in your profile</Text>
            </View>
          </AnimatedOption>
        </Animated.View>

        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, !isValid && styles.nextButtonTextDisabled]}>Complete Setup →</Text>
        </Pressable>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} animationType="slide" transparent>
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
                    onUpdate({ countryCode: item.code });
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

      {/* Location Search Modal */}
      <Modal visible={showLocationSearch} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Location</Text>
              <Pressable onPress={() => setShowLocationSearch(false)}><X size={22} color="#111111" /></Pressable>
            </View>
            <View style={styles.searchWrapper}>
              <Search size={16} color="#9E9E9E" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor="#9E9E9E"
                value={locationQuery}
                onChangeText={setLocationQuery}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredCities}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.cityRow}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    onUpdate({ location: item });
                    setShowLocationSearch(false);
                    setLocationQuery('');
                  }}
                >
                  <MapPin size={16} color="#111111" />
                  <Text style={styles.cityRowText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#111111' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: 'space-between', backgroundColor: '#111111' },
  content: { paddingTop: 12 },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#2A2000',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD54F',
    marginBottom: 20,
  },
  counterEmoji: { fontSize: 24 },
  counterTextWrap: { flex: 1 },
  counterNumber: { fontSize: 18, fontWeight: '900' as const, color: '#F57F17' },
  counterLabel: { fontSize: 13, fontWeight: '600' as const, color: '#F57F17', opacity: 0.8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '900' as const, color: '#FFFFFF' },
  subtitle: { fontSize: 16, color: '#9E9E9E', marginBottom: 24 },
  photoSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700' as const, color: '#9E9E9E', letterSpacing: 1, marginBottom: 8 },
  photoUpload: { alignSelf: 'center' },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#1E1E1E', 
    borderWidth: 2, 
    borderColor: '#333333', 
    borderStyle: 'dashed' as const,
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderText: { fontSize: 12, color: '#9E9E9E', fontWeight: '600' as const },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#9E9E9E', letterSpacing: 1, marginBottom: 8 },
  asterisk: { color: '#EF4444', fontSize: 12 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600' as const, marginTop: 4 },
  input: {
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#333333',
    color: '#FFFFFF', fontSize: 15,
  },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCodeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 50, borderRadius: 12, paddingHorizontal: 12,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#333333',
  },
  countryFlag: { fontSize: 18 },
  countryCode: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  phoneInput: {
    flex: 1, height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#333333',
    color: '#FFFFFF', fontSize: 15,
  },
  locationInput: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#333333',
  },
  locationValue: { color: '#FFFFFF', fontSize: 15 },
  locationPlaceholder: { color: '#9E9E9E', fontSize: 15 },
  urlInputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#333333',
  },
  urlInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  nextButtonDisabled: { backgroundColor: '#333333' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#111111' },
  nextButtonTextDisabled: { color: '#666666' },
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
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  cityRowText: { color: '#111111', fontSize: 15 },

});
