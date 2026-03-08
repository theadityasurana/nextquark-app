import { Platform } from 'react-native';
import { supabase } from './supabase';

let Notifications: any = null;
let Device: any = null;

// Only load notifications on iOS or in development builds
if (Platform.OS === 'ios') {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
    
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (error) {
    console.log('Notifications not available:', error);
  }
}

export async function registerForPushNotifications() {
  if (!Notifications || !Device) {
    console.log('Push notifications require a development build (not available in Expo Go on Android)');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'e12076d8-bcb8-48be-af09-72bfab77d937',
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token.data;
  } catch (error) {
    console.log('Error registering for push notifications:', error);
    return null;
  }
}

export async function savePushToken(userId: string, pushToken: string) {
  const { error } = await supabase
    .from('user_push_tokens')
    .upsert({ user_id: userId, push_token: pushToken });
  
  if (error) console.error('Error saving push token:', error);
}
