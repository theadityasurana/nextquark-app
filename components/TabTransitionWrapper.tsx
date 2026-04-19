import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TabTransitionWrapperProps {
  children: React.ReactNode;
  routeName: string;
}

export default function TabTransitionWrapper({ children, routeName }: TabTransitionWrapperProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
