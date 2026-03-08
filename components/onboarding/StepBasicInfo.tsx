import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList, Alert, Linking, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Check, MapPin, ChevronDown, Search, X, Camera, Link2, Play } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { countryCodes, majorCities } from '@/constants/onboarding';
import { StepProps } from '@/types/onboarding';

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Male' },
  { value: 'female' as const, label: 'Female' },
  { value: 'prefer_not_to_say' as const, label: 'Prefer not to say' },
];

const YOUTUBE_VIDEO_ID = 'YRvBQdJlBeo';
const YOUTUBE_THUMBNAIL = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;
const YOUTUBE_EMBED = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&playsinline=1`;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GEN_Z_TIPS = [
  { emoji: '✨', text: 'This is the only job form you\'ll ever need to fill' },
  { emoji: '🚀', text: 'One profile, unlimited opportunities' },
  { emoji: '💯', text: 'Fill once, apply everywhere' },
  { emoji: '🎯', text: 'Your info, your way, forever' },
];

export default function StepBasicInfo({ data, onUpdate, onNext }: StepProps) {
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!data.countryCode) {
      onUpdate({ countryCode: '+91' });
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const isValid = 
    data.firstName.trim().length > 0 && 
    data.lastName.trim().length > 0 && 
    data.gender !== '' &&
    data.phone.trim().length >= 6 && 
    data.location.trim().length > 0;

  const filteredCountries = countryCodes.filter(c =>
    c.country.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
  );

  const filteredCities = majorCities.filter(c =>
    c.toLowerCase().includes(locationQuery.toLowerCase())
  );

  const selectedCountry = countryCodes.find(c => c.code === data.countryCode) || countryCodes.find(c => c.code === '+91') || countryCodes[0];

  const handleOpenVideo = () => {
    setShowVideoModal(true);
  };

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
          <Pressable style={styles.videoContainer} onPress={handleOpenVideo}>
            <Image source={{ uri: YOUTUBE_THUMBNAIL }} style={styles.videoThumbnail} />
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>Watch: How it works</Text>
            </View>
          </Pressable>

          <Animated.FlatList
            data={GEN_Z_TIPS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            renderItem={({ item }) => (
              <View style={styles.tipCard}>
                <Text style={styles.tipEmoji}>{item.emoji}</Text>
                <Text style={styles.tipBannerText}>{item.text}</Text>
              </View>
            )}
            style={styles.tipCarousel}
            contentContainerStyle={styles.tipCarouselContent}
          />
          <View style={styles.dotContainer}>
            {GEN_Z_TIPS.map((_, index) => {
              const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
              ];
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={index}
                  style={[styles.dot, { opacity: dotOpacity }]}
                />
              );
            })}
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Let's get started!</Text>
          </View>
          <Text style={styles.subtitle}>Tell us about yourself</Text>

          {/* Photo Upload */}
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

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Alex"
              placeholderTextColor="#9E9E9E"
              value={data.firstName}
              onChangeText={v => onUpdate({ firstName: v })}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>LAST NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Rivera"
              placeholderTextColor="#9E9E9E"
              value={data.lastName}
              onChangeText={v => onUpdate({ lastName: v })}
              returnKeyType="next"
            />
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>GENDER</Text>
            <View style={styles.genderOptions}>
              {GENDER_OPTIONS.map((opt) => {
                const selected = data.gender === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.genderOption, selected && styles.genderOptionSelected]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      onUpdate({ gender: opt.value });
                    }}
                  >
                    <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>{opt.label}</Text>
                    {selected && <Check size={16} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
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
                onChangeText={v => onUpdate({ phone: v })}
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CURRENT LOCATION</Text>
            <Pressable style={styles.locationInput} onPress={() => setShowLocationSearch(true)}>
              <MapPin size={18} color="#9E9E9E" />
              <Text style={data.location ? styles.locationValue : styles.locationPlaceholder}>
                {data.location || 'Search your city...'}
              </Text>
            </Pressable>
          </View>

          {/* LinkedIn */}
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

          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>You can add more details like experience and education later in your profile</Text>
          </View>
        </Animated.View>

        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!isValid}
        >
          <Text style={[styles.nextButtonText, !isValid && styles.nextButtonTextDisabled]}>Complete Setup →</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showVideoModal} animationType="slide" transparent onRequestClose={() => setShowVideoModal(false)}>
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle}>How it works</Text>
              <Pressable onPress={() => setShowVideoModal(false)} style={styles.videoCloseBtn}>
                <X size={24} color="#111111" />
              </Pressable>
            </View>
            <View style={styles.videoPlayerContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  src={YOUTUBE_EMBED}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <WebView
                  source={{ uri: YOUTUBE_EMBED }}
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

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
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: 'space-between', backgroundColor: '#FFFFFF' },
  content: { paddingTop: 12 },
  videoContainer: { 
    width: '100%', 
    height: 180, 
    borderRadius: 16, 
    overflow: 'hidden' as const, 
    marginBottom: 16,
    position: 'relative' as const,
    backgroundColor: '#000',
  },
  videoThumbnail: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  videoBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },
  tipCarousel: { marginBottom: 12 },
  tipCarouselContent: { paddingHorizontal: 0 },
  tipCard: {
    width: SCREEN_WIDTH - 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD54F',
  },
  tipEmoji: { fontSize: 24 },
  tipBannerText: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: '700' as const, 
    color: '#F57F17',
    lineHeight: 20,
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  videoModalTitle: { fontSize: 18, fontWeight: '700' as const, color: '#111111' },
  videoCloseBtn: { padding: 4 },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '900' as const, color: '#111111' },
  subtitle: { fontSize: 16, color: '#616161', marginBottom: 24 },
  photoSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1, marginBottom: 8 },
  photoUpload: { alignSelf: 'center' },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#F5F5F5', 
    borderWidth: 2, 
    borderColor: '#E0E0E0', 
    borderStyle: 'dashed' as const,
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderText: { fontSize: 12, color: '#9E9E9E', fontWeight: '600' as const },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700' as const, color: '#616161', letterSpacing: 1, marginBottom: 8 },
  input: {
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 15,
  },
  genderOptions: { gap: 8 },
  genderOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 48, borderRadius: 12, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  genderOptionSelected: { borderColor: '#111111', backgroundColor: '#111111' },
  genderOptionText: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  genderOptionTextSelected: { color: '#FFFFFF' },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCodeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 50, borderRadius: 12, paddingHorizontal: 12,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  countryFlag: { fontSize: 18 },
  countryCode: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  phoneInput: {
    flex: 1, height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    color: '#111111', fontSize: 15,
  },
  locationInput: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  locationValue: { color: '#111111', fontSize: 15 },
  locationPlaceholder: { color: '#9E9E9E', fontSize: 15 },
  urlInputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  urlInput: { flex: 1, color: '#111111', fontSize: 15 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
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
});
