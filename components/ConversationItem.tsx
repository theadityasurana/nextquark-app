import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: conversation.companyLogo }} 
          style={styles.avatar}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
        />
        {conversation.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{conversation.companyName}</Text>
          <Text style={styles.time}>{conversation.lastMessageTime}</Text>
        </View>
        <Text style={styles.jobTitle} numberOfLines={1}>{conversation.jobTitle}</Text>
        <Text style={[styles.message, conversation.unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
          {conversation.lastMessage}
        </Text>
      </View>
      {conversation.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  pressed: {
    backgroundColor: Colors.background,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 8,
  },
  jobTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  message: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 3,
  },
  unreadMessage: {
    color: Colors.textPrimary,
    fontWeight: '500' as const,
  },
  badge: {
    backgroundColor: Colors.accent,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
});
