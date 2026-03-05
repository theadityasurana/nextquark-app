import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  formatLabel?: (v: number) => string;
}

const THUMB_SIZE = 26;

export default function RangeSlider({ min, max, step, low, high, onChange, formatLabel }: RangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  const startRef = useRef(0);
  const onChangeRef = useRef(onChange);

  useEffect(() => { lowRef.current = low; }, [low]);
  useEffect(() => { highRef.current = high; }, [high]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const snap = (v: number) => {
    const s = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, s));
  };

  const lowPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startRef.current = lowRef.current;
    },
    onPanResponderMove: (_, g) => {
      const w = trackWidthRef.current;
      if (w <= 0) return;
      const delta = (g.dx / w) * (max - min);
      const newVal = snap(startRef.current + delta);
      if (newVal < highRef.current) {
        onChangeRef.current(newVal, highRef.current);
      }
    },
  })).current;

  const highPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startRef.current = highRef.current;
    },
    onPanResponderMove: (_, g) => {
      const w = trackWidthRef.current;
      if (w <= 0) return;
      const delta = (g.dx / w) * (max - min);
      const newVal = snap(startRef.current + delta);
      if (newVal > lowRef.current) {
        onChangeRef.current(lowRef.current, newVal);
      }
    },
  })).current;

  const lowPct = max > min ? ((low - min) / (max - min)) * 100 : 0;
  const highPct = max > min ? ((high - min) / (max - min)) * 100 : 100;
  const fmt = formatLabel || ((v: number) => `${v}`);

  return (
    <View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.labelText}>{fmt(low)}</Text>
        <Text style={sliderStyles.labelText}>{fmt(high)}</Text>
      </View>
      <View
        style={sliderStyles.trackContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthRef.current = w;
          setTrackWidth(w);
        }}
      >
        <View style={sliderStyles.track} />
        <View
          style={[
            sliderStyles.activeTrack,
            {
              left: `${lowPct}%`,
              right: `${100 - highPct}%`,
            },
          ]}
        />
        {trackWidth > 0 && (
          <>
            <View
              {...lowPan.panHandlers}
              style={[
                sliderStyles.thumb,
                { left: (trackWidth * lowPct) / 100 - THUMB_SIZE / 2 },
              ]}
            />
            <View
              {...highPan.panHandlers}
              style={[
                sliderStyles.thumb,
                { left: (trackWidth * highPct) / 100 - THUMB_SIZE / 2 },
              ]}
            />
          </>
        )}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  trackContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
  },
  activeTrack: {
    position: 'absolute',
    height: 6,
    backgroundColor: Colors.accent,
    borderRadius: 3,
    top: 17,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.accent,
    top: (40 - THUMB_SIZE) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
