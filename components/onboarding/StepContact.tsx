import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList } from 'react-native';
import { MapPin, Phone, ChevronDown, Search, X, Navigation } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { countryCodes, majorCities, findNearestIndianCity } from '@/constants/onboarding';
import { StepProps } from '@/types/onboarding';

export default function StepContact({ data, onUpdate, onNext }: StepProps) {
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const phoneRef = useRef<TextInput>(null);

  // Set default country code to +91 (India) if not already set
  useEffect(() => {
    if (!data.countryCode) {
      onUpdate({ countryCode: '+91' });
    }
  }, []);

  const isValid = data.phone.trim().length >= 6 && data.location.trim().length > 0;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setDetectingLocation(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nearest = findNearestIndianCity(loc.coords.latitude, loc.coords.longitude);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdate({ location: nearest });
      setShowLocationSearch(false);
    } catch (e) {
      console.log('Location detect error:', e);
    }
    setDetectingLocation(false);
  };

  const filteredCountries = countryCodes.filter(c =>
    c.country.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
  );

  const filteredCities = majorCities.filter(c =>
    c.toLowerCase().includes(locationQuery.toLowerCase())
  );

  const selectedCountry = countryCodes.find(c => c.code === data.countryCode) || countryCodes.find(c => c.code === '+91') || countryCodes[0];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>📱</Text>
            <Text style={styles.title}>How can employers reach you?</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.phoneRow}>
                <Pressable style={styles.countryCodeButton} onPress={() => setShowCountryPicker(true)}>
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCode}>{data.countryCode}</Text>
                  <ChevronDown size={14} color="#9E9E9E" />
                </Pressable>
                <TextInput
                  ref={phoneRef}
                  style={styles.phoneInput}
                  placeholder="(555) 123-4567"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="phone-pad"
                  value={data.phone}
                  onChangeText={v => onUpdate({ phone: v })}
                  testID="phone-input"
                />
              </View>
            </View>

            <View style={styles.dividerSection}>
              <View style={styles.locationTitleRow}>
                <Text style={styles.locationEmoji}>📍</Text>
                <Text style={styles.locationTitle}>Where are you located?</Text>
              </View>
            </View>

            <Pressable style={styles.locationInput} onPress={() => setShowLocationSearch(true)}>
              <MapPin size={18} color="#9E9E9E" />
              <Text style={data.location ? styles.locationValue : styles.locationPlaceholder}>
                {data.location || 'Search your city...'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Accurate contact info helps employers reach you faster</Text>
          </View>
        </Animated.View>

        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!isValid}
          testID="next-button"
        >
          <Text style={[styles.nextButtonText, !isValid && styles.nextButtonTextDisabled]}>Next →</Text>
        </Pressable>
      </ScrollView>

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
                placeholder={detectingLocation ? 'Detecting location...' : 'Search cities...'}
                placeholderTextColor="#9E9E9E"
                value={locationQuery}
                onChangeText={setLocationQuery}
                autoFocus={!detectingLocation}
                editable={!detectingLocation}
              />
              <Pressable onPress={handleDetectLocation} disabled={detectingLocation} hitSlop={8}>
                <Navigation size={18} color={detectingLocation ? '#9E9E9E' : '#111111'} />
              </Pressable>
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
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: 'space-between' },
  content: { paddingTop: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  emoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCodeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 54, borderRadius: 14, paddingHorizontal: 14,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  countryFlag: { fontSize: 18 },
  countryCode: { color: '#111111', fontSize: 15, fontWeight: '600' as const },
  phoneInput: {
    flex: 1, height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 16,
  },
  dividerSection: { paddingTop: 12 },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  locationEmoji: { fontSize: 24 },
  locationTitle: { fontSize: 20, fontWeight: '800' as const, color: '#111111' },
  locationInput: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 54, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  locationValue: { color: '#111111', fontSize: 16 },
  locationPlaceholder: { color: '#9E9E9E', fontSize: 16 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center', marginTop: 32,
  },
  nextButtonDisabled: { backgroundColor: '#E0E0E0' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  nextButtonTextDisabled: { color: '#9E9E9E' },
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
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },

});
