import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from '@/components/ProfileIcons';
import { useColors } from '@/contexts/useColors';

export default function AttentionDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ArrowLeft size={24} color={colors.textPrimary} />
      </Pressable>
      <View style={styles.content}>
        <Text style={{ fontSize: 48 }}>✨</Text>
        <Text style={[styles.title, { color: colors.secondary }]}>you're literally all caught up</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          all your applications are in place, zero drama, zero stress. go touch some grass bestie 🌿
        </Text>
        <Text style={[styles.footer, { color: colors.textTertiary }]}>no cap, you have nothing to worry about 💅</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  footer: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
