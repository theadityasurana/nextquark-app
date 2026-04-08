import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, ChevronRight } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = SCREEN_WIDTH * 0.9;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

const TUTORIAL_IMAGES = [
  require('@/assets/images/1.jpg'),
  require('@/assets/images/2.jpg'),
  require('@/assets/images/3.jpg'),
  require('@/assets/images/4.jpg'),
  require('@/assets/images/5.jpg'),
  require('@/assets/images/6.jpg'),
  require('@/assets/images/7.jpg'),
  require('@/assets/images/8.jpg'),
  require('@/assets/images/9.jpg'),
  require('@/assets/images/10.jpg'),
];

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TutorialModal({ visible, onClose }: TutorialModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const imageOpacity = useRef(new Animated.Value(1)).current;

  const transitionToImage = (newIndex: number) => {
    Animated.sequence([
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(newIndex);
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (currentIndex < TUTORIAL_IMAGES.length - 1) {
      transitionToImage(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      transitionToImage(currentIndex - 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <Pressable onPress={onClose} style={styles.closeButton}>
          <View style={styles.closeButtonInner}>
            <X size={24} color="#FFFFFF" />
          </View>
        </Pressable>

        <Animated.View style={[styles.imageContainer, { opacity: imageOpacity }]}>
          <Image source={TUTORIAL_IMAGES[currentIndex]} style={styles.image} resizeMode="contain" />
        </Animated.View>

        <View style={styles.controls}>
          <View style={styles.pagination}>
            {TUTORIAL_IMAGES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleBack}
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              disabled={currentIndex === 0}
            >
              <Ionicons name="chevron-back" size={24} color={currentIndex === 0 ? '#666666' : '#FFFFFF'} />
              <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
                Back
              </Text>
            </Pressable>

            <Pressable
              onPress={handleNext}
              style={[styles.navButton, currentIndex === TUTORIAL_IMAGES.length - 1 && styles.navButtonDisabled]}
              disabled={currentIndex === TUTORIAL_IMAGES.length - 1}
            >
              <Text style={[styles.navButtonText, currentIndex === TUTORIAL_IMAGES.length - 1 && styles.navButtonTextDisabled]}>
                Next
              </Text>
              <ChevronRight size={24} color={currentIndex === TUTORIAL_IMAGES.length - 1 ? '#666666' : '#FFFFFF'} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#666666',
  },
});
