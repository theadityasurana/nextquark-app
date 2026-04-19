import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useColors } from '@/contexts/useColors';

function SkeletonPulse({ style }: { style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const colors = useColors();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[{ backgroundColor: colors.borderLight, borderRadius: 8 }, style, { opacity }]} />;
}

export function SkeletonJobCard() {
  const colors = useColors();
  return (
    <View style={[sk.card, { backgroundColor: colors.surface }]}>
      <View style={sk.row}>
        <SkeletonPulse style={sk.avatar} />
        <View style={sk.col}>
          <SkeletonPulse style={sk.titleBar} />
          <SkeletonPulse style={sk.subtitleBar} />
          <SkeletonPulse style={sk.smallBar} />
        </View>
      </View>
      <View style={[sk.row, { marginTop: 12 }]}>
        <SkeletonPulse style={sk.chip} />
        <SkeletonPulse style={sk.chip} />
        <SkeletonPulse style={sk.chipSm} />
      </View>
    </View>
  );
}


export function SkeletonAppCard() {
  const colors = useColors();
  return (
    <View style={[sk.card, { backgroundColor: colors.surface }]}>
      <View style={sk.row}>
        <SkeletonPulse style={sk.avatar} />
        <View style={sk.col}>
          <SkeletonPulse style={sk.titleBar} />
          <SkeletonPulse style={sk.subtitleBar} />
        </View>
        <SkeletonPulse style={sk.badge} />
      </View>
    </View>
  );
}

export function SkeletonFriendCircle() {
  return (
    <View style={sk.friendWrap}>
      <SkeletonPulse style={sk.friendAvatar} />
      <SkeletonPulse style={sk.friendName} />
    </View>
  );
}

export function SkeletonMailRow() {
  const colors = useColors();
  return (
    <View style={[sk.mailRow, { backgroundColor: colors.surface }]}>
      <SkeletonPulse style={sk.mailAvatar} />
      <View style={sk.col}>
        <SkeletonPulse style={sk.titleBar} />
        <SkeletonPulse style={sk.subtitleBar} />
        <SkeletonPulse style={sk.smallBar} />
      </View>
    </View>
  );
}

export function SkeletonProfile() {
  const colors = useColors();
  return (
    <View style={sk.profileWrap}>
      <View style={sk.profileHeader}>
        <SkeletonPulse style={sk.profileAvatar} />
        <View style={sk.col}>
          <SkeletonPulse style={{ height: 18, borderRadius: 8, width: '60%' }} />
          <SkeletonPulse style={{ height: 13, borderRadius: 6, width: '80%' }} />
          <SkeletonPulse style={{ height: 11, borderRadius: 5, width: '40%' }} />
        </View>
      </View>
      <View style={[sk.profileCard, { backgroundColor: colors.surface }]}>
        <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '30%', marginBottom: 10 }} />
        <SkeletonPulse style={{ height: 60, borderRadius: 10, width: '100%' }} />
      </View>
      <View style={[sk.profileCard, { backgroundColor: colors.surface }]}>
        <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '40%', marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonPulse style={{ height: 28, borderRadius: 8, width: 80 }} />
          <SkeletonPulse style={{ height: 28, borderRadius: 8, width: 60 }} />
          <SkeletonPulse style={{ height: 28, borderRadius: 8, width: 70 }} />
        </View>
      </View>
      <View style={[sk.profileCard, { backgroundColor: colors.surface }]}>
        <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '35%', marginBottom: 10 }} />
        <SkeletonPulse style={{ height: 50, borderRadius: 10, width: '100%' }} />
      </View>
    </View>
  );
}

