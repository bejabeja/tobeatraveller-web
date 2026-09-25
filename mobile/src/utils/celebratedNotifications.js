import AsyncStorage from '@react-native-async-storage/async-storage';
import { CELEBRATED_STORAGE_KEY } from '@tobeatraveller/shared';

// Ids of the notifications already celebrated on screen on this device, so a
// new badge or country is celebrated once. If storage fails a celebration
// may repeat next time, which must never break the app.
export const getCelebratedNotifications = async () => {
  try {
    return JSON.parse((await AsyncStorage.getItem(CELEBRATED_STORAGE_KEY)) ?? '[]');
  } catch {
    return [];
  }
};

export const setCelebratedNotifications = async (ids) => {
  try {
    await AsyncStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Not kept; see above.
  }
};
