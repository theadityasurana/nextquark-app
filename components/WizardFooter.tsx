import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';

type WizardStep = 'topskills' | 'education' | 'experience' | 'achievements' | 'certifications';

const STEP_ROUTES: Record<WizardStep, string> = {
  topskills: '/(tabs)/profile/edit-section',
  education: '/(tabs)/profile/edit-education',
  experience: '/(tabs)/profile/edit-experience',
  achievements: '/(tabs)/profile/edit-achievements',
  certifications: '/(tabs)/profile/edit-certifications',
};

interface WizardFooterProps {
  wizardIndex: number;
  wizardTotal: number;
  incompleteSteps: WizardStep[];
  onSaveCurrent: () => Promise<void> | void;
}

export function getIncompleteSteps(profile: any): WizardStep[] {
  const steps: WizardStep[] = [];
  if (!profile?.topSkills?.length) steps.push('topskills');
  if (!profile?.education?.length) steps.push('education');
  if (!profile?.experience?.length) steps.push('experience');
  if (!profile?.achievements?.length) steps.push('achievements');
  if (!profile?.certifications?.length) steps.push('certifications');
  return steps;
}

function buildWizardParams(steps: WizardStep[], index: number, step: WizardStep) {
  const params: any = { wizardMode: '1', wizardIndex: String(index), wizardTotal: String(steps.length) };
  if (step === 'topskills') params.section = 'topskills';
  return params;
}

// Called from profile/index.tsx to start the wizard — uses push so profile stays in the stack
export function startWizardFlow(router: any, steps: WizardStep[]) {
  if (steps.length === 0) return;
  const step = steps[0];
  router.push({ pathname: STEP_ROUTES[step] as any, params: buildWizardParams(steps, 0, step) });
}

// Called from WizardFooter to move between steps — uses replace so we don't pile up screens
function navigateToWizardStep(router: any, steps: WizardStep[], index: number) {
  if (index < 0 || index >= steps.length) {
    // Done or went before first — go back to profile index
    router.back();
    return;
  }
  const step = steps[index];
  router.replace({ pathname: STEP_ROUTES[step] as any, params: buildWizardParams(steps, index, step) });
}

export default function WizardFooter({ wizardIndex, wizardTotal, incompleteSteps, onSaveCurrent }: WizardFooterProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const isFirst = wizardIndex === 0;
  const isLast = wizardIndex === wizardTotal - 1;

  const handlePrevious = () => {
    if (isFirst) {
      router.back();
    } else {
      navigateToWizardStep(router, incompleteSteps, wizardIndex - 1);
    }
  };

  const handleNext = async () => {
    await onSaveCurrent();
    if (isLast) {
      router.back();
    } else {
      navigateToWizardStep(router, incompleteSteps, wizardIndex + 1);
    }
  };

  const handleSkip = () => {
    if (isLast) {
      router.back();
    } else {
      navigateToWizardStep(router, incompleteSteps, wizardIndex + 1);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8, backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>
          {wizardIndex + 1} of {wizardTotal}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
          <View style={[styles.progressFill, { width: `${((wizardIndex + 1) / wizardTotal) * 100}%` }]} />
        </View>
      </View>
      <View style={styles.buttonRow}>
        {!isFirst ? (
          <Pressable style={[styles.prevBtn, { borderColor: colors.borderLight }]} onPress={handlePrevious}>
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={[styles.prevBtnText, { color: colors.textSecondary }]}>Previous</Text>
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
        <Pressable style={[styles.skipBtn, { borderColor: colors.borderLight }]} onPress={handleSkip}>
          <Text style={[styles.skipBtnText, { color: colors.textTertiary }]}>Skip</Text>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{isLast ? 'Done' : 'Next'}</Text>
          {!isLast && <ChevronRight size={16} color="#FFFFFF" />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressText: { fontSize: 12, fontWeight: '600' },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 2 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  spacer: { flex: 1 },
  prevBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
  prevBtnText: { fontSize: 14, fontWeight: '600' },
  skipBtn: { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  skipBtnText: { fontSize: 14, fontWeight: '600' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 13, borderRadius: 12, backgroundColor: '#111111' },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
