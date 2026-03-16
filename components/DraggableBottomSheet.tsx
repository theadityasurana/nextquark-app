import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number; // px
  minHeight?: number; // px
  initialHeight?: number; // px
  backdropOpacity?: number; // 0..1
  enableDragToClose?: boolean;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DraggableBottomSheet({
  visible,
  onClose,
  children,
  maxHeight = Math.round(SCREEN_HEIGHT * 0.9),
  minHeight = Math.round(SCREEN_HEIGHT * 0.35),
  initialHeight = Math.round(SCREEN_HEIGHT * 0.75),
  backdropOpacity = 0.75,
  enableDragToClose = true,
}: Props) {
  const height = useRef(new Animated.Value(initialHeight)).current;
  const startHeightRef = useRef(initialHeight);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const clamped = useMemo(() => {
    const clamp = (v: number) => Math.max(minHeight, Math.min(maxHeight, v));
    return { clamp };
  }, [minHeight, maxHeight]);

  useEffect(() => {
    if (!visible) return;
    const next = clamped.clamp(initialHeight);
    startHeightRef.current = next;
    height.setValue(next);
    translateY.setValue(SCREEN_HEIGHT);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: false,
      damping: 22,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [visible, initialHeight, height, clamped]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
        onPanResponderGrant: () => {
          // @ts-expect-error: private Animated API
          height.stopAnimation((value: number) => {
            startHeightRef.current = value;
          });
        },
        onPanResponderMove: (_, g) => {
          const next = clamped.clamp(startHeightRef.current - g.dy);
          height.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const current = startHeightRef.current - g.dy;
          if (enableDragToClose) {
            const shouldClose = current < minHeight * 0.8 || g.vy > 2.2;
            if (shouldClose) {
              onClose();
              return;
            }
          }

          const snapTo =
            current > (minHeight + maxHeight) / 2 ? maxHeight : minHeight;
          Animated.spring(height, {
            toValue: snapTo,
            useNativeDriver: false,
            damping: 18,
            stiffness: 180,
            mass: 0.7,
          }).start(() => {
            startHeightRef.current = snapTo;
          });
        },
      }),
    [clamped, enableDragToClose, height, maxHeight, minHeight, onClose]
  );

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'android' ? 'fade' : 'none'}
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          onPress={onClose}
        />
        <Animated.View style={[styles.sheet, { height, transform: [{ translateY }] }]}>
          <View style={styles.handleRow} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: '#0B1220',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handleRow: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});

