import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail} numberOfLines={4}>
              {this.state.error.message}
            </Text>
          )}
          <Pressable style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000000',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
