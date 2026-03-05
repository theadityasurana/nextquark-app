import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface MatchScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export default function MatchScoreBadge({ score, size = 'medium' }: MatchScoreBadgeProps) {
  const getColor = () => {
    if (score >= 80) return Colors.matchGreen;
    if (score >= 60) return Colors.matchYellow;
    return Colors.matchOrange;
  };

  const getBgColor = () => {
    if (score >= 80) return Colors.accentSoft;
    if (score >= 60) return Colors.warningSoft;
    return '#FFF3E0';
  };

  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 11 },
    medium: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 13 },
    large: { paddingHorizontal: 14, paddingVertical: 6, fontSize: 16 },
  };

  const color = getColor();
  const bgColor = getBgColor();
  const s = sizeStyles[size];

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingHorizontal: s.paddingHorizontal, paddingVertical: s.paddingVertical }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color, fontSize: s.fontSize }]}>{score}% Match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '700' as const,
  },
});
