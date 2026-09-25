import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {
  PASSPORT_SHARE_COUNTRIES, PASSPORT_SHARE_WITH_ACHIEVEMENTS, registerPushToken, unregisterPushToken,
} from '@tobeatraveller/shared';

// Must match ANDROID_NOTIFICATION_CHANNEL_ID in api/src/services/pushNotificationsService.js.
const ANDROID_NOTIFICATION_CHANNEL_ID = 'default';
const SUPPORTED_PUSH_LOCALES = ['en', 'es'];
const DEFAULT_PUSH_LOCALE = 'en';

let registeredToken = null;

const toPushLocale = (language) => {
  const languageCode = language?.split('-')[0];
  return SUPPORTED_PUSH_LOCALES.includes(languageCode) ? languageCode : DEFAULT_PUSH_LOCALE;
};

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  // Android 13+ only shows the permission prompt once a channel exists.
  await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

const ensurePermission = async () => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

// Returns the registered token, or null when push isn't available: web,
// permission denied, or a build without push credentials (Expo Go on
// Android, simulators). None of those are errors for the user, so they are
// swallowed and the app keeps working with in-app notifications only.
export const registerForPushNotifications = async (language) => {
  if (Platform.OS === 'web') return null;
  try {
    await ensureAndroidChannel();
    if (!(await ensurePermission())) return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken({ token, platform: Platform.OS, locale: toPushLocale(language) });
    registeredToken = token;
    return token;
  } catch {
    return null;
  }
};

// Called before logging out, while the session is still valid, so this
// device stops receiving the previous account's pushes.
export const unregisterCurrentPushToken = async () => {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await unregisterPushToken(token);
  } catch {
    // best-effort: the server also drops tokens Expo reports as unregistered
    // and purges the ones not refreshed in 90 days.
  }
};

export const routeForPushData = (data) => {
  if (!data?.type) return null;
  if (data.type === 'follow' && data.actorId) return { name: 'UserProfile', params: { id: data.actorId } };
  if (data.type === 'referral_reward') return { name: 'Referral' };
  // A badge or country's "actor" is the user who earned it; their passport
  // opens ready to share it, the moment they most want to show it off.
  if (data.type === 'badge_earned' && data.actorId) {
    return { name: 'Passport', params: { userId: data.actorId, share: PASSPORT_SHARE_WITH_ACHIEVEMENTS } };
  }
  if (data.type === 'recap_ready') return { name: 'Recap' };
  if (data.type === 'country_stamp' && data.actorId) {
    return { name: 'Passport', params: { userId: data.actorId, share: PASSPORT_SHARE_COUNTRIES } };
  }
  if (data.itineraryId) {
    return {
      name: 'Itinerary',
      params: { id: data.itineraryId, commentId: data.type === 'comment' ? data.commentId ?? undefined : undefined },
    };
  }
  return null;
};