export function SkeletonApplicationDetails() {
  const colors = useColors();
  return (
    <View style={sk.profileWrap}>
      <View style={[sk.profileCard, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <SkeletonPulse style={{ width: 48, height: 48, borderRadius: 14 }} />
          <View style={sk.col}>
            <SkeletonPulse style={{ height: 16, borderRadius: 6, width: '70%' }} />
            <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '50%' }} />
          </View>
        </View>
        <SkeletonPulse style={{ height: 28, borderRadius: 8, width: 100, marginBottom: 12 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '100%', marginBottom: 6 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '80%' }} />
      </View>
      <View style={[sk.profileCard, { backgroundColor: colors.surface }]}>
        <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '40%', marginBottom: 10 }} />
        <View style={{ gap: 10 }}>
          {[1,2,3].map(i => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '35%' }} />
              <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '40%' }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function SkeletonChatThread() {
  const colors = useColors();
  return (
    <View style={{ padding: 16, gap: 12, flex: 1 }}>
      {[1,2,3,4,5].map(i => (
        <View key={i} style={{ alignItems: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
          <View style={{ borderRadius: 14, padding: 12, maxWidth: '75%', backgroundColor: i % 2 === 0 ? colors.surfaceElevated : colors.surface }}>
            <SkeletonPulse style={{ height: 12, borderRadius: 6, width: i % 2 === 0 ? 180 : 220, marginBottom: 4 }} />
            <SkeletonPulse style={{ height: 12, borderRadius: 6, width: i % 2 === 0 ? 140 : 160 }} />
          </View>
          <SkeletonPulse style={{ height: 9, borderRadius: 4, width: 50, marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonJobDetails() {
  const colors = useColors();
  return (
    <View style={sk.profileWrap}>
      <View style={{ alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <SkeletonPulse style={{ width: 72, height: 72, borderRadius: 20 }} />
        <SkeletonPulse style={{ height: 13, borderRadius: 6, width: 100 }} />
        <SkeletonPulse style={{ height: 22, borderRadius: 8, width: 220 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: 150 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[1,2,3].map(i => (
          <View key={i} style={[sk.profileCard, { backgroundColor: colors.surface, flex: 1, alignItems: 'center', gap: 6 }]}>
            <SkeletonPulse style={{ width: 22, height: 22, borderRadius: 6 }} />
            <SkeletonPulse style={{ height: 10, borderRadius: 5, width: 40 }} />
            <SkeletonPulse style={{ height: 12, borderRadius: 6, width: 50 }} />
          </View>
        ))}
      </View>
      <View style={{ marginBottom: 20 }}>
        <SkeletonPulse style={{ height: 16, borderRadius: 6, width: '40%', marginBottom: 12 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '100%', marginBottom: 6 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '95%', marginBottom: 6 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '85%', marginBottom: 6 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '90%' }} />
      </View>
      <View style={{ marginBottom: 20 }}>
        <SkeletonPulse style={{ height: 16, borderRadius: 6, width: '35%', marginBottom: 12 }} />
        <View style={{ gap: 8 }}>
          {[1,2,3,4].map(i => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SkeletonPulse style={{ width: 6, height: 6, borderRadius: 3 }} />
              <SkeletonPulse style={{ height: 12, borderRadius: 6, flex: 1 }} />
            </View>
          ))}
        </View>
      </View>
      <View>
        <SkeletonPulse style={{ height: 16, borderRadius: 6, width: '25%', marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[80,60,90,70,50].map((w, i) => (
            <SkeletonPulse key={i} style={{ height: 28, borderRadius: 8, width: w }} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function SkeletonTopCompaniesRow() {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{ width: 80, height: 100, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.borderLight }}>
          <SkeletonPulse style={{ width: 40, height: 40, borderRadius: 8 }} />
          <SkeletonPulse style={{ height: 8, borderRadius: 4, width: 50 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonRecentJobsRow() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ width: 180, borderRadius: 16, padding: 16, backgroundColor: 'slategray' }}>
          <SkeletonPulse style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '90%', marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '60%', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <SkeletonPulse style={{ height: 10, borderRadius: 5, width: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonFavCompanies() {
  const colors = useColors();
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <SkeletonPulse style={{ width: 20, height: 20, borderRadius: 6 }} />
        <SkeletonPulse style={{ height: 16, borderRadius: 6, width: 160 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        {[90, 80, 70, 60].map((w, i) => (
          <SkeletonPulse key={i} style={{ height: 34, borderRadius: 20, width: w }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <View key={i} style={[sk.profileCard, { backgroundColor: colors.surface, width: '31%' as any, padding: 10, gap: 6 }]}>
            <SkeletonPulse style={{ width: 28, height: 28, borderRadius: 8 }} />
            <SkeletonPulse style={{ height: 11, borderRadius: 5, width: '90%' }} />
            <SkeletonPulse style={{ height: 10, borderRadius: 5, width: '60%' }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function SkeletonCompanyProfile() {
  const colors = useColors();
  return (
    <View style={sk.profileWrap}>
      <View style={{ alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <SkeletonPulse style={{ width: 72, height: 72, borderRadius: 20 }} />
        <SkeletonPulse style={{ height: 20, borderRadius: 8, width: 160 }} />
        <SkeletonPulse style={{ height: 13, borderRadius: 6, width: 200 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {[1,2,3].map(i => (
          <View key={i} style={[sk.profileCard, { backgroundColor: colors.surface, flex: 1, alignItems: 'center', gap: 6 }]}>
            <SkeletonPulse style={{ width: 24, height: 24, borderRadius: 6 }} />
            <SkeletonPulse style={{ height: 16, borderRadius: 6, width: 40 }} />
            <SkeletonPulse style={{ height: 10, borderRadius: 5, width: 50 }} />
          </View>
        ))}
      </View>
      <View style={[sk.profileCard, { backgroundColor: colors.surface }]}>
        <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '35%', marginBottom: 10 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '100%', marginBottom: 6 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '90%', marginBottom: 6 }} />
        <SkeletonPulse style={{ height: 12, borderRadius: 6, width: '70%' }} />
      </View>
      <View style={[sk.profileCard, { backgroundColor: colors.surface }]}>
        <SkeletonPulse style={{ height: 14, borderRadius: 6, width: '25%', marginBottom: 10 }} />
        <SkeletonPulse style={{ height: 50, borderRadius: 10, width: '100%' }} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  col: { flex: 1, gap: 6 },
  avatar: { width: 48, height: 48, borderRadius: 14 },
  titleBar: { height: 14, borderRadius: 6, width: '70%' },
  subtitleBar: { height: 12, borderRadius: 6, width: '50%' },
  smallBar: { height: 10, borderRadius: 5, width: '35%' },
  chip: { height: 24, width: 70, borderRadius: 6 },
  chipSm: { height: 24, width: 50, borderRadius: 6 },
  badge: { height: 24, width: 60, borderRadius: 8 },

  friendWrap: { alignItems: 'center', width: 70, gap: 6 },
  friendAvatar: { width: 56, height: 56, borderRadius: 28 },
  friendName: { width: 50, height: 10, borderRadius: 5 },
  mailRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  mailAvatar: { width: 44, height: 44, borderRadius: 22 },
  profileWrap: { padding: 16, gap: 12 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  profileAvatar: { width: 72, height: 72, borderRadius: 24 },
  profileCard: { borderRadius: 16, padding: 16 },
});
