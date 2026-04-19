import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePipStore } from '@/lib/pip-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIP_WIDTH = 160;
const PIP_HEIGHT = 120;
const DISMISS_ZONE_SIZE = 64;
const DISMISS_ZONE_BOTTOM = 40;

function getEmbeddableUrl(url: string): { uri?: string; html?: string } {
  if (!url) return { uri: '' };
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/([\w-]+))/);
  if (ytMatch) return { uri: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&playsinline=1&rel=0` };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { uri: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  const loomMatch = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loomMatch) return { uri: `https://www.loom.com/embed/${loomMatch[1]}?autoplay=1` };
  if (/\.(mp4|webm|mov|m3u8)(\?|$)/.test(url)) {
    return { html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}body{background:#000;height:100vh;display:flex;align-items:center;justify-content:center}video{width:100%;height:100%;object-fit:contain}</style></head><body><video src="${url}" autoplay playsinline controls></video></body></html>` };
  }
  return { uri: url };
}

export default function PipOverlay() {
  const { visible, url, companyName, isLive, startTime, appId, hide } = usePipStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [elapsed, setElapsed] = useState('00:00');
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDismiss, setIsOverDismiss] = useState(false);
  const dismissScale = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - PIP_WIDTH - 12, y: 60 + (insets.top || 50) })).current;

  const isInDismissZone = (moveY: number) => {
    return moveY > SCREEN_HEIGHT - DISMISS_ZONE_BOTTOM - DISMISS_ZONE_SIZE - 20;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        lastTap.current = Date.now();
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        pan.setValue({ x: g.dx, y: g.dy });
        const dragging = Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5;
        if (dragging && !isDragging) {
          setIsDragging(true);
          Animated.spring(dismissScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
        }
        setIsOverDismiss(isInDismissZone(g.moveY));
      },
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        const wasDragging = Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5;

        // Hide dismiss zone
        setIsDragging(false);
        setIsOverDismiss(false);
        Animated.timing(dismissScale, { toValue: 0, duration: 200, useNativeDriver: true }).start();

        // Check if dropped in dismiss zone
        if (wasDragging && isInDismissZone(g.moveY)) {
          hide();
          return;
        }

        // Check if it was a tap
        const wasTap = !wasDragging && (Date.now() - lastTap.current) < 300;
        if (wasTap && appId) {
          hide();
          router.push({ pathname: '/application-details', params: { id: appId, openModal: 'true' } });
          return;
        }

        // Snap to nearest edge
        const currentX = g.moveX - PIP_WIDTH / 2;
        const snapX = currentX < SCREEN_WIDTH / 2 ? 12 : SCREEN_WIDTH - PIP_WIDTH - 12;
        const clampedY = Math.max(insets.top + 10, Math.min(SCREEN_HEIGHT - PIP_HEIGHT - insets.bottom - 80, (pan.y as any)._value));
        Animated.spring(pan, { toValue: { x: snapX, y: clampedY }, useNativeDriver: false, friction: 7 }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (!visible || !startTime) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(`${Math.floor(diff / 60).toString().padStart(2, '0')}:${(diff % 60).toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [visible, startTime]);

  if (!visible || !url) return null;

  const source = getEmbeddableUrl(url);

  return (
    <>
      {/* Dismiss zone at bottom */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dismissZone,
          {
            bottom: DISMISS_ZONE_BOTTOM + insets.bottom,
            opacity: dismissScale,
            transform: [{ scale: dismissScale.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          },
        ]}
      >
        <View style={[styles.dismissCircle, isOverDismiss && styles.dismissCircleActive]}>
          <Ionicons name="close" size={28} color={isOverDismiss ? '#FFF' : '#FF4444'} />
        </View>
      </Animated.View>

      {/* PiP window */}
      <Animated.View
        style={[styles.container, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.header}>
          {isLive && <View style={styles.liveDot} />}
          <Text style={styles.title} numberOfLines={1}>{companyName || elapsed}</Text>
        </View>
        <View style={styles.webViewWrap}>
          <WebView
            source={source.html ? { html: source.html } : { uri: source.uri || '' }}
            style={styles.webView}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{isLive ? `🔴 ${elapsed}` : `⏹ ${elapsed}`}</Text>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', width: PIP_WIDTH, height: PIP_HEIGHT, backgroundColor: '#1C1C1E', borderRadius: 14, overflow: 'hidden', zIndex: 99999, elevation: 99, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.7)', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E53935' },
  title: { flex: 1, fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  webViewWrap: { flex: 1 },
  webView: { flex: 1, backgroundColor: '#000' },
  footer: { paddingVertical: 3, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  footerText: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontVariant: ['tabular-nums'] },
  dismissZone: { position: 'absolute', alignSelf: 'center', left: SCREEN_WIDTH / 2 - DISMISS_ZONE_SIZE / 2, zIndex: 99998, elevation: 98 },
  dismissCircle: { width: DISMISS_ZONE_SIZE, height: DISMISS_ZONE_SIZE, borderRadius: DISMISS_ZONE_SIZE / 2, backgroundColor: 'rgba(40,40,40,0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FF4444' },
  dismissCircleActive: { backgroundColor: '#FF4444', borderColor: '#FF6666', transform: [{ scale: 1.15 }] },
});
