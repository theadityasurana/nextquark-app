import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
import StepBasicInfo from '@/components/onboarding/StepBasicInfo';
import StepResume from '@/components/onboarding/StepResume';
import StepGender from '@/components/onboarding/StepGender';
import StepVeteranStatus from '@/components/onboarding/StepVeteranStatus';
import StepDisabilityStatus from '@/components/onboarding/StepDisabilityStatus';
import StepExperienceLevel from '@/components/onboarding/StepExperienceLevel';
import StepDesiredRoles from '@/components/onboarding/StepDesiredRoles';
import StepGoal from '@/components/onboarding/StepGoal';
import StepReferralCode from '@/components/onboarding/StepReferralCode';
import StepHeardAboutUs from '@/components/onboarding/StepHeardAboutUs';
import StepPersonalizedWelcome from '@/components/onboarding/StepPersonalizedWelcome';
import StepComplete from '@/components/onboarding/StepComplete';

const TOTAL_PROGRESS_STEPS = 11;

export default function OnboardingScreen() {
  const { onboardingData, completeOnboarding, updateOnboardingData, deleteAccount } = useAuth();
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = onboardingData?.onboardingStep;
    if (saved && saved >= 1 && saved <= 11) return saved;
    return 1;
  });
  const [data, setData] = useState<OnboardingData>(() => ({
    ...defaultOnboardingData,
    ...onboardingData,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (currentStep === 12) {
      if (isSubmitting) return;
      setIsSubmitting(true);
      completeOnboarding(data).then(() => {
        router.replace('/(tabs)' as any);
      }).catch(() => setIsSubmitting(false));
      return;
    }
    animateTransition('forward', () => {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateOnboardingData({ ...data, onboardingStep: nextStep });
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
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateOnboardingData({ ...data, onboardingStep: prevStep });
    });
  }, [currentStep, animateTransition, deleteAccount]);

  const progressStep = Math.min(currentStep, TOTAL_PROGRESS_STEPS);
  const showProgress = currentStep <= 12;
  const showBackButton = currentStep >= 1 && currentStep <= 12;
  const isComplete = currentStep === 12;

  const stepProps = { data, onUpdate: handleUpdate, onNext: handleNext, onBack: handleBack };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepResume {...stepProps} />;
      case 2: return <StepBasicInfo {...stepProps} />;
      case 3: return <StepGender {...stepProps} />;
      case 4: return <StepVeteranStatus {...stepProps} />;
      case 5: return <StepDisabilityStatus {...stepProps} />;
      case 6: return <StepExperienceLevel {...stepProps} />;
      case 7: return <StepDesiredRoles {...stepProps} />;
      case 8: return <StepGoal {...stepProps} />;
      case 9: return <StepReferralCode {...stepProps} />;
      case 10: return <StepHeardAboutUs {...stepProps} />;
      case 11: return <StepPersonalizedWelcome {...stepProps} />;
      case 12: return <StepComplete {...stepProps} />;
      default: return null;
    }
  };

  return (
    <View style={[styles.container, isComplete && styles.containerComplete]}>
      <SafeAreaView style={styles.safeArea}>
        {showProgress && (
          <View style={styles.header}>
            <View style={styles.headerRow}>
              {showBackButton ? (
                <Pressable onPress={handleBack} style={styles.backButton} testID="back-button">
                  <ChevronLeft size={28} color={isComplete ? '#000000' : '#FFFFFF'} />
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
              {!isComplete && (
                <View style={styles.progressContainer}>
                  {Array.from({ length: TOTAL_PROGRESS_STEPS }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.progressDot,
                        i < progressStep && styles.progressDotCompleted,
                        i === progressStep - 1 && styles.progressDotCurrent,
                      ]}
                    />
                  ))}
                </View>
              )}
              <View style={styles.backPlaceholder} />
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
  container: { flex: 1, backgroundColor: '#000000' },
  containerComplete: { backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backPlaceholder: { width: 44 },
  progressContainer: { flex: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 8 },
  progressDot: {
    flex: 1, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotCompleted: { backgroundColor: '#FFFFFF' },
  progressDotCurrent: { backgroundColor: '#FFFFFF' },
  stepContainer: { flex: 1 },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
