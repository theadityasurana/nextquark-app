import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, ScrollView, Platform, Modal, FlatList, Dimensions, PanResponder, KeyboardAvoidingView } from 'react-native';
import { Search, X, MapPin, Check } from '@/components/ProfileIcons';
import * as Haptics from 'expo-haptics';
import { suggestedRoles, currencies, majorCities } from '@/constants/onboarding';
import { StepProps } from '@/types/onboarding';

type SubStep = 'workType' | 'roles' | 'salary' | 'cities';

const workTypes = ['Remote', 'On-site', 'Hybrid'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StepPreferences({ data, onUpdate, onNext }: StepProps) {
  const [subStep, setSubStep] = useState<SubStep>('workType');
  const [roleQuery, setRoleQuery] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sliderWidthRef = useRef(SCREEN_WIDTH - 96);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [subStep]);

  const toggleWorkPref = (type: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    const prefs = data.workPreferences.includes(type)
      ? data.workPreferences.filter(p => p !== type)
      : [...data.workPreferences, type];
    onUpdate({ workPreferences: prefs });
  };

  const addRole = (role: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!data.desiredRoles.includes(role)) {
      onUpdate({ desiredRoles: [...data.desiredRoles, role] });
    }
    setRoleQuery('');
  };

  const removeRole = (role: string) => {
    onUpdate({ desiredRoles: data.desiredRoles.filter(r => r !== role) });
  };

  const addCity = (city: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!data.preferredCities.includes(city)) {
      onUpdate({ preferredCities: [...data.preferredCities, city] });
    }
    setCityQuery('');
  };

  const removeCity = (city: string) => {
    onUpdate({ preferredCities: data.preferredCities.filter(c => c !== city) });
  };

  const selectedCurrency = currencies.find(c => c.code === data.salaryCurrency) || currencies[0];

  const getSalaryConfig = useCallback(() => {
    if (selectedCurrency.code === 'INR') return { max: 50000000, step: 200000 };
    if (selectedCurrency.code === 'JPY') return { max: 50000000, step: 500000 };
    return { max: 500000, step: 5000 };
  }, [selectedCurrency.code]);

  const salaryConfig = getSalaryConfig();

  const filteredRoles = roleQuery.length > 0
    ? suggestedRoles.filter(r => r.toLowerCase().includes(roleQuery.toLowerCase()) && !data.desiredRoles.includes(r)).slice(0, 6)
    : suggestedRoles.filter(r => !data.desiredRoles.includes(r)).slice(0, 8);
  const filteredCities = cityQuery.length > 0
    ? majorCities.filter(c => c.toLowerCase().includes(cityQuery.toLowerCase()) && !data.preferredCities.includes(c))
    : majorCities.filter(c => !data.preferredCities.includes(c)).slice(0, 10);

  const needsCities = data.workPreferences.includes('On-site') || data.workPreferences.includes('Hybrid');

  const handleNext = () => {
    if (subStep === 'workType') setSubStep('roles');
    else if (subStep === 'roles') setSubStep('salary');
    else if (subStep === 'salary') {
      if (needsCities) setSubStep('cities');
      else onNext();
    }
    else onNext();
  };

  const formatSalary = (val: number) => {
    if (selectedCurrency.code === 'INR') {
      if (val >= 10000000) return `${selectedCurrency.symbol}${(val / 10000000).toFixed(1)} Cr`;
      if (val >= 100000) return `${selectedCurrency.symbol}${(val / 100000).toFixed(1)} L`;
      return `${selectedCurrency.symbol}${val}`;
    }
    if (val >= 1000000) return `${selectedCurrency.symbol}${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${selectedCurrency.symbol}${Math.round(val / 1000)}k`;
    return `${selectedCurrency.symbol}${val}`;
  };

  const dataRef = useRef(data);
  dataRef.current = data;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const salaryConfigRef = useRef(salaryConfig);
  salaryConfigRef.current = salaryConfig;

  const sliderPanResponder = useMemo(() => {
    let startX = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startX = e.nativeEvent.locationX;
        const width = sliderWidthRef.current;
        if (width > 0) {
          const pct = Math.max(0, Math.min(1, startX / width));
          const cfg = salaryConfigRef.current;
          const val = Math.round((pct * cfg.max) / cfg.step) * cfg.step;
          onUpdateRef.current({ salaryMax: Math.max(cfg.step, val), salaryMin: 0 });
        }
      },
      onPanResponderMove: (_, gesture) => {
        const x = startX + gesture.dx;
        const width = sliderWidthRef.current;
        if (width > 0) {
          const pct = Math.max(0, Math.min(1, x / width));
          const cfg = salaryConfigRef.current;
          const val = Math.round((pct * cfg.max) / cfg.step) * cfg.step;
          onUpdateRef.current({ salaryMax: Math.max(cfg.step, val), salaryMin: 0 });
        }
      },
    });
  }, []);

  if (subStep === 'workType') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>🏠</Text>
            <Text style={styles.title}>How do you prefer to work?</Text>
          </View>
          <Text style={styles.subtitle}>Select all that apply</Text>
          <View style={styles.optionsList}>
            {workTypes.map(type => {
              const selected = data.workPreferences.includes(type);
              return (
                <Pressable key={type} style={[styles.optionCard, selected && styles.optionCardSelected]} onPress={() => toggleWorkPref(type)}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{type}</Text>
                  {selected && <Check size={18} color="#111111" />}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Selecting multiple preferences increases your matches by 2x</Text>
          </View>
        </View>
        <Pressable
          style={[styles.nextButton, data.workPreferences.length === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={data.workPreferences.length === 0}
        >
          <Text style={styles.nextButtonText}>Next →</Text>
        </Pressable>
      </Animated.View>
    );
  }

  if (subStep === 'roles') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { opacity: 1 }]} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>🎯</Text>
            <Text style={styles.title}>What roles are you looking for?</Text>
          </View>
          <View style={styles.searchWrapper}>
            <Search size={16} color="#9E9E9E" />
            <TextInput style={styles.searchInput} placeholder="Search roles..." placeholderTextColor="#9E9E9E" value={roleQuery} onChangeText={setRoleQuery} />
          </View>
          {filteredRoles.length > 0 && (
            <View style={styles.chipGrid}>
              {filteredRoles.map(r => (
                <Pressable key={r} style={styles.suggestionChip} onPress={() => addRole(r)}>
                  <Text style={styles.suggestionChipText}>+ {r}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {data.desiredRoles.length > 0 && (
            <View style={styles.addedSection}>
              <Text style={styles.addedLabel}>ADDED ROLES</Text>
              <View style={styles.chipGrid}>
                {data.desiredRoles.map(r => (
                  <View key={r} style={styles.addedChip}>
                    <Text style={styles.addedChipText}>{r}</Text>
                    <Pressable onPress={() => removeRole(r)} hitSlop={8}><X size={12} color="#FFFFFF" /></Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Adding 3+ roles helps our AI find better matches</Text>
          </View>
        </ScrollView>
        <View style={styles.bottomPad}>
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (subStep === 'salary') {
    const salaryPct = Math.min(1, Math.max(0, data.salaryMax / salaryConfig.max));

    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: '#FFFFFF' }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>💰</Text>
            <Text style={styles.title}>What's your salary expectation?</Text>
          </View>

          <View style={styles.salaryDisplay}>
            <Text style={styles.salaryRange}>
              Up to {formatSalary(data.salaryMax)}
            </Text>
            <Text style={styles.salaryPeriod}>per year</Text>
          </View>

          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabel}>DESIRED SALARY (MAX)</Text>
            <View
              style={styles.sliderTrack}
              onLayout={(e) => {
                sliderWidthRef.current = e.nativeEvent.layout.width;
              }}
              {...sliderPanResponder.panHandlers}
            >
              <View style={[styles.sliderFill, { width: `${salaryPct * 100}%` }]} />
              <View style={[styles.sliderThumb, { left: `${salaryPct * 100}%` }]} />
            </View>
            <View style={styles.sliderLabelsRow}>
              <Text style={styles.sliderMinLabel}>{formatSalary(0)}</Text>
              <Text style={styles.sliderMaxLabel}>{formatSalary(salaryConfig.max)}</Text>
            </View>
          </View>

          <View style={styles.currencyRow}>
            <Text style={styles.currencyLabel}>Currency:</Text>
            <Pressable style={styles.currencyButton} onPress={() => setShowCurrencyPicker(true)}>
              <Text style={styles.currencyText}>{selectedCurrency.code} ({selectedCurrency.symbol})</Text>
            </Pressable>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>This stays private and helps us match you</Text>
          </View>
        </ScrollView>

        <View style={styles.bottomPad}>
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </Pressable>
        </View>

        <Modal visible={showCurrencyPicker} animationType="slide" transparent onRequestClose={() => setShowCurrencyPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <Pressable onPress={() => setShowCurrencyPicker(false)}><X size={22} color="#111111" /></Pressable>
              </View>
              <FlatList
                data={currencies}
                keyExtractor={item => item.code}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.currencyRow2}
                    onPress={() => {
                      onUpdate({ salaryCurrency: item.code, salaryMax: item.code === 'INR' ? 5000000 : 150000, salaryMin: 0 });
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={styles.currencySymbol}>{item.symbol}</Text>
                    <Text style={styles.currencyName}>{item.name}</Text>
                    <Text style={styles.currencyCode}>{item.code}</Text>
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>
      </Animated.View>
    );
  }

  if (subStep === 'cities') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { opacity: 1 }]} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>🌍</Text>
            <Text style={styles.title}>Where do you want to work?</Text>
          </View>
          <View style={styles.searchWrapper}>
            <Search size={16} color="#9E9E9E" />
            <TextInput style={styles.searchInput} placeholder="Search cities..." placeholderTextColor="#9E9E9E" value={cityQuery} onChangeText={setCityQuery} />
          </View>
          {filteredCities.length > 0 && (
            <View style={styles.cityList}>
              {filteredCities.slice(0, 8).map(c => (
                <Pressable key={c} style={styles.cityRow} onPress={() => addCity(c)}>
                  <MapPin size={14} color="#111111" />
                  <Text style={styles.cityText}>{c}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {data.preferredCities.length > 0 && (
            <View style={styles.addedSection}>
              <Text style={styles.addedLabel}>PREFERRED CITIES</Text>
              <View style={styles.chipGrid}>
                {data.preferredCities.map(c => (
                  <View key={c} style={styles.addedChip}>
                    <Text style={styles.addedChipText}>{c}</Text>
                    <Pressable onPress={() => removeCity(c)} hitSlop={8}><X size={12} color="#FFFFFF" /></Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
          <Pressable style={styles.checkboxRow} onPress={() => onUpdate({ openToRelocation: !data.openToRelocation })}>
            <View style={[styles.checkbox, data.openToRelocation && styles.checkboxChecked]}>
              {data.openToRelocation && <Check size={12} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLbl}>Open to relocation</Text>
          </Pressable>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Adding preferred cities improves local job recommendations</Text>
          </View>
        </ScrollView>
        <View style={styles.bottomPad}>
          <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingBottom: 24 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  emoji: { fontSize: 28 },
  title: { fontSize: 24, fontWeight: '900' as const, color: '#111111', flex: 1 },
  subtitle: { fontSize: 15, color: '#616161', marginBottom: 28 },
  optionsList: { gap: 12, marginTop: 8 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 60, borderRadius: 14, paddingHorizontal: 20,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  optionCardSelected: { borderColor: '#111111', backgroundColor: 'rgba(0,0,0,0.04)' },
  optionText: { color: '#111111', fontSize: 17, fontWeight: '600' as const },
  optionTextSelected: { color: '#111111' },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 24,
  },
  nextButtonDisabled: { backgroundColor: '#E0E0E0' },
  nextButtonText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 50, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: '#111111', fontSize: 15 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  suggestionChipText: { color: '#111111', fontSize: 13 },
  addedSection: { marginTop: 20 },
  addedLabel: { fontSize: 11, fontWeight: '700' as const, color: '#10B981', letterSpacing: 1, marginBottom: 10 },
  addedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#111111',
  },
  addedChipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' as const },
  bottomPad: { paddingTop: 8 },
  salaryDisplay: { alignItems: 'center', marginVertical: 24 },
  salaryRange: { fontSize: 28, fontWeight: '900' as const, color: '#111111' },
  salaryPeriod: { color: '#616161', fontSize: 14, marginTop: 4 },
  sliderSection: { marginBottom: 24 },
  sliderLabel: { fontSize: 11, fontWeight: '700' as const, color: '#9E9E9E', letterSpacing: 1, marginBottom: 12 },
  sliderTrack: {
    height: 40, borderRadius: 4, backgroundColor: 'transparent',
    justifyContent: 'center', position: 'relative' as const,
  },
  sliderFill: {
    height: 8, borderRadius: 4, backgroundColor: '#111111',
    position: 'absolute' as const, top: 16, left: 0,
  },
  sliderThumb: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#111111',
    position: 'absolute' as const, top: 6, marginLeft: -14,
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  sliderLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderMinLabel: { fontSize: 12, color: '#9E9E9E' },
  sliderMaxLabel: { fontSize: 12, color: '#9E9E9E' },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  currencyLabel: { color: '#616161', fontSize: 14 },
  currencyButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  currencyText: { color: '#111111', fontSize: 14, fontWeight: '600' as const },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  tipIcon: { fontSize: 14 },
  tipText: { color: '#9E9E9E', fontSize: 13, flex: 1 },
  cityList: { marginBottom: 16 },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  cityText: { color: '#111111', fontSize: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#111111', borderColor: '#111111' },
  checkboxLbl: { color: '#111111', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' as const, color: '#111111' },
  currencyRow2: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  currencySymbol: { fontSize: 18, color: '#111111', width: 30, fontWeight: '700' as const },
  currencyName: { flex: 1, color: '#111111', fontSize: 15 },
  currencyCode: { color: '#9E9E9E', fontSize: 14 },
});
