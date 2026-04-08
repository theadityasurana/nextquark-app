import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList, Alert } from 'react-native';
import { MapPin, ChevronRight, Search, X, Camera, Link2 } from '@/components/ProfileIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { countryCodes, majorCities } from '@/constants/onboarding';
import { StepProps } from '@/types/onboarding';

const COUNTER_EPOCH = 1735689600000;
const COUNTER_BASE = 1347892;
const COUNTER_RATE = 3.7;

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
    if (!data.countryCode) onUpdate({ countryCode: '+91' });
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

          <Text style={styles.title}>Let's get started</Text>
          <Text style={styles.subtitle}>Tell us about yourself</Text>

          {/* Photo */}
          <View style={styles.photoSection}>
            <Pressable style={styles.photoUpload} onPress={handlePickImage}>
              {data.profilePicture ? (
                <Image source={{ uri: data.profilePicture }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={24} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </Pressable>
            <Text style={styles.photoLabel}>Add Photo</Text>
          </View>

          {/* Name fields */}
          <Text style={styles.sectionHeader}>PERSONAL INFORMATION</Text>
          <View style={styles.groupedCard}>
            <View style={[styles.fieldRow, styles.rowBorder]}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Alex"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={data.firstName}
                onChangeText={v => { onUpdate({ firstName: v }); if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' })); }}
                returnKeyType="next"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Rivera"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={data.lastName}
                onChangeText={v => { onUpdate({ lastName: v }); if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' })); }}
                returnKeyType="next"
              />
            </View>
          </View>
          {(errors.firstName || errors.lastName) ? (
            <Text style={styles.errorText}>{errors.firstName || errors.lastName}</Text>
          ) : null}

          {/* Phone */}
          <Text style={styles.sectionHeader}>CONTACT</Text>
          <View style={styles.groupedCard}>
            <View style={[styles.fieldRow, styles.rowBorder]}>
              <Pressable style={styles.countryCodeButton} onPress={() => setShowCountryPicker(true)}>
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCode}>{data.countryCode}</Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
              </Pressable>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone number"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="phone-pad"
                value={data.phone}
                onChangeText={v => { onUpdate({ phone: v }); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }}
              />
            </View>
            <Pressable style={styles.fieldRow} onPress={() => setShowLocationSearch(true)}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.locationValueWrap}>
                <Text style={data.location ? styles.fieldValue : styles.fieldPlaceholder}>
                  {data.location || 'Select city'}
                </Text>
                <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
              </View>
            </Pressable>
          </View>
          {(errors.phone || errors.location) ? (
            <Text style={styles.errorText}>{errors.phone || errors.location}</Text>
          ) : null}

          {/* LinkedIn */}
          <Text style={styles.sectionHeader}>SOCIAL (OPTIONAL)</Text>
          <View style={styles.groupedCard}>
            <View style={styles.fieldRow}>
              <Link2 size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={[styles.fieldInput, { marginLeft: 10 }]}
                placeholder="LinkedIn URL"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={data.linkedInUrl}
                onChangeText={v => onUpdate({ linkedInUrl: v })}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <Text style={styles.tipText}>💡 You can add more details later in your profile</Text>
        </Animated.View>

        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, !isValid && styles.nextButtonTextDisabled]}>Complete Setup</Text>
        </Pressable>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable onPress={() => setShowCountryPicker(false)} hitSlop={8}>
                <X size={22} color="#999" />
              </Pressable>
            </View>
            <View style={styles.searchWrapper}>
              <Search size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#999"
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
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Location</Text>
              <Pressable onPress={() => setShowLocationSearch(false)} hitSlop={8}>
                <X size={22} color="#999" />
              </Pressable>
            </View>
            <View style={styles.searchWrapper}>
              <Search size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor="#999"
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
                  <MapPin size={16} color="#007AFF" />
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
  flex: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16, justifyContent: 'space-between', backgroundColor: '#000000' },
  content: { paddingTop: 12 },
  counterCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12,
    padding: 14, marginBottom: 20,
  },
  counterEmoji: { fontSize: 24 },
  counterTextWrap: { flex: 1 },
  counterNumber: { fontSize: 18, fontWeight: '700', color: '#F59E0B' },
  counterLabel: { fontSize: 13, color: '#F59E0B', opacity: 0.8 },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 24 },
  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoUpload: {},
  photoPreview: { width: 88, height: 88, borderRadius: 44 },
  photoPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoLabel: { fontSize: 13, color: '#007AFF', marginTop: 8 },
  sectionHeader: {
    fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5, marginBottom: 8, marginLeft: 4, marginTop: 16,
  },
  groupedCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    minHeight: 48,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  fieldLabel: { fontSize: 16, color: '#FFFFFF', width: 100 },
  fieldInput: { flex: 1, fontSize: 16, color: '#FFFFFF', textAlign: 'right' },
  fieldValue: { fontSize: 16, color: '#FFFFFF' },
  fieldPlaceholder: { fontSize: 16, color: 'rgba(255,255,255,0.25)' },
  locationValueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  countryCodeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.12)',
    marginRight: 12,
  },
  countryFlag: { fontSize: 18 },
  countryCode: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  phoneInput: { flex: 1, fontSize: 16, color: '#FFFFFF' },
  errorText: { color: '#FF453A', fontSize: 13, marginTop: 6, marginLeft: 4 },
  tipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 20, textAlign: 'center' },
  nextButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  nextButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  nextButtonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1C1C1E', borderTopLeftRadius: 14, borderTopRightRadius: 14,
    paddingTop: 8, maxHeight: '75%',
  },
  modalHandle: {
    width: 36, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12,
    height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  countryRowFlag: { fontSize: 22 },
  countryRowName: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  countryRowCode: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  cityRowText: { color: '#FFFFFF', fontSize: 16 },
});
