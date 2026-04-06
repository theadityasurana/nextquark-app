import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, FlatList, ScrollView, Platform } from 'react-native';
import { Check, X, ArrowLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StepProps } from '@/types/onboarding';
import { ROLE_CATEGORIES as CATEGORIES, CATEGORY_ROLES } from '@/constants/roles';

function AnimatedOption({ index, children }: { index: number; children: React.ReactNode }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(100 + index * 120),
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

export default function StepDesiredRoles({ data, onUpdate, onNext }: StepProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

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

  if (activeCategory && selectedCats.includes(activeCategory)) {
    const roles = CATEGORY_ROLES[activeCategory] || [];
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setActiveCategory(null)} style={styles.backRow}>
            <ArrowLeft size={20} color="#FFFFFF" />
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
          renderItem={({ item }) => {
            const selected = data.desiredRoles.includes(item);
            return (
              <Pressable style={[styles.roleRow, selected && styles.roleRowSelected]} onPress={() => toggleRole(item)}>
                <Text style={[styles.roleText, selected && styles.roleTextSelected]}>{item}</Text>
                {selected && <Check size={14} color="#111111" />}
              </Pressable>
            );
          }}
        />

        <View style={styles.footer}>
          <Pressable style={styles.doneBtn} onPress={() => setActiveCategory(null)}>
            <Text style={styles.doneBtnText}>Done with {cat?.label}</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerEmoji}>🎯</Text>
          <Text style={styles.title}>What roles are you looking for?</Text>
        </View>
        <Text style={styles.subtitle}>Select categories, then pick specific roles</Text>
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
        {CATEGORIES.map(({ key, label, emoji, color }, idx) => {
          const isCatSelected = selectedCats.includes(key);
          const rolesInCat = data.desiredRoles.filter(r => (CATEGORY_ROLES[key] || []).includes(r));
          return (
            <AnimatedOption key={key} index={idx}>
              <Pressable
                style={[styles.catOption, isCatSelected && { borderColor: color }]}
                onPress={() => toggleCategory(key)}
              >
                <View style={[styles.catEmojiWrap, { backgroundColor: `${color}15` }]}>
                  <Text style={styles.catEmoji}>{emoji}</Text>
                </View>
                <View style={styles.catInfo}>
                  <Text style={[styles.catLabel, isCatSelected && { color: '#FFFFFF' }]}>{label}</Text>
                  {rolesInCat.length > 0 && (
                    <Text style={styles.catCount}>{rolesInCat.length} role{rolesInCat.length > 1 ? 's' : ''}</Text>
                  )}
                </View>
                {isCatSelected ? (
                  <Pressable onPress={() => setActiveCategory(key)} hitSlop={8}>
                    <ChevronRight size={16} color={color} />
                  </Pressable>
                ) : (
                  <View style={styles.catRadio} />
                )}
              </Pressable>
            </AnimatedOption>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.countText}>{data.desiredRoles.length} role{data.desiredRoles.length !== 1 ? 's' : ''} selected</Text>
        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>Next →</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingHorizontal: 24 },
  header: { paddingTop: 12, marginBottom: 10 },
  headerEmoji: { fontSize: 36 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', flex: 1 },
  subtitle: { fontSize: 15, color: '#9E9E9E', lineHeight: 22 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  backText: { fontSize: 15, color: '#9E9E9E', fontWeight: '600' },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#333333', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  selectedChipText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  catList: { flex: 1 },
  catListContent: { gap: 6, paddingBottom: 16 },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  catEmojiWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  catEmoji: { fontSize: 18 },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 14, fontWeight: '600', color: '#BBBBBB' },
  catCount: { fontSize: 11, color: '#777777', marginTop: 1 },
  catRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#3A3A3A',
  },
  roleList: { flex: 1, marginBottom: 8 },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#1E1E1E',
    borderRadius: 10, marginBottom: 2,
  },
  roleRowSelected: { backgroundColor: '#FFFFFF', borderRadius: 10 },
  roleText: { color: '#CCCCCC', fontSize: 14 },
  roleTextSelected: { color: '#111111', fontWeight: '700' },
  footer: { paddingBottom: 24, paddingTop: 8 },
  countText: { fontSize: 13, color: '#9E9E9E', textAlign: 'center', marginBottom: 10 },
  nextButton: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { fontSize: 17, fontWeight: '700', color: '#111111' },
  doneBtn: {
    height: 56, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText: { fontSize: 17, fontWeight: '700', color: '#111111' },
});
