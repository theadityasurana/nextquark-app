import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface TabTransitionWrapperProps {
  children: React.ReactNode;
  routeName: string;
}

export default function TabTransitionWrapper({ children, routeName }: TabTransitionWrapperProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [routeName]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
