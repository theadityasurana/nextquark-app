import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

try {
  const NotifModule = require('expo-notifications');
  // Verify the module works — throws in Expo Go SDK 53+
  if (NotifModule && typeof NotifModule.getPermissionsAsync === 'function') {
    // Probe with a harmless call to detect Expo Go SDK 53 runtime error
    NotifModule.getPermissionsAsync().catch(() => {});
    Notifications = NotifModule;
  }
  Device = require('expo-device');

  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  // expo-notifications not available (Expo Go SDK 53+, web, etc.)
  Notifications = null;
  if (__DEV__) console.log('Notifications not available, skipping');
}

// --- Keys ---
const IDX_MORNING = 'nq_notif_idx_morning';
const IDX_EVENING = 'nq_notif_idx_evening';
const IDX_MOTIVATIONAL = 'nq_notif_idx_motivational';
const FESTIVAL_YEAR_KEY = 'nq_notif_festival_year';

// --- Push token registration ---

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      await Notifications.setNotificationChannelAsync('morning', {
        name: 'Good Morning',
        importance: Notifications.AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync('evening', {
        name: 'Good Night',
        importance: Notifications.AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync('motivational', {
        name: 'Motivation',
        importance: Notifications.AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync('festival', {
        name: 'Festivals & Holidays',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '639de0ac-5a11-423c-ac9f-526386ac19f0',
    });
    return token.data;
  } catch (error) {
    if (__DEV__) console.log('Error registering for push notifications:', error);
    return null;
  }
}

export async function savePushToken(userId: string, pushToken: string) {
  try {
    // Try upsert on user_id only — one token per user
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        push_token: pushToken,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) {
      // Fallback: plain insert if constraint doesn't match
      if (__DEV__) console.log('Push token upsert fallback:', error.message);
      await supabase.from('user_push_tokens').insert({
        user_id: userId,
        push_token: pushToken,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    if (__DEV__) console.log('Error saving push token (non-critical):', e);
  }
}

// --- Rotation helper ---

async function getAndAdvanceIndex(key: string, total: number): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const idx = raw ? parseInt(raw, 10) : 0;
    const current = isNaN(idx) ? 0 : idx % total;
    await AsyncStorage.setItem(key, String((current + 1) % total));
    return current;
  } catch {
    return 0;
  }
}

// --- Cancel helpers ---

async function cancelByType(type: string) {
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

// ============================================================
// 50 GOOD MORNING MESSAGES
// ============================================================

const GOOD_MORNING_MESSAGES = [
  "Rise and shine! Today is full of new opportunities waiting for you. ☀️",
  "A brand new day, a brand new chance to land your dream job! 🌅",
  "Good things come to those who hustle. Let's make today count! 💪",
  "The early bird catches the worm — and the best job listings! 🐦",
  "Wake up with determination, go to bed with satisfaction. Let's go! 🔥",
  "Every morning is a fresh start. Your dream role is out there! 🌟",
  "Today's effort is tomorrow's success. Start strong! 💼",
  "New day, new possibilities. Your next big break could be today! ✨",
  "The world needs your talent. Get out there and show them! 🚀",
  "Mornings are for coffee and career moves. Let's do this! ☕",
  "Your future self will thank you for the effort you put in today. 🎯",
  "Success doesn't come to you — you go to it. Start now! 🏃",
  "Another beautiful day to get closer to your goals. You've got this! 🌈",
  "Champions don't hit snooze on their dreams. Rise up! 🏆",
  "Today is your day to shine brighter than yesterday. ⭐",
  "The job market rewards those who show up consistently. Be that person! 💎",
  "Great careers are built one morning at a time. Make this one count! 🏗️",
  "Your skills are in demand. Go remind the world! 💡",
  "Opportunities don't wait — and neither should you. Good morning! 🌞",
  "Start your day with purpose. Your career breakthrough is near! 🎯",
  "Every expert was once a beginner. Keep growing, keep going! 🌱",
  "The best time to apply was yesterday. The next best time is now! ⏰",
  "Your potential is limitless. Let today prove it! 🌟",
  "Dream big, work hard, stay focused. That's the morning mantra! 💫",
  "A positive attitude in the morning sets the tone for the whole day! 😊",
  "You're one application away from changing your life. Believe it! 🎉",
  "Consistency is the key to success. Show up again today! 🔑",
  "The sun is up and so are your chances. Make them count! ☀️",
  "Your journey to success starts with this very morning. Let's go! 🛤️",
  "Be so good they can't ignore you. Start proving it today! 🔥",
  "Today's small steps lead to tomorrow's giant leaps. Keep walking! 👣",
  "Embrace the grind. It's shaping you into something amazing! 💪",
  "Good morning! Remember — you're closer than you think! 🎯",
  "The only limit is the one you set for yourself. Break free today! 🦅",
  "Your hard work is planting seeds. The harvest is coming! 🌾",
  "Make today so awesome that yesterday gets jealous! 😎",
  "You didn't come this far to only come this far. Push forward! 🚀",
  "Every rejection is a setup for a bigger comeback. Stay strong! 💎",
  "Rise, grind, and shine. Your career is worth the effort! ✨",
  "The best opportunities go to those who are prepared. Be ready! 🎯",
  "Your talent is your superpower. Use it wisely today! 🦸",
  "Success is a series of small wins. Grab one today! 🏅",
  "The morning breeze carries new possibilities. Breathe them in! 🌬️",
  "You're building something incredible, one day at a time! 🏗️",
  "Stay hungry, stay foolish, stay applying! Good morning! 🍎",
  "Today's discomfort is tomorrow's strength. Embrace the challenge! 💪",
  "Your resume tells your past. Your effort today writes your future! 📝",
  "Good morning, superstar! The world is waiting for your brilliance! 🌟",
  "Don't count the days — make the days count. Starting now! 📅",
  "You are capable of amazing things. Let today be the proof! 🎉",
];

// ============================================================
// 50 GOOD NIGHT MESSAGES
// ============================================================

const GOOD_NIGHT_MESSAGES = [
  "You did great today. Rest well — tomorrow brings new opportunities! 🌙",
  "Another productive day done. Sweet dreams and bigger goals tomorrow! 💤",
  "Sleep tight! Your dream job is getting closer with every effort. ⭐",
  "Rest is part of the journey. Recharge for an amazing tomorrow! 🔋",
  "You showed up today, and that matters. Goodnight, champion! 🏆",
  "Close your eyes knowing you gave today your best. That's enough! 🌟",
  "The stars are out, and so is your potential. Sleep well! ✨",
  "Tonight, let go of stress. Tomorrow is a fresh canvas! 🎨",
  "Your hard work today is building the career of your dreams. Rest now! 🏗️",
  "Goodnight! Remember, even the most successful people need sleep! 😴",
  "You're one day closer to your breakthrough. Sweet dreams! 🌈",
  "Let tonight's rest fuel tomorrow's hustle. You deserve it! 💪",
  "The night is for dreaming. Dream big — then wake up and chase it! 🚀",
  "Proud of you for not giving up. Rest well, warrior! ⚔️",
  "Tomorrow is another chance to be amazing. Sleep on that thought! 💫",
  "Your persistence is your greatest asset. Recharge it tonight! 🔑",
  "Goodnight! The best chapters of your career are still unwritten! 📖",
  "Let the moonlight remind you — even in darkness, you shine! 🌕",
  "You've earned this rest. Tomorrow, we go again! 💎",
  "Sleep peacefully knowing you're on the right path! 🛤️",
  "Every night is a chance to reset. Wake up stronger tomorrow! 💪",
  "The world needs your energy. Save some for tomorrow! ⚡",
  "Goodnight! Your dedication today will pay off soon. Trust the process! 🎯",
  "Rest your mind, refresh your spirit. Big things are coming! 🌟",
  "You're doing better than you think. Sleep with that confidence! 😊",
  "Tonight, be grateful for how far you've come. Goodnight! 🙏",
  "Dreams are the seeds of reality. Plant good ones tonight! 🌱",
  "Your journey is unique and beautiful. Rest up for the next chapter! 📚",
  "Goodnight! Tomorrow's opportunities are already being prepared for you! 🎁",
  "Let go of today's worries. Tomorrow is a blank slate! 📝",
  "You fought hard today. Now rest like the champion you are! 🏅",
  "The night sky is vast, just like your potential. Sweet dreams! 🌌",
  "Sleep well knowing that consistency always wins in the end! 🏆",
  "Your future employer is out there. Rest up to impress them tomorrow! 💼",
  "Goodnight! Every sunset leads to a new sunrise of possibilities! 🌅",
  "You're not just job hunting — you're building a legacy. Rest well! 👑",
  "Let tonight's peace prepare you for tomorrow's victories! ✌️",
  "The best is yet to come. Sleep on that promise! 💫",
  "Goodnight, go-getter! Tomorrow is another day to make it happen! 🔥",
  "Your resilience is inspiring. Recharge and come back stronger! 💎",
  "Rest well! The universe is conspiring in your favor! 🌠",
  "Tonight, release all doubt. You are exactly where you need to be! 🧘",
  "Goodnight! Your skills and talent are your ticket to success! 🎫",
  "Sleep is the best meditation. Find your peace tonight! 🕊️",
  "You're writing an incredible success story. Rest before the next chapter! ✍️",
  "Goodnight! Remember — slow progress is still progress! 🐢",
  "The moon believes in you. So do we. Sweet dreams! 🌙",
  "Let tonight's rest be the foundation for tomorrow's greatness! 🏛️",
  "You've planted seeds of success today. Let them grow overnight! 🌻",
  "Goodnight! Wake up tomorrow ready to conquer the world! 🌍",
];

// ============================================================
// 50 MOTIVATIONAL / "START SWIPING" MESSAGES
// ============================================================

const MOTIVATIONAL_MESSAGES = [
  "Your dream job won't apply itself! Start swiping and make it happen! 🎯",
  "Opportunities are waiting. Open the app and start swiping! 🚀",
  "The perfect role could be just one swipe away. Don't miss it! 👆",
  "Feeling stuck? A quick swipe session could change everything! 💡",
  "Your next career move is hiding in your feed. Start swiping! 🔍",
  "15 minutes of swiping today could lead to a lifetime of success! ⏱️",
  "The best candidates are proactive. Be one — start swiping now! 💪",
  "New jobs just dropped! Swipe through them before they're gone! 🆕",
  "Your skills deserve the spotlight. Swipe right on your future! ✨",
  "Don't let great opportunities pass you by. Start swiping! 🏃",
  "A little effort every day goes a long way. Time to swipe! 📈",
  "Your competition is swiping right now. Stay ahead of the game! 🏆",
  "The job market is hot today. Get in there and start swiping! 🔥",
  "One swipe could lead to one interview could lead to one offer! 🎉",
  "Invest in your future — it only takes a few swipes! 💰",
  "Fresh opportunities are waiting for you. Start swiping! 🌟",
  "Your career won't build itself. Take action — swipe now! 🏗️",
  "The afternoon is perfect for a quick job hunt. Start swiping! 🌤️",
  "Remember why you started. Now keep going — swipe! 💫",
  "Success favors the bold. Be bold and start swiping! 🦁",
  "Your next big break is one swipe away. Go find it! 🎯",
  "Take a break from the routine — swipe on something exciting! 🎢",
  "The right job is looking for someone exactly like you. Swipe! 🤝",
  "Don't wait for opportunity to knock. Swipe the door open! 🚪",
  "A few swipes a day keeps unemployment away! Start now! 😄",
  "Your future self is cheering you on. Start swiping! 📣",
  "Great things never came from comfort zones. Swipe into action! 🌊",
  "The afternoon slump is real. Beat it with a swipe session! ☕",
  "Your talent is too good to sit idle. Start swiping! 💎",
  "Every swipe is a step toward your dream career. Take one now! 👣",
  "The best time to swipe was yesterday. The next best time is now! ⏰",
  "Unlock new possibilities with just a few swipes! 🔓",
  "Your profile is looking great. Now put it to work — swipe! 💼",
  "Momentum is everything. Keep it going with a quick swipe! 🎳",
  "The job market rewards consistency. Swipe a little every day! 🔄",
  "You're closer than you think. One more swipe session could do it! 🎯",
  "Turn your afternoon into a career-building session. Start swiping! 🏋️",
  "New matches are waiting for you. Open up and start swiping! 💌",
  "Your resume is ready. Your skills are sharp. Now swipe! ⚡",
  "Don't let today pass without making a move. Swipe now! 🎬",
  "The perfect job doesn't wait. Neither should you. Start swiping! ⚡",
  "A swipe a day keeps career regret away! Let's go! 🌈",
  "Your network grows with every application. Start swiping! 🕸️",
  "Feeling motivated? Channel that energy into swiping! 🔋",
  "The afternoon is young and so is your career. Swipe! 🌻",
  "Small actions create big results. Start with a swipe! 🧩",
  "Your dream company might have just posted a role. Check it out! 🏢",
  "Stay in the game. A quick swipe session keeps you competitive! 🎮",
  "You've got the skills, the drive, and the app. Now swipe! 📱",
  "End your afternoon on a high note — swipe into your future! 🎵",
];

// ============================================================
// INDIAN FESTIVALS & NATIONAL HOLIDAYS (2025 dates)
// ============================================================

interface FestivalEntry {
  month: number; // 1-12
  day: number;
  title: string;
  emoji: string;
}

const INDIAN_FESTIVALS: FestivalEntry[] = [
  { month: 1, day: 14, title: "Makar Sankranti", emoji: "🪁" },
  { month: 1, day: 15, title: "Pongal", emoji: "🌾" },
  { month: 1, day: 26, title: "Republic Day", emoji: "🇮🇳" },
  { month: 2, day: 12, title: "Vasant Panchami", emoji: "🌸" },
  { month: 2, day: 26, title: "Maha Shivaratri", emoji: "🔱" },
  { month: 3, day: 14, title: "Holi", emoji: "🎨" },
  { month: 3, day: 30, title: "Ugadi / Gudi Padwa", emoji: "🌺" },
  { month: 3, day: 31, title: "Eid-ul-Fitr", emoji: "🌙" },
  { month: 4, day: 6, title: "Ram Navami", emoji: "🏹" },
  { month: 4, day: 10, title: "Mahavir Jayanti", emoji: "☸️" },
  { month: 4, day: 13, title: "Baisakhi", emoji: "🌾" },
  { month: 4, day: 14, title: "Ambedkar Jayanti", emoji: "📘" },
  { month: 4, day: 18, title: "Good Friday", emoji: "✝️" },
  { month: 5, day: 1, title: "May Day", emoji: "✊" },
  { month: 5, day: 12, title: "Buddha Purnima", emoji: "🪷" },
  { month: 6, day: 7, title: "Eid-ul-Adha", emoji: "🌙" },
  { month: 7, day: 6, title: "Muharram", emoji: "🕌" },
  { month: 7, day: 17, title: "Guru Purnima", emoji: "🙏" },
  { month: 8, day: 9, title: "Raksha Bandhan", emoji: "🧵" },
  { month: 8, day: 15, title: "Independence Day", emoji: "🇮🇳" },
  { month: 8, day: 16, title: "Janmashtami", emoji: "🦚" },
  { month: 8, day: 27, title: "Ganesh Chaturthi", emoji: "🐘" },
  { month: 9, day: 5, title: "Onam", emoji: "🛶" },
  { month: 9, day: 5, title: "Teachers' Day", emoji: "📚" },
  { month: 9, day: 22, title: "Navratri Begins", emoji: "🪔" },
  { month: 10, day: 1, title: "Navratri Ends / Maha Navami", emoji: "🪔" },
  { month: 10, day: 2, title: "Dussehra / Vijayadashami", emoji: "🏹" },
  { month: 10, day: 2, title: "Gandhi Jayanti", emoji: "🕊️" },
  { month: 10, day: 20, title: "Diwali", emoji: "🪔" },
  { month: 10, day: 21, title: "Govardhan Puja", emoji: "⛰️" },
  { month: 10, day: 22, title: "Bhai Dooj", emoji: "👫" },
  { month: 11, day: 1, title: "Chhath Puja", emoji: "🌅" },
  { month: 11, day: 5, title: "Guru Nanak Jayanti", emoji: "🙏" },
  { month: 11, day: 15, title: "Milad-un-Nabi", emoji: "🌙" },
  { month: 11, day: 19, title: "Children's Day", emoji: "👶" },
  { month: 12, day: 25, title: "Christmas", emoji: "🎄" },
  { month: 12, day: 31, title: "New Year's Eve", emoji: "🎆" },
  { month: 1, day: 1, title: "New Year", emoji: "🎉" },
];

// ============================================================
// WELCOME NOTIFICATION
// ============================================================

export async function sendWelcomeNotification(firstName: string) {
  if (!Notifications) return;
  try {
    const name = firstName || 'there';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Welcome to NextQuark, ${name}! 🎉`,
        body: "Your profile is set up! Start swiping to discover your dream job. We're rooting for you! 🚀",
        data: { type: 'welcome' },
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });
  } catch (e) {
    if (__DEV__) console.log('Error sending welcome notification:', e);
  }
}

// ============================================================
// SUBSCRIPTION UPGRADE NOTIFICATION
// ============================================================

const SUBSCRIPTION_NOTIFICATIONS: Record<string, { title: string; body: string }> = {
  pro: { title: 'You\'re now a Pro! \u{1F389}', body: 'Enjoy 200 swipes/month, AI auto-fill, priority support & profile boost. Start swiping!' },
  premium: { title: 'Welcome to Premium! \u{1F451}', body: 'You\'ve unlocked 500 swipes/month and all exclusive features. Go land your dream job!' },
  custom: { title: 'Swipes Added! \u{26A1}', body: 'Your custom swipes have been added to your account. Happy swiping!' },
  coupon: { title: 'Plan Activated! \u{1F381}', body: 'Your coupon has been applied and your plan is now active. Enjoy!' },
};

export async function sendSubscriptionNotification(planType: string, isCoupon?: boolean) {
  if (!Notifications) return;
  try {
    const config = isCoupon ? SUBSCRIPTION_NOTIFICATIONS.coupon : (SUBSCRIPTION_NOTIFICATIONS[planType] || SUBSCRIPTION_NOTIFICATIONS.custom);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: config.title,
        body: config.body,
        data: { type: 'subscription_upgrade', plan: planType },
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
  } catch (e) {
    if (__DEV__) console.log('Error sending subscription notification:', e);
  }
}

// ============================================================
// SCHEDULE GOOD MORNING (7 AM daily, rotating)
// ============================================================

export async function scheduleMorningMotivation(firstName: string) {
  if (!Notifications) return;
  try {
    await cancelByType('morning_motivation');
    const idx = await getAndAdvanceIndex(IDX_MORNING, GOOD_MORNING_MESSAGES.length);
    const name = firstName || 'there';
    const msg = GOOD_MORNING_MESSAGES[idx];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Good morning, ${name}! ☀️`,
        body: msg,
        data: { type: 'morning_motivation' },
        ...(Platform.OS === 'android' && { channelId: 'morning' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 0,
      },
    });
  } catch (e) {
    if (__DEV__) console.log('Error scheduling morning notification:', e);
  }
}

export async function cancelMorningMotivation() {
  await cancelByType('morning_motivation');
}

// ============================================================
// SCHEDULE GOOD NIGHT (11 PM daily, rotating)
// ============================================================

export async function scheduleEveningEncouragement(firstName: string) {
  if (!Notifications) return;
  try {
    await cancelByType('evening_encouragement');
    const idx = await getAndAdvanceIndex(IDX_EVENING, GOOD_NIGHT_MESSAGES.length);
    const name = firstName || 'there';
    const msg = GOOD_NIGHT_MESSAGES[idx];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Goodnight, ${name}! 🌙`,
        body: msg,
        data: { type: 'evening_encouragement' },
        ...(Platform.OS === 'android' && { channelId: 'evening' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 23,
        minute: 0,
      },
    });
  } catch (e) {
    if (__DEV__) console.log('Error scheduling evening notification:', e);
  }
}

export async function cancelEveningEncouragement() {
  await cancelByType('evening_encouragement');
}

// ============================================================
// SCHEDULE MOTIVATIONAL / "START SWIPING" (4 PM daily, rotating)
// ============================================================

export async function scheduleMotivationalReminder(firstName: string) {
  if (!Notifications) return;
  try {
    await cancelByType('motivational_reminder');
    const idx = await getAndAdvanceIndex(IDX_MOTIVATIONAL, MOTIVATIONAL_MESSAGES.length);
    const name = firstName || 'there';
    const msg = MOTIVATIONAL_MESSAGES[idx];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Hey ${name}, time to swipe! 💪`,
        body: msg,
        data: { type: 'motivational_reminder' },
        ...(Platform.OS === 'android' && { channelId: 'motivational' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 16,
        minute: 0,
      },
    });
  } catch (e) {
    if (__DEV__) console.log('Error scheduling motivational notification:', e);
  }
}

export async function cancelMotivationalReminder() {
  await cancelByType('motivational_reminder');
}

// ============================================================
// SCHEDULE FESTIVAL / HOLIDAY NOTIFICATIONS
// ============================================================

export async function scheduleFestivalNotifications(firstName: string) {
  if (!Notifications) return;
  try {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Only reschedule once per year
    const lastYear = await AsyncStorage.getItem(FESTIVAL_YEAR_KEY);
    if (lastYear === String(currentYear)) return;

    await cancelByType('festival');
    const name = firstName || 'there';

    for (const fest of INDIAN_FESTIVALS) {
      const festDate = new Date(currentYear, fest.month - 1, fest.day, 8, 0, 0);
      // Only schedule if the festival is in the future
      if (festDate <= now) continue;

      const secondsUntil = Math.floor((festDate.getTime() - now.getTime()) / 1000);
      if (secondsUntil <= 0) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Happy ${fest.title}, ${name}! ${fest.emoji}`,
          body: `Wishing you a wonderful ${fest.title}! Enjoy the celebrations and have a great day! 🎊`,
          data: { type: 'festival', festival: fest.title },
          ...(Platform.OS === 'android' && { channelId: 'festival' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
        },
      });
    }

    await AsyncStorage.setItem(FESTIVAL_YEAR_KEY, String(currentYear));
    if (__DEV__) console.log('Festival notifications scheduled for', currentYear);
  } catch (e) {
    if (__DEV__) console.log('Error scheduling festival notifications:', e);
  }
}

// ============================================================
// 20 "WE MISS YOU" MESSAGES
// ============================================================

const MISS_YOU_MESSAGES = [
  "We're missing you! New jobs are waiting for your swipe. Come back! 💼",
  "It's been a while! Fresh opportunities have been added just for you. 🚀",
  "Your dream job might have just been posted. Don't miss out! ✨",
  "Hey, we noticed you've been away. The job market is buzzing — come check it out! 🔥",
  "Swipe Jobs misses you! New roles from top companies are live now. 🏢",
  "Opportunities don't wait forever. Come back and keep swiping! 💪",
  "Your next career move could be one swipe away. We miss you! 🎯",
  "The best candidates stay active. Come back and stay ahead! 🏆",
  "New jobs matching your profile just dropped. Come take a look! 🌟",
  "We've been saving the best jobs for you. Come back and explore! 💎",
  "Your profile is still looking great. Now put it to work — come swipe! 📱",
  "Miss swiping? We miss you too! New opportunities await. 👋",
  "The job market never sleeps, and neither should your hustle. Come back! ⚡",
  "Great things happen to those who show up. We're waiting for you! 🌈",
  "Your career journey isn't over. Come back and keep building! 🏗️",
  "Recruiters are looking for someone like you. Don't keep them waiting! 🤝",
  "A quick swipe session could change everything. We miss you! 💫",
  "New companies, new roles, new possibilities. Come see what's new! 🆕",
  "Your competition is swiping. Stay in the game — come back! 🎮",
  "We saved your spot. Come back and pick up where you left off! 🔖",
];

// ============================================================
// SCHEDULE "WE MISS YOU" (fires 24h after last app open)
// ============================================================

export async function scheduleMissYouNotification(firstName: string) {
  if (!Notifications) return;
  try {
    await cancelByType('miss_you');
    const name = firstName || 'there';
    const idx = Math.floor(Math.random() * MISS_YOU_MESSAGES.length);
    const msg = MISS_YOU_MESSAGES[idx];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `We miss you, ${name}! 👋`,
        body: msg,
        data: { type: 'miss_you' },
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 24 * 60 * 60, // 24 hours
      },
    });
  } catch (e) {
    if (__DEV__) console.log('Error scheduling miss-you notification:', e);
  }
}

export async function cancelMissYouNotification() {
  await cancelByType('miss_you');
}

// ============================================================
// SCHEDULE TRENDING JOB (7 PM daily, random job with deep link)
// ============================================================

async function fetchRandomJob(): Promise<{ id: string; title: string; company: string } | null> {
  try {
    const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    if (!count || count === 0) return null;

    const randomOffset = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, job_title, company_name')
      .range(randomOffset, randomOffset)
      .limit(1)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      title: data.title || data.job_title || 'A new role',
      company: data.company_name || 'a top company',
    };
  } catch {
    return null;
  }
}

export async function scheduleTrendingJobNotification(firstName: string) {
  if (!Notifications) return;
  try {
    await cancelByType('trending_job');
    const job = await fetchRandomJob();
    if (!job) return;

    const name = firstName || 'there';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 Trending Job Alert, ${name}!`,
        body: `${job.title} at ${job.company} is trending right now! Tap to view details.`,
        data: { type: 'trending_job', job_id: job.id },
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 0,
      },
    });
  } catch (e) {
    if (__DEV__) console.log('Error scheduling trending job notification:', e);
  }
}

export async function cancelTrendingJobNotification() {
  await cancelByType('trending_job');
}

// ============================================================
// MASTER SCHEDULER — call on every app open / login
// ============================================================

export async function scheduleAllNotifications(firstName: string) {
  await scheduleMorningMotivation(firstName);
  await scheduleEveningEncouragement(firstName);
  await scheduleMotivationalReminder(firstName);
  await scheduleFestivalNotifications(firstName);
  await scheduleMissYouNotification(firstName);
  await scheduleTrendingJobNotification(firstName);
}

// ============================================================
// REMOTE NOTIFICATIONS (Supabase — kept for compatibility)
// ============================================================

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'broadcast' | 'user_specific';
  data: Record<string, any>;
  created_at: string;
  read?: boolean;
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_user_id.is.null,target_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];

    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      data: n.data || {},
      created_at: n.created_at,
    }));
  } catch {
    return [];
  }
}
