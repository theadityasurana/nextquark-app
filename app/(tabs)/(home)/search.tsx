import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Search as SearchIcon, ArrowLeft } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/contexts/useColors';
import { darkColors } from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeSearchInput } from '@/lib/validation';

const SEARCH_TAGS_KEY = 'nextquark_search_tags';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const isDark = colors.background === darkColors.background;
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
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/(home)/' as any);
    }
  }, [searchTags, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : 'rgba(118,118,128,0.12)' }]}>
          <SearchIcon size={18} color="#8E8E93" />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
            placeholder="Search jobs..."
            placeholderTextColor="#8E8E93"
            value={searchKeyword}
            onChangeText={(text) => setSearchKeyword(sanitizeSearchInput(text))}
            onSubmitEditing={handleKeywordSubmit}
            returnKeyType="search"
            autoFocus
          />
          {searchKeyword.length > 0 && (
            <Pressable onPress={() => setSearchKeyword('')} hitSlop={8}>
              <View style={styles.clearButton}>
                <X size={12} color={isDark ? '#1C1C1E' : '#FFFFFF'} strokeWidth={3} />
              </View>
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/(home)/' as any)} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {searchTags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={[styles.tagsSectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>SEARCH TERMS</Text>
            <View style={[styles.tagsGroupBox, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.tagsWrap}>
                {searchTags.map((tag, idx) => (
                  <Pressable key={idx} style={styles.tag} onPress={() => removeSearchTag(tag)}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {searchTags.length === 0 && (
          <View style={styles.hintSection}>
            <Text style={[styles.hintText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
              Type a keyword and press search to add it.{'\n'}You can add multiple search terms.
            </Text>
          </View>
        )}
      </ScrollView>

      {searchTags.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 56 + 16 }]}>
          <Pressable style={styles.viewResultsButton} onPress={handleViewResults}>
            <Text style={styles.viewResultsText}>View Results</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, height: 44, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  searchInput: { flex: 1, fontSize: 17, padding: 0, lineHeight: 22 },
  clearButton: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#8E8E93', justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 17, color: '#007AFF' },
  tagsSection: { paddingHorizontal: 16, marginTop: 16 },
  tagsSectionLabel: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08, marginBottom: 6, marginLeft: 16 },
  tagsGroupBox: { borderRadius: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  tagText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  content: { flex: 1 },
  contentContainer: { flexGrow: 1 },
  hintSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  hintText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: 16, paddingTop: 12 },
  viewResultsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12 },
  viewResultsText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
