import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList } from 'react-native';
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
  const [activeRoleCategory, setActiveRoleCategory] = useState<string | null>(null);
  // Preferred cities
  const [preferredCities, setPreferredCities] = useState<string[]>(supabaseProfile?.preferredCities || []);
  const [cityQuery, setCityQuery] = useState('');
  // Favorite companies
  const [favCompanies, setFavCompanies] = useState<string[]>(supabaseProfile?.favoriteCompanies || []);
  const [companySearch, setCompanySearch] = useState('');

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
    if (topSkills.includes(skill)) { setTopSkills(prev => prev.filter(s => s !== skill)); }
    else if (topSkills.length < 5) { setTopSkills(prev => [...prev, skill]); }
    else { Alert.alert('Limit', 'Max 5 top skills'); }
  };

  const removeSkill = (idx: number) => {
    const removed = skills[idx];
    setSkills(prev => prev.filter((_, i) => i !== idx));
    setTopSkills(prev => prev.filter(s => s !== removed));
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
            <Text style={[s.helperText, { color: colors.textTertiary }]}>This information helps match you with jobs that fit your work authorization and specific requirements. Employers use this to filter candidates early — filling it out accurately saves you time.</Text>
            <Text style={[s.label, { color: colors.textSecondary }]}>Work Authorization Status</Text>
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. US Citizen, H1B..." placeholderTextColor={colors.textTertiary} value={workAuth} onChangeText={setWorkAuth} />
            <Text style={[s.label, { color: colors.textSecondary }]}>Job Requirements (comma-separated)</Text>
            <TextInput style={[s.input, s.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderLight }]} placeholder="e.g. Security Clearance..." placeholderTextColor={colors.textTertiary} value={jobReqs} onChangeText={setJobReqs} multiline numberOfLines={3} />
          </>
        );
      case 'equalopportunity':
        return (
          <>
            <Text style={[s.helperText, { color: colors.textTertiary }]}>This information is collected for equal employment opportunity compliance. It is kept confidential and will not be used in hiring decisions. You can choose "Prefer not to disclose" for any field.</Text>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Veteran Status</Text>
            {VETERAN_OPTIONS.map(o => {
              const sel = veteran === o;
              return (
                <Pressable key={o} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setVeteran(o)}>
                  <View style={[s.levelIconWrap, { backgroundColor: '#8B5CF620' }]}>
                    <Shield size={18} color="#8B5CF6" />
                  </View>
                  <Text style={[s.levelOptionText, { color: sel ? colors.surface : colors.textPrimary }]}>{o}</Text>
                  {sel && <Check size={16} color={colors.surface} />}
                </Pressable>
              );
            })}
            <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>Disability Status</Text>
            {DISABILITY_OPTIONS.map(o => {
              const sel = disability === o;
              return (
                <Pressable key={o} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setDisability(o)}>
                  <View style={[s.levelIconWrap, { backgroundColor: '#EF444420' }]}>
                    <Heart size={18} color="#EF4444" />
                  </View>
                  <Text style={[s.levelOptionText, { color: sel ? colors.surface : colors.textPrimary }]}>{o}</Text>
                  {sel && <Check size={16} color={colors.surface} />}
                </Pressable>
              );
            })}
            <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>Ethnicity</Text>
            {ETHNICITY_OPTIONS.map(o => {
              const sel = ethnicity === o;
              return (
                <Pressable key={o} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setEthnicity(o)}>
                  <View style={[s.levelIconWrap, { backgroundColor: '#3B82F620' }]}>
                    <Users size={18} color="#3B82F6" />
                  </View>
                  <Text style={[s.levelOptionText, { color: sel ? colors.surface : colors.textPrimary }]}>{o}</Text>
                  {sel && <Check size={16} color={colors.surface} />}
                </Pressable>
              );
            })}
            <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>Race</Text>
            {RACE_OPTIONS.map(o => {
              const sel = race === o;
              return (
                <Pressable key={o} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setRace(o)}>
                  <View style={[s.levelIconWrap, { backgroundColor: '#10B98120' }]}>
                    <Globe size={18} color="#10B981" />
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
            <View style={[s.searchBoxThin, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Search size={14} color={colors.textTertiary} />
              <TextInput style={[s.searchInputThin, { color: colors.textPrimary }]} placeholder="Search skills..." placeholderTextColor={colors.textTertiary} value={skillQuery} onChangeText={setSkillQuery} />
            </View>
            {skillQuery ? (
              <View style={s.chipGrid}>
                {suggestedSkills.filter(sk => sk.toLowerCase().includes(skillQuery.toLowerCase()) && !skills.includes(sk)).slice(0, 20).map(sk => (
                  <Pressable key={sk} style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => { setSkills(prev => [...prev, sk]); setSkillQuery(''); }}>
                    <Plus size={12} color={colors.textPrimary} /><Text style={[s.chipText, { color: colors.textPrimary }]}>{sk}</Text>
                  </Pressable>
                ))}
                {!suggestedSkills.some(sk => sk.toLowerCase() === skillQuery.toLowerCase()) && (
                  <Pressable style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => { setSkills(prev => [...prev, skillQuery]); setSkillQuery(''); }}>
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
            <Text style={[s.helperText, { color: colors.textTertiary }]}>Select the types of employment you're open to. Choosing multiple options increases your chances of finding the right match.</Text>
            <View style={s.levelList}>
              {JOB_TYPE_OPTIONS.map(({ key, label, icon: Icon, color }) => {
                const sel = jobPrefs.includes(key);
                return (
                  <Pressable key={key} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setJobPrefs(prev => sel ? prev.filter(x => x !== key) : [...prev, key])}>
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
            <Text style={[s.helperText, { color: colors.textTertiary }]}>Choose your preferred work arrangement. Remote means fully work-from-home, Onsite means in-office, and Hybrid is a mix of both.</Text>
            <View style={s.levelList}>
              {WORK_MODE_OPTIONS.map(({ key, label, icon: Icon, color }) => {
                const sel = workModePrefs.includes(key);
                return (
                  <Pressable key={key} style={[s.levelOption, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setWorkModePrefs(prev => sel ? prev.filter(x => x !== key) : [...prev, key])}>
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
        return (
          <>
            <Text style={[s.helperText, { color: colors.textTertiary }]}>Pick the roles you're targeting. The more specific you are, the better your job matches will be. Tap a category to explore roles within it.</Text>
            {desiredRoles.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[s.label, { color: colors.textTertiary }]}>{desiredRoles.length} role{desiredRoles.length !== 1 ? 's' : ''} selected</Text>
                <View style={s.chipGrid}>
                  {desiredRoles.map((role, idx) => (
                    <Pressable key={idx} style={[s.chip, { backgroundColor: colors.secondary, borderColor: colors.secondary }]} onPress={() => setDesiredRoles(prev => prev.filter(r => r !== role))}>
                      <Text style={[s.chipText, { color: colors.surface }]}>{role}</Text>
                      <X size={10} color={colors.surface} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {ROLE_CATEGORIES.map(cat => {
              const isCatSelected = desiredRoleCategories.includes(cat.key);
              const catRoles = CATEGORY_ROLES[cat.key] || [];
              const selectedInCat = desiredRoles.filter(r => catRoles.includes(r));
              return (
                <Pressable
                  key={cat.key}
                  style={[s.catRow, { marginBottom: 8, backgroundColor: isCatSelected ? `${cat.color}12` : colors.surface, borderColor: isCatSelected ? cat.color : colors.borderLight }]}
                  onPress={() => {
                    if (!isCatSelected) {
                      setDesiredRoleCategories(prev => [...prev, cat.key]);
                    }
                    setActiveRoleCategory(cat.key);
                  }}
                  onLongPress={() => {
                    if (isCatSelected) {
                      setDesiredRoleCategories(prev => prev.filter(c => c !== cat.key));
                      setDesiredRoles(prev => prev.filter(r => !catRoles.includes(r)));
                    }
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.catLabel, { color: colors.textPrimary }]}>{cat.label}</Text>
                    {selectedInCat.length > 0 && (
                      <Text style={{ fontSize: 11, color: cat.color, marginTop: 1 }}>{selectedInCat.length} role{selectedInCat.length > 1 ? 's' : ''}</Text>
                    )}
                  </View>
                  <ChevronRight size={16} color={isCatSelected ? cat.color : colors.textTertiary} />
                </Pressable>
              );
            })}
          </>
        );
      case 'preferredcities':
        return (
          <>
            <Text style={[s.helperText, { color: colors.textTertiary }]}>Select the cities where you'd like to work. This helps us show you jobs in locations that matter to you.</Text>
            <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Search size={16} color={colors.textTertiary} />
              <TextInput style={[s.searchInput, { color: colors.textPrimary }]} placeholder="Search cities..." placeholderTextColor={colors.textTertiary} value={cityQuery} onChangeText={setCityQuery} />
            </View>
            <View style={s.chipGrid}>
              {majorCities.filter(c => !cityQuery || c.toLowerCase().includes(cityQuery.toLowerCase())).map(city => {
                const sel = preferredCities.includes(city);
                return (
                  <Pressable key={city} style={[s.chip, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setPreferredCities(prev => sel ? prev.filter(c => c !== city) : [...prev, city])}>
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
            <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Search size={16} color={colors.textTertiary} />
              <TextInput style={[s.searchInput, { color: colors.textPrimary }]} placeholder="Search companies..." placeholderTextColor={colors.textTertiary} value={companySearch} onChangeText={setCompanySearch} />
            </View>
            {isLoadingCompanies ? (
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
              <View style={s.chipGrid}>
                {allCompaniesData.filter((c: any) => !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase())).map((company: any) => {
                  const sel = favCompanies.includes(company.name);
                  const logoUrl = company.logo_url ? getCompanyLogoStorageUrl(company.logo_url) : null;
                  return (
                    <Pressable key={company.name} style={[s.chip, { backgroundColor: sel ? colors.secondary : colors.surface, borderColor: sel ? colors.secondary : colors.borderLight }]} onPress={() => setFavCompanies(prev => sel ? prev.filter(c => c !== company.name) : [...prev, company.name])}>
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
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{getTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>
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
          <Pressable style={[s.saveBtn, { backgroundColor: colors.secondary }]} onPress={handleSave}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
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
  helperText: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 6 },
  optionText: { fontSize: 14, fontWeight: '500', flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  searchBoxThin: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, gap: 6, borderWidth: 1 },
  searchInputThin: { flex: 1, fontSize: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  catLabel: { fontSize: 14, fontWeight: '600' },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderRadius: 10, marginBottom: 2 },
  roleRowText: { fontSize: 14, fontWeight: '500' },
});
