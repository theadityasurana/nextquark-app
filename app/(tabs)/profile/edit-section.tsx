import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Image as RNImage, LayoutAnimation, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const animateChip = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); haptic(); };
const haptic = () => { if (Platform.OS !== 'web') Haptics.selectionAsync(); };
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Star, X, Search, MapPin, Plus, ChevronRight, Briefcase, Wifi, Building2, Globe, Shield, Heart, Users, AlertCircle } from '@/components/ProfileIcons';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';
import Colors from '@/constants/colors';
import { suggestedSkills, suggestedRoles, majorCities } from '@/constants/onboarding';
import { ROLE_CATEGORIES, CATEGORY_ROLES } from '@/constants/roles';
import { supabase, getCompanyLogoStorageUrl } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import WizardFooter, { getIncompleteSteps } from '@/components/WizardFooter';

const JOB_TYPE_OPTIONS = [
  { key: 'Full-time', label: 'Full-time', icon: Briefcase, color: '#1E88E5' },
  { key: 'Part-time', label: 'Part-time', icon: Globe, color: '#7C4DFF' },
  { key: 'Internship', label: 'Internship', icon: Star, color: '#F59E0B' },
  { key: 'Contract', label: 'Contract', icon: Shield, color: '#EF4444' },
  { key: 'Freelance', label: 'Freelance', icon: Globe, color: '#10B981' },
];
const WORK_MODE_OPTIONS = [
  { key: 'Remote', label: 'Remote', icon: Wifi, color: '#10B981' },
  { key: 'Onsite', label: 'Onsite', icon: Building2, color: '#1E88E5' },
  { key: 'Hybrid', label: 'Hybrid', icon: Globe, color: '#F59E0B' },
];
const VETERAN_OPTIONS = ['I am not a protected veteran', 'I am a veteran', 'I am a disabled veteran', 'I am a recently separated veteran', 'I am an active duty wartime or campaign badge veteran', 'I am an Armed Forces service medal veteran', 'Prefer not to disclose'];
const DISABILITY_OPTIONS = ['Yes, I have a disability (or previously had a disability)', 'No, I do not have a disability', 'Prefer not to disclose'];
const ETHNICITY_OPTIONS = ['White', 'Hispanic or Latino', 'Black or African American', 'Asian', 'Southeast Asian', 'Native Hawaiian or Other Pacific Islander', 'American Indian or Alaska Native', 'Prefer not to disclose'];
const RACE_OPTIONS = ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Other Pacific Islander', 'White', 'Hispanic or Latino', 'Two or More Races', 'Prefer not to disclose'];

type SectionType = 'coverletter' | 'jobrequirements' | 'equalopportunity' | 'topskills' | 'jobtypeprefs' | 'workmodeprefs' | 'desiredroles' | 'preferredcities' | 'favoritecompanies';

