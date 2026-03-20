import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Search as SearchIcon, ArrowRight } from 'lucide-react-native';
import { useColors } from '@/contexts/useColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeSearchInput } from '@/lib/validation';

const SEARCH_TAGS_KEY = 'nextquark_search_tags';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);

  const handleKeywordSubmit = useCallback(() => {
    if (searchKeyword.trim()) {
      setSearchTags(prev => [...prev, searchKeyword.trim()]);
      setSearchKeyword('');
    }
  }, [searchKeyword]);

  const removeSearchTag = useCallback((tag: string) => {
    setSearchTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleViewResults = useCallback(async () => {
    await AsyncStorage.setItem(SEARCH_TAGS_KEY, JSON.stringify(searchTags));
    router.back();
  }, [searchTags, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]}>
          <X size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.secondary }]}>Search Jobs</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
        <SearchIcon size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="discover your dream job"
          placeholderTextColor={colors.textTertiary}
          value={searchKeyword}
          onChangeText={(text) => setSearchKeyword(sanitizeSearchInput(text))}
          onSubmitEditing={handleKeywordSubmit}
          returnKeyType="done"
          autoFocus
        />
        {searchKeyword.length > 0 && (
          <Pressable onPress={() => setSearchKeyword('')}>
            <X size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {searchTags.length > 0 && (
        <ScrollView style={styles.tagsScroll} contentContainerStyle={styles.tagsContainer}>
          {searchTags.map((tag, idx) => (
            <Pressable key={idx} style={[styles.tag, { backgroundColor: colors.primary }]} onPress={() => removeSearchTag(tag)}>
              <Text style={[styles.tagText, { color: colors.surface }]}>{tag}</Text>
              <X size={14} color={colors.surface} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {searchTags.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
          <Pressable style={[styles.viewResultsButton, { backgroundColor: colors.secondary }]} onPress={handleViewResults}>
            <Text style={[styles.viewResultsText, { color: colors.surface }]}>View {searchTags.length} Search Result{searchTags.length > 1 ? 's' : ''}</Text>
            <ArrowRight size={20} color={colors.surface} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginHorizontal: 16, marginTop: 8, gap: 12, borderWidth: 2 },
  searchInput: { flex: 1, fontSize: 16, padding: 0, fontWeight: '500' as const },
  tagsScroll: { marginTop: 16, paddingHorizontal: 16, flex: 1 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 100 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tagText: { fontSize: 14, fontWeight: '600' as const },
  footer: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1 },
  viewResultsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  viewResultsText: { fontSize: 16, fontWeight: '700' as const },
});
