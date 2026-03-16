import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingData, defaultOnboardingData } from '@/types/onboarding';
import StepBasicInfo from '@/components/onboarding/StepBasicInfo';
import StepResume from '@/components/onboarding/StepResume';
import StepComplete from '@/components/onboarding/StepComplete';

const TOTAL_PROGRESS_STEPS = 2;

const STEP_BACKGROUNDS: Record<number, string> = {
  1: '#111111',
  2: '#FFFFF0',
  3: '#FFFFFF',
};

const STEP_LABELS: Record<number, string> = {
  1: 'Step 1/2',
  2: 'Step 2/2',
  3: 'Almost there!',
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
    if (currentStep === 3) {
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
  const showProgress = currentStep <= 3;
  const showBackButton = currentStep >= 1 && currentStep <= 3;

  const stepProps = { data, onUpdate: handleUpdate, onNext: handleNext, onBack: handleBack };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepResume {...stepProps} />;
      case 2: return <StepBasicInfo {...stepProps} />;
      case 3: return <StepComplete {...stepProps} />;
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
                  <ArrowLeft size={22} color={currentStep === 1 ? '#FFFFFF' : '#111111'} />
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
              <Text style={[styles.stepLabel, currentStep === 1 && { color: '#9E9E9E' }]}>{STEP_LABELS[currentStep] || ''}</Text>
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
                      currentStep === 1 && !isCompleted && !isCurrent && { backgroundColor: '#333333' },
                      currentStep === 1 && (isCompleted || isCurrent) && { backgroundColor: '#FFFFFF' },
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