export default function EditSectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ section: string; wizardMode?: string; wizardIndex?: string; wizardTotal?: string }>();
  const section = (params.section || 'coverletter') as SectionType;
  const isWizard = params.wizardMode === '1';
  const wizardIndex = parseInt(params.wizardIndex || '0', 10);
  const wizardTotal = parseInt(params.wizardTotal || '0', 10);
  const { userProfile: supabaseProfile, saveProfile } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const incompleteSteps = isWizard ? getIncompleteSteps(supabaseProfile) : [];

  // Cover letter
  const [coverLetter, setCoverLetter] = useState(supabaseProfile?.coverLetter || '');
  // Job requirements
  const [workAuth, setWorkAuth] = useState(supabaseProfile?.workAuthorizationStatus || '');
  const [jobReqs, setJobReqs] = useState(supabaseProfile?.jobRequirements?.join(', ') || '');
  // Equal opportunity
  const [veteran, setVeteran] = useState(supabaseProfile?.veteranStatus || '');
  const [disability, setDisability] = useState(supabaseProfile?.disabilityStatus || '');
  const [ethnicity, setEthnicity] = useState(supabaseProfile?.ethnicity || '');
  const [race, setRace] = useState(supabaseProfile?.race || '');
  // Skills
  const [skills, setSkills] = useState<string[]>(supabaseProfile?.skills || []);
  const [topSkills, setTopSkills] = useState<string[]>(supabaseProfile?.topSkills || []);
  const [skillQuery, setSkillQuery] = useState('');
  // Preferences
  const [jobPrefs, setJobPrefs] = useState<string[]>(supabaseProfile?.jobPreferences || []);
  const [workModePrefs, setWorkModePrefs] = useState<string[]>(supabaseProfile?.workModePreferences || []);
  // Desired roles
  const [desiredRoles, setDesiredRoles] = useState<string[]>(supabaseProfile?.desiredRoles || []);
  const [desiredRoleCategories, setDesiredRoleCategories] = useState<string[]>(supabaseProfile?.desiredRoleCategories || []);
  const [roleQuery, setRoleQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [activeRoleCategory, setActiveRoleCategory] = useState<string | null>(null);
  // Preferred cities
  const [preferredCities, setPreferredCities] = useState<string[]>(supabaseProfile?.preferredCities || []);
  const [cityQuery, setCityQuery] = useState('');
  // Favorite companies
  const [favCompanies, setFavCompanies] = useState<string[]>(supabaseProfile?.favoriteCompanies || []);
  const [companySearch, setCompanySearch] = useState('');
  const [eoTab, setEoTab] = useState<'veteran' | 'disability' | 'ethnicity' | 'race'>('veteran');
  const [roleCatTab, setRoleCatTab] = useState<string>('_selected');

  const hasChanges = (() => {
    const p = supabaseProfile;
    if (!p) return false;
    switch (section) {
      case 'coverletter': return coverLetter !== (p.coverLetter || '');
      case 'jobrequirements': return workAuth !== (p.workAuthorizationStatus || '') || jobReqs !== (p.jobRequirements?.join(', ') || '');
      case 'equalopportunity': return veteran !== (p.veteranStatus || '') || disability !== (p.disabilityStatus || '') || ethnicity !== (p.ethnicity || '') || race !== (p.race || '');
      case 'topskills': return JSON.stringify(skills) !== JSON.stringify(p.skills || []) || JSON.stringify(topSkills) !== JSON.stringify(p.topSkills || []);
      case 'jobtypeprefs': return JSON.stringify([...jobPrefs].sort()) !== JSON.stringify([...(p.jobPreferences || [])].sort());
      case 'workmodeprefs': return JSON.stringify([...workModePrefs].sort()) !== JSON.stringify([...(p.workModePreferences || [])].sort());
      case 'desiredroles': return JSON.stringify([...desiredRoles].sort()) !== JSON.stringify([...(p.desiredRoles || [])].sort());
      case 'preferredcities': return JSON.stringify([...preferredCities].sort()) !== JSON.stringify([...(p.preferredCities || [])].sort());
      case 'favoritecompanies': return JSON.stringify([...favCompanies].sort()) !== JSON.stringify([...(p.favoriteCompanies || [])].sort());
      default: return false;
    }
  })();

  const { data: allCompaniesData = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['all-companies-data'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('name, logo_url').order('name');
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
    enabled: section === 'favoritecompanies',
  });

  const getTitle = (): string => {
    switch (section) {
      case 'coverletter': return 'Cover Letter';
      case 'jobrequirements': return 'Job Requirements';
      case 'equalopportunity': return 'Equal Opportunity Info';
      case 'topskills': return 'Top Skills';
      case 'jobtypeprefs': return 'Job Type Preferences';
      case 'workmodeprefs': return 'Work Mode Preferences';
      case 'desiredroles': return 'Desired Roles';
      case 'preferredcities': return 'Preferred Cities';
      case 'favoritecompanies': return 'Favourite Companies';
      default: return 'Edit';
    }
  };

  const getGradientColors = (): [string, string, string] => {
    switch (section) {
      case 'equalopportunity': return ['#4A1942', '#6B2D5B', colors.background];
      case 'desiredroles': return ['#1A365D', '#2A4A7F', colors.background];
      case 'preferredcities': return ['#134E4A', '#1E6B5E', colors.background];
      case 'jobtypeprefs': return ['#3B1F2B', '#5C2D42', colors.background];
      case 'workmodeprefs': return ['#1E3A2F', '#2D5A47', colors.background];
      default: return ['#0F172A', '#1E293B', colors.background];
    }
  };

  const getBannerUri = (): string => {
    switch (section) {
      case 'equalopportunity': return 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=200&fit=crop';
      case 'desiredroles': return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=200&fit=crop';
      case 'preferredcities': return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=200&fit=crop';
      case 'jobtypeprefs': return 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=200&fit=crop';
      case 'workmodeprefs': return 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800&h=200&fit=crop';
      case 'topskills': return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=200&fit=crop';
      case 'coverletter': return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=200&fit=crop';
      case 'jobrequirements': return 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=200&fit=crop';
      case 'favoritecompanies': return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=200&fit=crop';
      default: return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=200&fit=crop';
    }
  };

  const getSubtitle = (): string => {
    switch (section) {
      case 'coverletter': return 'Write a compelling letter to stand out';
      case 'jobrequirements': return 'Help employers match you accurately';
      case 'equalopportunity': return 'Confidential information for compliance';
      case 'topskills': return 'Highlight your strongest abilities';
      case 'jobtypeprefs': return 'Select employment types you\'re open to';
      case 'workmodeprefs': return 'Pick your ideal work arrangement';
      case 'desiredroles': return 'Target the roles that match your ambitions';
      case 'preferredcities': return 'Choose where you want to build your career';
      case 'favoritecompanies': return 'Companies you\'d love to work at';
      default: return '';
    }
  };

  const handleSave = async () => {
    if (!supabaseProfile) return;
    const updates: any = { ...supabaseProfile };
    switch (section) {
      case 'coverletter': updates.coverLetter = coverLetter; break;
      case 'jobrequirements':
        updates.workAuthorizationStatus = workAuth.trim() || undefined;
        updates.jobRequirements = jobReqs.split(',').map(r => r.trim()).filter(Boolean);
        break;
      case 'equalopportunity':
        updates.veteranStatus = veteran || undefined;
        updates.disabilityStatus = disability || undefined;
        updates.ethnicity = ethnicity || undefined;
        updates.race = race || undefined;
        break;
      case 'topskills': updates.skills = skills; updates.topSkills = topSkills; break;
      case 'jobtypeprefs': updates.jobPreferences = jobPrefs; break;
      case 'workmodeprefs': updates.workModePreferences = workModePrefs; break;
      case 'desiredroles': updates.desiredRoles = desiredRoles; updates.desiredRoleCategories = desiredRoleCategories; break;
      case 'preferredcities': updates.preferredCities = preferredCities; break;
      case 'favoritecompanies': updates.favoriteCompanies = favCompanies; break;
    }
    await saveProfile(updates);
    router.back();
  };

  const handleSaveOnly = async () => {
    if (!supabaseProfile) return;
    const updates: any = { ...supabaseProfile };
    switch (section) {
      case 'topskills': updates.skills = skills; updates.topSkills = topSkills; break;
      default: break;
    }
    await saveProfile(updates);
  };

  const toggleTopSkill = (skill: string) => {
    animateChip();
    if (topSkills.includes(skill)) { setTopSkills(prev => prev.filter(s => s !== skill)); }
    else if (topSkills.length < 5) { setTopSkills(prev => [...prev, skill]); }
    else { Alert.alert('Limit', 'Max 5 top skills'); }
  };

  const removeSkill = (idx: number) => {
    animateChip();
    const removed = skills[idx];
    setSkills(prev => prev.filter((_, i) => i !== idx));
    setTopSkills(prev => prev.filter(s => s !== removed));
  };

  const getRoleCategoryForRole = (role: string): string | null => {
    for (const [catKey, roles] of Object.entries(CATEGORY_ROLES)) {
      if (roles.includes(role)) return catKey;
    }
    return null;
  };

  const getGroupedSelectedRoles = () => {
    const grouped: Record<string, string[]> = {};
    const uncategorized: string[] = [];
    desiredRoles.forEach(role => {
      const catKey = getRoleCategoryForRole(role);
      if (catKey) {
        if (!grouped[catKey]) grouped[catKey] = [];
        grouped[catKey].push(role);
      } else {
        uncategorized.push(role);
      }
    });
    return { grouped, uncategorized };
  };

  const renderContent = () => {
    switch (section) {
      case 'coverletter':
        return (
          <>
            <TextInput style={[s.input, s.textArea, { minHeight: 200, backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="Write your cover letter (up to 1000 words)..." placeholderTextColor={colors.textTertiary} value={coverLetter} onChangeText={t => { if (t.split(/\s+/).length <= 1000) setCoverLetter(t); }} multiline autoFocus />
            <Text style={[s.charCount, { color: colors.textTertiary }]}>{coverLetter.split(/\s+/).filter(w => w).length}/1000 words</Text>
          </>
        );
      case 'jobrequirements':
        return (
          <>
            <Text style={[s.helperText, { color: colors.textSecondary }]}>This information helps match you with jobs that fit your work authorization and specific requirements. Employers use this to filter candidates early — filling it out accurately saves you time.</Text>
            <Text style={[s.label, { color: colors.textSecondary }]}>Work Authorization Status</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. US Citizen, H1B..." placeholderTextColor={colors.textTertiary} value={workAuth} onChangeText={setWorkAuth} />
            <Text style={[s.label, { color: colors.textSecondary }]}>Job Requirements (comma-separated)</Text>
            <TextInput style={[s.input, s.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Security Clearance..." placeholderTextColor={colors.textTertiary} value={jobReqs} onChangeText={setJobReqs} multiline numberOfLines={3} />
          </>
        );
      case 'equalopportunity':
        const EO_TABS = [
          { key: 'veteran' as const, label: 'Veteran', icon: Shield, color: '#8B5CF6' },
          { key: 'disability' as const, label: 'Disability', icon: Heart, color: '#EF4444' },
          { key: 'ethnicity' as const, label: 'Ethnicity', icon: Users, color: '#3B82F6' },
          { key: 'race' as const, label: 'Race', icon: Globe, color: '#10B981' },
        ];
        const eoOptions = eoTab === 'veteran' ? VETERAN_OPTIONS : eoTab === 'disability' ? DISABILITY_OPTIONS : eoTab === 'ethnicity' ? ETHNICITY_OPTIONS : RACE_OPTIONS;
        const eoValue = eoTab === 'veteran' ? veteran : eoTab === 'disability' ? disability : eoTab === 'ethnicity' ? ethnicity : race;
        const eoSetter = eoTab === 'veteran' ? setVeteran : eoTab === 'disability' ? setDisability : eoTab === 'ethnicity' ? setEthnicity : setRace;
        const eoTabMeta = EO_TABS.find(t => t.key === eoTab)!;
        return (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScrollRow} contentContainerStyle={s.tabScrollContent}>
              {EO_TABS.map(tab => {
                const active = eoTab === tab.key;
                const Icon = tab.icon;
                return (
                  <Pressable key={tab.key} style={[s.tabPill, active && { backgroundColor: colors.secondary, borderColor: colors.secondary }]} onPress={() => setEoTab(tab.key)}>
                    <Icon size={14} color={active ? colors.surface : tab.color} />
                    <Text style={[s.tabPillText, { color: active ? colors.surface : colors.textPrimary }]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {eoOptions.map(o => {
              const sel = eoValue === o;
              return (
                <Pressable key={o} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => eoSetter(o)}>
                  <View style={[s.levelIconWrap, { backgroundColor: `${eoTabMeta.color}20` }]}>
                    <eoTabMeta.icon size={18} color={eoTabMeta.color} />
                  </View>
                  <Text style={[s.levelOptionText, { color: sel ? colors.surface : colors.textPrimary }]}>{o}</Text>
                  {sel && <Check size={16} color={colors.surface} />}
                </Pressable>
              );
            })}
          </>
        );
      case 'topskills':
        const sortedSkills = [...skills].sort((a, b) => {
          const aTop = topSkills.includes(a) ? 0 : 1;
          const bTop = topSkills.includes(b) ? 0 : 1;
          return aTop - bTop;
        });
        return (
          <>
            {skillQuery ? (
              <View style={s.chipGrid}>
                {suggestedSkills.filter(sk => sk.toLowerCase().includes(skillQuery.toLowerCase()) && !skills.includes(sk)).slice(0, 20).map(sk => (
                  <Pressable key={sk} style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => { animateChip(); setSkills(prev => [...prev, sk]); setSkillQuery(''); }}>
                    <Plus size={12} color={colors.textPrimary} /><Text style={[s.chipText, { color: colors.textPrimary }]}>{sk}</Text>
                  </Pressable>
                ))}
                {!suggestedSkills.some(sk => sk.toLowerCase() === skillQuery.toLowerCase()) && (
                  <Pressable style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => { animateChip(); setSkills(prev => [...prev, skillQuery]); setSkillQuery(''); }}>
                    <Plus size={12} color={colors.accent} /><Text style={[s.chipText, { color: colors.accent }]}>Add "{skillQuery}"</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
            <Text style={[s.label, { color: colors.textTertiary }]}>Tap to toggle top skill (max 5). Long-press to remove. {topSkills.length}/5</Text>
            <View style={s.chipGrid}>
              {sortedSkills.map((sk, idx) => {
                const isTop = topSkills.includes(sk);
                const originalIdx = skills.indexOf(sk);
                return (
                  <Pressable key={sk} style={[s.chip, { backgroundColor: isTop ? (theme === 'dark' ? '#3A2F1B' : '#FFF8E1') : colors.secondary, borderColor: isTop ? '#D4A017' : colors.secondary, borderWidth: isTop ? 2 : 1 }]} onPress={() => toggleTopSkill(sk)} onLongPress={() => removeSkill(originalIdx)}>
                    {isTop && <Star size={12} color="#D4A017" />}
                    <Text style={[s.chipText, { color: isTop ? '#8B6914' : colors.textInverse }]}>{sk}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        );
      case 'jobtypeprefs':
        return (
          <>
            <View style={s.levelList}>
              {JOB_TYPE_OPTIONS.map(({ key, label, icon: Icon, color }) => {
                const sel = jobPrefs.includes(key);
                return (
                  <Pressable key={key} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => { animateChip(); setJobPrefs(prev => sel ? prev.filter(x => x !== key) : [...prev, key]); }}>
                    <View style={[s.levelIconWrap, { backgroundColor: `${color}20` }]}>
                      <Icon size={20} color={color} />
                    </View>
                    <Text style={[s.levelOptionText, { color: sel ? colors.surface : colors.textPrimary }]}>{label}</Text>
                    {sel && <Check size={16} color={colors.surface} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        );
      case 'workmodeprefs':
        return (
          <>
            <View style={s.levelList}>
              {WORK_MODE_OPTIONS.map(({ key, label, icon: Icon, color }) => {
                const sel = workModePrefs.includes(key);
                return (
                  <Pressable key={key} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => { animateChip(); setWorkModePrefs(prev => sel ? prev.filter(x => x !== key) : [...prev, key]); }}>
                    <View style={[s.levelIconWrap, { backgroundColor: `${color}20` }]}>
                      <Icon size={20} color={color} />
                    </View>
                    <Text style={[s.levelOptionText, { color: sel ? colors.surface : colors.textPrimary }]}>{label}</Text>
                    {sel && <Check size={16} color={colors.surface} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        );
      case 'desiredroles':
        const allRolesFlat = Object.values(CATEGORY_ROLES).flat();
        const roleSearchResults = roleSearchQuery.trim()
          ? allRolesFlat.filter(r => r.toLowerCase().includes(roleSearchQuery.toLowerCase()) && !desiredRoles.includes(r)).slice(0, 20)
          : [];
        const { grouped: groupedRoles, uncategorized: uncatRoles } = getGroupedSelectedRoles();
        const hasCustomMatch = roleSearchQuery.trim() && !allRolesFlat.some(r => r.toLowerCase() === roleSearchQuery.trim().toLowerCase()) && !desiredRoles.includes(roleSearchQuery.trim());
        return (
          <>
            {roleSearchQuery.trim() ? (
              <View style={s.chipGrid}>
                {roleSearchResults.map(role => (
                  <Pressable key={role} style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => { animateChip(); setDesiredRoles(prev => [...prev, role]); }}>
                    <Plus size={12} color={colors.textPrimary} />
                    <Text style={[s.chipText, { color: colors.textPrimary }]}>{role}</Text>
                  </Pressable>
                ))}
                {hasCustomMatch && (
                  <Pressable style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.accent }]} onPress={() => { animateChip(); setDesiredRoles(prev => [...prev, roleSearchQuery.trim()]); setRoleSearchQuery(''); }}>
                    <Plus size={12} color={colors.accent} />
                    <Text style={[s.chipText, { color: colors.accent }]}>Add "{roleSearchQuery.trim()}"</Text>
                  </Pressable>
                )}
                {roleSearchResults.length === 0 && !hasCustomMatch && (
                  <Text style={[s.label, { color: colors.textTertiary }]}>No roles found for "{roleSearchQuery}"</Text>
                )}
              </View>
            ) : roleCatTab === '_selected' ? (
              desiredRoles.length === 0 ? (
                <Text style={[s.label, { color: colors.textTertiary, textAlign: 'center', marginTop: 20 }]}>No roles selected yet. Pick a category above to start.</Text>
              ) : (
                <>
                  {Object.entries(groupedRoles).map(([catKey, roles]) => {
                    const cat = ROLE_CATEGORIES.find(c => c.key === catKey);
                    return (
                      <View key={catKey} style={{ marginBottom: 10 }}>
                        <Text style={[s.catGroupLabel, { color: cat?.color || colors.textTertiary }]}>{cat?.emoji} {cat?.label}</Text>
                        <View style={s.chipGrid}>
                          {roles.map((role, idx) => (
                            <Pressable key={idx} style={[s.chip, { backgroundColor: colors.secondary, borderColor: colors.secondary }]} onPress={() => { animateChip(); setDesiredRoles(prev => prev.filter(r => r !== role)); }}>
                              <Text style={[s.chipText, { color: colors.surface }]}>{role}</Text>
                              <X size={10} color={colors.surface} />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                  {uncatRoles.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={[s.catGroupLabel, { color: colors.textTertiary }]}>Custom Roles</Text>
                      <View style={s.chipGrid}>
                        {uncatRoles.map((role, idx) => (
                          <Pressable key={idx} style={[s.chip, { backgroundColor: colors.secondary, borderColor: colors.secondary }]} onPress={() => { animateChip(); setDesiredRoles(prev => prev.filter(r => r !== role)); }}>
                            <Text style={[s.chipText, { color: colors.surface }]}>{role}</Text>
                            <X size={10} color={colors.surface} />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )
            ) : (
              <View style={s.chipGrid}>
                {(CATEGORY_ROLES[roleCatTab] || []).map(role => {
                  const sel = desiredRoles.includes(role);
                  return (
                    <Pressable key={role} style={[s.chip, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => {
                      animateChip();
                      setDesiredRoles(prev => sel ? prev.filter(r => r !== role) : [...prev, role]);
                      if (!sel && !desiredRoleCategories.includes(roleCatTab)) setDesiredRoleCategories(prev => [...prev, roleCatTab]);
                    }}>
                      {sel && <Check size={10} color={colors.surface} />}
                      <Text style={[s.chipText, { color: sel ? colors.surface : colors.textPrimary }]}>{role}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        );
      case 'preferredcities':
        return (
          <>
            <View style={s.chipGrid}>
              {majorCities.filter(c => !cityQuery || c.toLowerCase().includes(cityQuery.toLowerCase())).map(city => {
                const sel = preferredCities.includes(city);
                return (
                  <Pressable key={city} style={[s.chip, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => { animateChip(); setPreferredCities(prev => sel ? prev.filter(c => c !== city) : [...prev, city]); }}>
                    <MapPin size={12} color={sel ? colors.surface : colors.textPrimary} />
                    <Text style={[s.chipText, { color: sel ? colors.surface : colors.textPrimary }]}>{city}</Text>
                    {sel && <Check size={14} color={colors.surface} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        );
      case 'favoritecompanies':
        return (
          <>
            {isLoadingCompanies ? (
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
              <View style={s.chipGrid}>
                {allCompaniesData.filter((c: any) => !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase())).map((company: any) => {
                  const sel = favCompanies.includes(company.name);
                  const logoUrl = company.logo_url ? getCompanyLogoStorageUrl(company.logo_url) : null;
                  return (
                    <Pressable key={company.name} style={[s.chip, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => { animateChip(); setFavCompanies(prev => sel ? prev.filter(c => c !== company.name) : [...prev, company.name]); }}>
                      {logoUrl && <Image source={{ uri: logoUrl }} style={{ width: 18, height: 18, borderRadius: 4 }} />}
                      <Text style={[s.chipText, { color: sel ? colors.surface : colors.textPrimary }]}>{company.name}</Text>
                      {sel && <Check size={14} color={colors.surface} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        );
      default: return null;
    }
  };

  // Full-screen role picker for a category (like onboarding)
  if (section === 'desiredroles' && activeRoleCategory) {
    const cat = ROLE_CATEGORIES.find(c => c.key === activeRoleCategory);
    const roles = CATEGORY_ROLES[activeRoleCategory] || [];
    const selectedInCat = desiredRoles.filter(r => roles.includes(r));
    return (
      <View style={[s.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={() => setActiveRoleCategory(null)}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{cat?.emoji} {cat?.label}</Text>
          <View style={{ width: 40 }} />
        </View>
        {selectedInCat.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 8 }}>
            {selectedInCat.map((role, idx) => (
              <Pressable key={idx} style={[s.chip, { backgroundColor: colors.secondary, borderColor: colors.secondary }]} onPress={() => setDesiredRoles(prev => prev.filter(r => r !== role))}>
                <Text style={[s.chipText, { color: colors.surface }]}>{role}</Text>
                <X size={10} color={colors.surface} />
              </Pressable>
            ))}
          </View>
        )}
        <FlatList
          data={roles}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const sel = desiredRoles.includes(item);
            return (
              <Pressable
                style={[s.roleRow, { backgroundColor: sel ? colors.secondary : 'transparent', borderBottomColor: colors.borderLight }]}
                onPress={() => setDesiredRoles(prev => sel ? prev.filter(r => r !== item) : [...prev, item])}
              >
                <Text style={[s.roleRowText, { color: sel ? colors.surface : colors.textPrimary }]}>{item}</Text>
                {sel && <Check size={14} color={colors.surface} />}
              </Pressable>
            );
          }}
        />
        <View style={[s.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable style={[s.saveBtn, { backgroundColor: colors.secondary }]} onPress={() => setActiveRoleCategory(null)}>
            <Text style={[s.saveBtnText, { color: colors.surface }]}>Done with {cat?.label}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={getGradientColors()} style={s.heroGradient}>
        <View style={s.header}>
          <Pressable style={s.backBtnGrad} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={s.headerTitleGrad}>{getTitle()}</Text>
          <View style={{ width: 40 }} />
        </View>
        <RNImage source={{ uri: getBannerUri() }} style={s.heroBanner} />
        {getSubtitle() ? <Text style={[s.heroSubtext, { color: colors.textPrimary }]}>{getSubtitle()}</Text> : null}
      </LinearGradient>
      {(section === 'preferredcities' || section === 'topskills' || section === 'favoritecompanies' || section === 'desiredroles') && (
        <View style={s.stickyBarWrap}>
          {section === 'preferredcities' && (
            <View style={[s.searchBoxThin, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Search size={14} color={colors.textTertiary} />
              <TextInput style={[s.searchInputThin, { color: colors.textPrimary }]} placeholder="Search cities..." placeholderTextColor={colors.textTertiary} value={cityQuery} onChangeText={setCityQuery} />
            </View>
          )}
          {section === 'topskills' && (
            <View style={[s.searchBoxThin, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Search size={14} color={colors.textTertiary} />
              <TextInput style={[s.searchInputThin, { color: colors.textPrimary }]} placeholder="Search skills..." placeholderTextColor={colors.textTertiary} value={skillQuery} onChangeText={setSkillQuery} />
            </View>
          )}
          {section === 'favoritecompanies' && (
            <View style={[s.searchBoxThin, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Search size={14} color={colors.textTertiary} />
              <TextInput style={[s.searchInputThin, { color: colors.textPrimary }]} placeholder="Search companies..." placeholderTextColor={colors.textTertiary} value={companySearch} onChangeText={setCompanySearch} />
            </View>
          )}
          {section === 'desiredroles' && (
            <View style={[s.searchBoxThin, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Search size={14} color={colors.textTertiary} />
              <TextInput style={[s.searchInputThin, { color: colors.textPrimary }]} placeholder="Search all roles..." placeholderTextColor={colors.textTertiary} value={roleSearchQuery} onChangeText={setRoleSearchQuery} />
            </View>
          )}
          {section === 'desiredroles' && !roleSearchQuery.trim() && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stickyTabRow} contentContainerStyle={s.tabScrollContent}>
              <Pressable style={[s.tabPill, roleCatTab === '_selected' && { backgroundColor: colors.secondary, borderColor: colors.secondary }]} onPress={() => setRoleCatTab('_selected')}>
                <Check size={14} color={roleCatTab === '_selected' ? colors.surface : colors.accent} />
                <Text style={[s.tabPillText, { color: roleCatTab === '_selected' ? colors.surface : colors.textPrimary }]}>Selected</Text>
                {desiredRoles.length > 0 && <View style={[s.tabPillBadge, { backgroundColor: roleCatTab === '_selected' ? colors.surface : colors.accent }]}><Text style={[s.tabPillBadgeText, { color: roleCatTab === '_selected' ? colors.secondary : '#FFF' }]}>{desiredRoles.length}</Text></View>}
              </Pressable>
              {ROLE_CATEGORIES.map(cat => {
                const active = roleCatTab === cat.key;
                const catRoles = CATEGORY_ROLES[cat.key] || [];
                const selectedInCat = desiredRoles.filter(r => catRoles.includes(r));
                return (
                  <Pressable key={cat.key} style={[s.tabPill, active && { backgroundColor: colors.secondary, borderColor: colors.secondary }]} onPress={() => setRoleCatTab(cat.key)}>
                    <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                    <Text style={[s.tabPillText, { color: active ? colors.surface : colors.textPrimary }]}>{cat.label}</Text>
                    {selectedInCat.length > 0 && <View style={[s.tabPillBadge, { backgroundColor: active ? colors.surface : cat.color }]}><Text style={[s.tabPillBadgeText, { color: active ? colors.secondary : '#FFF' }]}>{selectedInCat.length}</Text></View>}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
      {isWizard ? (
        <WizardFooter
          wizardIndex={wizardIndex}
          wizardTotal={wizardTotal}
          incompleteSteps={incompleteSteps}
          onSaveCurrent={handleSaveOnly}
        />
      ) : (
        <View style={[s.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable style={[s.saveBtn, { backgroundColor: colors.secondary }, !hasChanges && { opacity: 0.4 }]} onPress={handleSave} disabled={!hasChanges}>
            <Check size={18} color={colors.surface} />
            <Text style={[s.saveBtnText, { color: colors.surface }]}>Save</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  heroGradient: { paddingHorizontal: 16, paddingBottom: 18 },
  backBtnGrad: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleGrad: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroSubtext: { fontSize: 15, textAlign: 'center', marginTop: 4, fontWeight: '500', lineHeight: 21 },
  heroBanner: { width: '100%', height: 90, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  stickyBarWrap: { paddingHorizontal: 16, paddingTop: 8 },
  catGroupLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  tabScrollRow: { marginBottom: 12, marginHorizontal: -16 },
  stickyTabRow: { marginBottom: 4, marginLeft: -16, marginRight: -16 },
  tabScrollContent: { paddingHorizontal: 16, gap: 8 },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: undefined },
  tabPillText: { fontSize: 12, fontWeight: '600' },
  tabPillBadge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabPillBadgeText: { fontSize: 10, fontWeight: '700' },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 8, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: -4, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  levelList: { gap: 10 },
  levelOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  levelIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  levelOptionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  helperText: { fontSize: 14, lineHeight: 21, marginBottom: 16, fontWeight: '500' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 6 },
  optionText: { fontSize: 14, fontWeight: '500', flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  searchBoxThin: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, gap: 6, borderWidth: 1 },
  searchInputThin: { flex: 1, fontSize: 13, paddingVertical: 0 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  catLabel: { fontSize: 14, fontWeight: '600' },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderRadius: 10, marginBottom: 2 },
  roleRowText: { fontSize: 14, fontWeight: '500' },
});

