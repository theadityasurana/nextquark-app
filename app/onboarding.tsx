import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
import StepName from '@/components/onboarding/StepName';
import StepPhoto from '@/components/onboarding/StepPhoto';
import StepContact from '@/components/onboarding/StepContact';
import StepTitle from '@/components/onboarding/StepTitle';
import StepLinkedIn from '@/components/onboarding/StepLinkedIn';
import StepExperience from '@/components/onboarding/StepExperience';
import StepEducation from '@/components/onboarding/StepEducation';
import StepSkills from '@/components/onboarding/StepSkills';
import StepPreferences from '@/components/onboarding/StepPreferences';
import StepResume from '@/components/onboarding/StepResume';
import StepComplete from '@/components/onboarding/StepComplete';
import StepDemographics from '@/components/onboarding/StepDemographics';

import StepWorkAuthorization from '@/components/onboarding/StepWorkAuthorization';

const TOTAL_PROGRESS_STEPS = 14;

const STEP_BACKGROUNDS: Record<number, string> = {
  1: '#F5F5F5',
  2: '#FFFFF0',
  3: '#EDF5FF',
  4: '#F8F8FF',
  5: '#FAFAD2',
  6: '#FFFFFF',
  7: '#D8BFD8',
  8: '#FFFFF0',
  9: '#EDF5FF',
  10: '#F0FFF0',
  11: '#F8F8FF',
  12: '#FFFFF0',
  13: '#F5F5F5',
  14: '#FFFFFF',
};

const STEP_LABELS: Record<number, string> = {
  1: 'Step 1/14',
  2: 'Step 2/14',
  3: 'Step 3/14',
  4: 'Step 4/14',
  5: 'Step 5/14',
  6: 'Step 6/14',
  7: 'Step 7/14',
  8: 'Step 8/14',
  9: 'Step 9/14',
  10: 'Step 10/14',
  11: 'Step 11/14',
  12: 'Step 12/14',
  13: 'Step 13/14',
  14: 'Step 14/14',
  15: 'Almost there!',
};

export default function OnboardingScreen() {
  const { onboardingData, completeOnboarding, updateOnboardingData, deleteAccount } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(() => ({
    ...defaultOnboardingData,
    ...onboardingData,
  }));
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = useCallback((direction: 'forward' | 'back', callback: () => void) => {
    const toValue = direction === 'forward' ? -30 : 30;
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue, duration: 500, useNativeDriver: true }),
      Animated.timing(blurAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'forward' ? 30 : -30);
      blurAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim, blurAnim]);

  const handleUpdate = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const handleNext = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep === 15) {
      completeOnboarding(data).then(() => {
        router.replace('/quick-tips' as any);
      });
      return;
    }
    animateTransition('forward', () => {
      setCurrentStep(prev => prev + 1);
      updateOnboardingData(data);
    });
  }, [currentStep, data, animateTransition, completeOnboarding, updateOnboardingData]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    
    if (currentStep === 1) {
      deleteAccount();
      router.replace('/welcome');
      return;
    }
    
    animateTransition('back', () => {
      setCurrentStep(prev => prev - 1);
    });
  }, [currentStep, animateTransition, deleteAccount]);

  const progressStep = Math.min(currentStep, TOTAL_PROGRESS_STEPS);
  const showProgress = currentStep <= 15;
  const showBackButton = currentStep >= 1 && currentStep <= 15;

  const stepProps = { data, onUpdate: handleUpdate, onNext: handleNext, onBack: handleBack };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepResume {...stepProps} />;
      case 2: return <StepName {...stepProps} />;
      case 3: return <StepPhoto {...stepProps} />;
      case 4: return <StepContact {...stepProps} />;
      case 5: return <StepTitle {...stepProps} />;
      case 6: return <StepLinkedIn {...stepProps} />;
      case 7: return <StepExperience {...stepProps} />;
      case 8: return <StepEducation {...stepProps} />;
      case 9: return <StepSkills {...stepProps} />;
      case 10: return <StepPreferences {...stepProps} />;
      case 11: return <StepDemographics {...stepProps} type="veteran" />;
      case 12: return <StepDemographics {...stepProps} type="disability" />;
      case 13: return <StepDemographics {...stepProps} type="ethnicity" />;
      case 14: return <StepWorkAuthorization {...stepProps} />;
      case 15: return <StepComplete {...stepProps} />;
      default: return null;
    }
  };

  const stepBg = STEP_BACKGROUNDS[currentStep] || '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: stepBg }]}>
      <SafeAreaView style={styles.safeArea}>
        {showProgress && (
          <View style={styles.header}>
            <View style={styles.headerRow}>
              {showBackButton ? (
                <Pressable onPress={handleBack} style={styles.backButton} testID="back-button">
                  <ArrowLeft size={22} color="#111111" />
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
              <Text style={styles.stepLabel}>{STEP_LABELS[currentStep] || ''}</Text>
              <View style={styles.backPlaceholder} />
            </View>

            <View style={styles.progressContainer}>
              {Array.from({ length: TOTAL_PROGRESS_STEPS }, (_, i) => {
                const stepNum = i + 1;
                const isCompleted = stepNum < progressStep;
                const isCurrent = stepNum === progressStep;
                return (
                  <View key={i} style={styles.progressDotWrapper}>
                    <View style={[
                      styles.progressDot,
                      isCompleted && styles.progressDotCompleted,
                      isCurrent && styles.progressDotCurrent,
                    ]} />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Animated.View style={[styles.stepContainer, {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }]}>
          {renderStep()}
        </Animated.View>

        <Animated.View style={[styles.blurOverlay, { opacity: blurAnim }]} pointerEvents="none">
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backPlaceholder: { width: 40 },
  stepLabel: { color: '#616161', fontSize: 13, fontWeight: '600' as const },
  progressContainer: { flexDirection: 'row', gap: 4 },
  progressDotWrapper: { flex: 1 },
  progressDot: {
    height: 4, borderRadius: 2, backgroundColor: '#E0E0E0',
  },
  progressDotCompleted: { backgroundColor: '#111111' },
  progressDotCurrent: { backgroundColor: '#111111' },
  stepContainer: { flex: 1 },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
