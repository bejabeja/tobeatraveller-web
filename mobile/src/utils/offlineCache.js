import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'offline-cache:';

export const cacheGet = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key, value) => {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Best-effort: a full/unavailable disk cache shouldn't break the screen.
  }
};
