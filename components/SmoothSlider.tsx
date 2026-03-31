import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';

interface SmoothSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  width: number;
  trackHeight?: number;
  thumbSize?: number;
  activeColor?: string;
  inactiveColor?: string;
  thumbColor?: string;
}

export default function SmoothSlider({
  value,
  min,
  max,
  step,
  onValueChange,
  width,
  trackHeight = 6,
  thumbSize = 28,
  activeColor = '#7C3AED',
  inactiveColor = '#E0E0E0',
  thumbColor = '#7C3AED',
}: SmoothSliderProps) {
  const trackWidth = width - thumbSize;
  const pan = useRef(new Animated.Value(((value - min) / (max - min)) * trackWidth)).current;
  const currentVal = useRef(value);

  useEffect(() => {
    const newPos = ((value - min) / (max - min)) * trackWidth;
    pan.setValue(newPos);
    currentVal.current = value;
  }, [value, min, max, trackWidth]);

  const clampAndStep = (x: number) => {
    const clamped = Math.max(0, Math.min(trackWidth, x));
    const ratio = clamped / trackWidth;
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX - thumbSize / 2;
        const stepped = clampAndStep(x);
        const pos = ((stepped - min) / (max - min)) * trackWidth;
        pan.setValue(pos);
        currentVal.current = stepped;
        onValueChange(stepped);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX - thumbSize / 2;
        const stepped = clampAndStep(x);
        if (stepped !== currentVal.current) {
          const pos = ((stepped - min) / (max - min)) * trackWidth;
          pan.setValue(pos);
          currentVal.current = stepped;
          onValueChange(stepped);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const fillWidth = pan.interpolate({
    inputRange: [0, trackWidth],
    outputRange: [0, trackWidth],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[styles.container, { width, height: thumbSize + 16 }]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.track, { height: trackHeight, backgroundColor: inactiveColor, marginHorizontal: thumbSize / 2 }]}>
        <Animated.View style={[styles.fill, { height: trackHeight, backgroundColor: activeColor, width: fillWidth }]} />
      </View>
      <Animated.View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbColor,
            top: 8,
            transform: [{ translateX: pan }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
});
