import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGmailMessages } from './gmail';
import { getValidAccessToken } from './gmailAuth';

const LAST_CHECK_KEY = 'gmail_last_check';
const LAST_MESSAGE_ID_KEY = 'gmail_last_message_id';

// Notifications disabled - not supported in Expo Go
export async function registerForPushNotifications(): Promise<string | null> {
  console.log('Notifications disabled in Expo Go');
  return null;
}

export async function checkForNewEmails(): Promise<void> {
  try {
    const token = await getValidAccessToken();
    if (!token) return;

    const messages = await fetchGmailMessages(token, 5);
    if (messages.length === 0) return;

    const lastMessageId = await AsyncStorage.getItem(LAST_MESSAGE_ID_KEY);
    if (messages.length > 0) {
      await AsyncStorage.setItem(LAST_MESSAGE_ID_KEY, messages[0].internalDate);
    }

    await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
  } catch (error) {
    console.log('checkForNewEmails error:', error);
  }
}

export function setupNotificationListener(onNotificationTap: (threadId: string, messageId: string) => void) {
  return () => {}; // No-op cleanup
}
