import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useRef, useImperativeHandle, forwardRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HEADER_HEIGHT = 60;

export interface AnimatedHeaderScrollViewRef {
  scrollToTop: (animated?: boolean) => void;
}

interface Props {
  largeTitle: string;
  subtitle?: string;
  children: React.ReactNode;
  rightComponent?: React.ReactNode;
  showsVerticalScrollIndicator?: boolean;
  backgroundColor?: string;
  largeTitleColor?: string;
  subtitleColor?: string;
  largeHeaderTitleStyle?: any;
  largeHeaderSubtitleStyle?: any;
  smallHeaderTitleStyle?: any;
  smallHeaderSubtitleStyle?: any;
  contentContainerStyle?: any;
  refreshControl?: React.ReactElement;
  scrollRef?: React.Ref<AnimatedHeaderScrollViewRef>;
}

export const AnimatedHeaderScrollView = memo<Props>(
  ({
    largeTitle,
    subtitle,
    children,
    rightComponent,
    showsVerticalScrollIndicator = false,
    backgroundColor = "#000",
    largeTitleColor = "#FFF",
    subtitleColor = "#A3A3A3",
    largeHeaderTitleStyle,
    largeHeaderSubtitleStyle,
    smallHeaderTitleStyle,
    smallHeaderSubtitleStyle,
    contentContainerStyle,
    refreshControl,
    scrollRef,
  }) => {
    const scrollY = useRef(new Animated.Value(0)).current;
    const innerScrollRef = useRef<any>(null);
    const insets = useSafeAreaInsets();

    useImperativeHandle(scrollRef, () => ({
      scrollToTop: (animated = true) => {
        innerScrollRef.current?.scrollTo?.({ y: 0, animated });
        innerScrollRef.current?.getNode?.()?.scrollTo?.({ y: 0, animated });
      },
    }));
    const totalHeader = HEADER_HEIGHT + insets.top;

    // Large title: fade out 0→60, scale up on overscroll
    const largeTitleOpacity = scrollY.interpolate({
      inputRange: [0, 60],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    const largeTitleScale = scrollY.interpolate({
      inputRange: [-120, 0],
      outputRange: [1.35, 1],
      extrapolate: "clamp",
    });

    // Small collapsed header: fade+slide in 40→80
    const smallHeaderOpacity = scrollY.interpolate({
      inputRange: [40, 80],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });
    const smallHeaderTranslateY = scrollY.interpolate({
      inputRange: [40, 80],
      outputRange: [10, 0],
      extrapolate: "clamp",
    });

    // Background blur: fade in 0→80
    const headerBgOpacity = scrollY.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    // Subtitle in collapsed header: delayed fade 80→120
    const smallSubtitleOpacity = scrollY.interpolate({
      inputRange: [80, 120],
      outputRange: [0, 0.6],
      extrapolate: "clamp",
    });
    const smallSubtitleTranslateY = scrollY.interpolate({
      inputRange: [80, 120],
      outputRange: [6, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={[styles.container, { backgroundColor }]}>
        {/* Collapsed header background */}
        <Animated.View
          style={[
            styles.headerBg,
            { height: totalHeader + 20, opacity: headerBgOpacity },
          ]}
        >
          {Platform.OS !== "web" ? (
            <>
              <BlurView
                intensity={50}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.3)", "transparent"]}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.85)" },
              ]}
            />
          )}
        </Animated.View>

        {/* Collapsed small title */}
        <Animated.View
          style={[
            styles.fixedHeader,
            {
              paddingTop: insets.top,
              height: totalHeader,
              opacity: smallHeaderOpacity,
              transform: [{ translateY: smallHeaderTranslateY }],
            },
          ]}
        >
          <View style={styles.fixedHeaderInner}>
            <View style={styles.titleCenter}>
              <Text
                style={[
                  styles.smallTitle,
                  { color: largeTitleColor },
                  smallHeaderTitleStyle,
                ]}
                numberOfLines={1}
              >
                {largeTitle}
              </Text>
              {subtitle ? (
                <Animated.Text
                  style={[
                    styles.smallSubtitle,
                    {
                      color: subtitleColor,
                      opacity: smallSubtitleOpacity,
                      transform: [{ translateY: smallSubtitleTranslateY }],
                    },
                    smallHeaderSubtitleStyle,
                  ]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Animated.Text>
              ) : null}
            </View>
            {rightComponent ? (
              <View style={styles.rightSlot}>{rightComponent}</View>
            ) : null}
          </View>
        </Animated.View>

        {/* Scrollable content */}
        <Animated.ScrollView
          ref={innerScrollRef}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          refreshControl={refreshControl as any}
          contentContainerStyle={[
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 32,
            },
            contentContainerStyle,
          ]}
        >
          {/* Large title */}
          <Animated.View
            style={[
              styles.largeTitleWrap,
              {
                opacity: largeTitleOpacity,
                transform: [{ scale: largeTitleScale }],
              },
            ]}
          >
            <View style={styles.largeTitleRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.largeTitle,
                    { color: largeTitleColor },
                    largeHeaderTitleStyle,
                  ]}
                >
                  {largeTitle}
                </Text>
                {subtitle ? (
                  <Text
                    style={[
                      styles.largeSubtitle,
                      { color: subtitleColor },
                      largeHeaderSubtitleStyle,
                    ]}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {rightComponent ? (
                <View style={styles.largeTitleRight}>{rightComponent}</View>
              ) : null}
            </View>
          </Animated.View>

          <View style={styles.content}>{children}</View>
        </Animated.ScrollView>
      </View>
    );
  }
);

export default AnimatedHeaderScrollView;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
    justifyContent: "flex-end",
  },
  fixedHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  titleCenter: { flex: 1, alignItems: "center" },
  smallTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  smallSubtitle: { fontSize: 12, textAlign: "center", marginTop: 1 },
  rightSlot: { marginLeft: 12 },
  largeTitleWrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
    transformOrigin: "left center",
  },
  largeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  largeTitleRight: {
    marginLeft: 12,
  },
  largeTitle: { fontSize: 40, fontWeight: "800", letterSpacing: -0.5 },
  largeSubtitle: { fontSize: 16, marginTop: 4 },
  content: { paddingHorizontal: 16 },
});
