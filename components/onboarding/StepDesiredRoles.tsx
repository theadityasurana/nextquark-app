import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, FlatList, ScrollView, Platform } from 'react-native';
import { Check, X, ChevronRight, Sparkles } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';
import { ROLE_CATEGORIES as CATEGORIES, CATEGORY_ROLES } from '@/constants/roles';
import { suggestRolesFromProfile } from '@/lib/resume-parser/suggest-roles';

export default function StepDesiredRoles({ data, onUpdate, onNext }: StepProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [didAutoSuggest, setDidAutoSuggest] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (didAutoSuggest) return;
    if (data.desiredRoles.length > 0) { setDidAutoSuggest(true); return; }
    const hasResumeData = data.skills.length > 0 || data.workExperience.length > 0 || (data.projects && data.projects.length > 0) || data.education.length > 0;
    if (!hasResumeData) return;
    const { categories, roles } = suggestRolesFromProfile(data);
    if (categories.length > 0 || roles.length > 0) {
      console.log('[ROLE-SUGGEST] Auto-suggesting from resume:', { categories, roles: roles.length });
      onUpdate({ desiredRoleCategories: categories, desiredRoles: roles });
    }
    setDidAutoSuggest(true);
  }, [data.skills, data.workExperience, data.projects, data.education]);

  const toggleCategory = (key: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    const cats = data.desiredRoleCategories || [];
    if (cats.includes(key)) {
      const rolesInCat = CATEGORY_ROLES[key] || [];
      onUpdate({
        desiredRoleCategories: cats.filter(c => c !== key),
        desiredRoles: data.desiredRoles.filter(r => !rolesInCat.includes(r)),
      });
    } else {
      onUpdate({ desiredRoleCategories: [...cats, key] });
    }
    setActiveCategory(key);
  };

  const toggleRole = (role: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    if (data.desiredRoles.includes(role)) {
      onUpdate({ desiredRoles: data.desiredRoles.filter(r => r !== role) });
    } else {
      onUpdate({ desiredRoles: [...data.desiredRoles, role] });
    }
  };

  const selectedCats = data.desiredRoleCategories || [];

  // Sub-screen: roles within a category
  if (activeCategory && selectedCats.includes(activeCategory)) {
    const roles = CATEGORY_ROLES[activeCategory] || [];
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setActiveCategory(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color="#007AFF" />
            <Text style={styles.backText}>Categories</Text>
          </Pressable>
          <Text style={styles.title}>{cat?.emoji} {cat?.label}</Text>
          <Text style={styles.subtitle}>Select the specific roles you're interested in</Text>
        </View>

        {data.desiredRoles.filter(r => roles.includes(r)).length > 0 && (
          <View style={styles.selectedWrap}>
            {data.desiredRoles.filter(r => roles.includes(r)).map((role, idx) => (
              <Pressable key={idx} style={styles.selectedChip} onPress={() => toggleRole(role)}>
                <Text style={styles.selectedChipText}>{role}</Text>
                <X size={10} color="#FFFFFF" />
              </Pressable>
            ))}
          </View>
        )}

        <FlatList
          data={roles}
          keyExtractor={item => item}
          showsVerticalScrollIndicator={false}
          style={styles.roleList}
          contentContainerStyle={styles.roleListContent}
          renderItem={({ item, index }) => {
            const selected = data.desiredRoles.includes(item);
            const isLast = index === roles.length - 1;
            return (
              <Pressable
                style={[styles.roleRow, !isLast && styles.rowBorder]}
                onPress={() => toggleRole(item)}
              >
                <Text style={styles.roleText}>{item}</Text>
                {selected && <Check size={18} color="#007AFF" strokeWidth={3} />}
              </Pressable>
            );
          }}
          ListHeaderComponent={<View style={styles.roleListHeader} />}
          ListFooterComponent={<View style={styles.roleListFooter} />}
        />

        <View style={styles.footer}>
          <Pressable style={styles.nextButton} onPress={() => setActiveCategory(null)}>
            <Text style={styles.nextButtonText}>Done</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // Main category selection screen
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>What roles are you looking for?</Text>
        {data.desiredRoles.length > 0 && (data.skills.length > 0 || data.workExperience.length > 0) ? (
          <View style={styles.autoSuggestBanner}>
            <Sparkles size={14} color="#FFD60A" />
            <Text style={styles.autoSuggestText}>Auto-suggested from your resume</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Select categories, then pick specific roles</Text>
        )}
      </View>

      {data.desiredRoles.length > 0 && (
        <View style={styles.selectedWrap}>
          {data.desiredRoles.slice(0, 6).map((role, idx) => (
            <Pressable key={idx} style={styles.selectedChip} onPress={() => toggleRole(role)}>
              <Text style={styles.selectedChipText}>{role}</Text>
              <X size={10} color="#FFFFFF" />
            </Pressable>
          ))}
          {data.desiredRoles.length > 6 && (
            <View style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>+{data.desiredRoles.length - 6} more</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView style={styles.catList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.catListContent}>
        <View style={styles.groupedCard}>
          {CATEGORIES.map(({ key, label, emoji, color }, idx) => {
            const isCatSelected = selectedCats.includes(key);
            const rolesInCat = data.desiredRoles.filter(r => (CATEGORY_ROLES[key] || []).includes(r));
            const isLast = idx === CATEGORIES.length - 1;
            return (
              <Pressable
                key={key}
                style={[styles.catRow, !isLast && styles.rowBorder]}
                onPress={() => toggleCategory(key)}
              >
                <Text style={styles.catEmoji}>{emoji}</Text>
                <View style={styles.catInfo}>
                  <Text style={styles.catLabel}>{label}</Text>
                  {rolesInCat.length > 0 && (
                    <Text style={styles.catCount}>{rolesInCat.length} role{rolesInCat.length > 1 ? 's' : ''}</Text>
                  )}
                </View>
                {isCatSelected ? (
                  <Pressable onPress={() => setActiveCategory(key)} hitSlop={8}>
                    <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                  </Pressable>
                ) : (
                  <View style={styles.catRadio} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.countText}>{data.desiredRoles.length} role{data.desiredRoles.length !== 1 ? 's' : ''} selected</Text>
        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>Continue</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 20 },
  header: { paddingTop: 24, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { fontSize: 17, color: '#007AFF' },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,122,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  selectedChipText: { fontSize: 12, color: '#FFFFFF', fontWeight: '500' },
  catList: { flex: 1 },
  catListContent: { paddingBottom: 16 },
  groupedCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    minHeight: 50,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  catEmoji: { fontSize: 22, marginRight: 14 },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 16, color: '#FFFFFF' },
  catCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  catRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  roleList: { flex: 1 },
  roleListContent: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' },
  roleListHeader: { height: 0 },
  roleListFooter: { height: 0 },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 16,
    minHeight: 48,
  },
  roleText: { color: '#FFFFFF', fontSize: 16 },
  footer: { paddingBottom: 16, paddingTop: 8 },
  countText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 10 },
  nextButton: {
    height: 50, borderRadius: 12, backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  autoSuggestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,214,10,0.1)', borderRadius: 10, padding: 10, marginTop: 6,
  },
  autoSuggestText: { fontSize: 13, color: '#FFD60A', flex: 1 },
});
