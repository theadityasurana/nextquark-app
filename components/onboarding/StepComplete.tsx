import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { StepProps } from '@/types/onboarding';

const { width } = Dimensions.get('window');

const CONFETTI_COLORS = ['#111111', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

function ConfettiPiece({ delay, startX }: { delay: number; startX: number }) {
  const fallAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const size = 6 + Math.random() * 6;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(fallAnim, { toValue: 600, duration: 2500 + Math.random() * 1000, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(opacityAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
        Animated.timing(rotateAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + Math.random() * 360}deg`] });

  return (
    <Animated.View style={{
      position: 'absolute', left: startX, top: 0, width: size, height: size * 1.5,
      borderRadius: 2, backgroundColor: color,
      opacity: opacityAnim,
      transform: [{ translateY: fallAnim }, { rotate }],
    }} />
  );
}

export default function StepComplete({ data, onNext }: StepProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(textFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(buttonAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
            Animated.timing(bounceAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        ),
      ]),
    ]).start();
  }, []);

  const confettiPieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    delay: Math.random() * 800,
    startX: Math.random() * (width - 20),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.confettiContainer}>
        {confettiPieces.map(p => (
          <ConfettiPiece key={p.id} delay={p.delay} startX={p.startX} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: scaleAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.celebration}>🎉 ✨ 🎊</Text>

        <Animated.View style={{ opacity: textFade }}>
          <Text style={styles.title}>You're All Set,{'\n'}{data.firstName || 'there'}!</Text>
          <Text style={styles.subtitle}>Your profile is ready to start matching with amazing opportunities</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.bottomSection, { opacity: buttonAnim, transform: [{ scale: bounceAnim }] }]}>
        <Pressable style={styles.startButton} onPress={onNext} testID="start-swiping">
          <Text style={styles.startButtonText}>Start Swiping Jobs! 🎴</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 24 },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 400, overflow: 'hidden' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  celebration: { fontSize: 48, marginBottom: 24, textAlign: 'center' },
  title: { fontSize: 32, fontWeight: '900' as const, color: '#111111', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#616161', textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  bottomSection: { paddingTop: 16 },
  startButton: {
    height: 60, borderRadius: 18, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  startButtonText: { fontSize: 18, fontWeight: '800' as const, color: '#FFFFFF' },
});
