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

// Shared by the screens that write a cache and those that read it.
export const suppliesCacheKey = (userId) => `supplies:${userId}`;
export const packingListsCacheKey = (userId) => `packinglists:${userId}`;
export const vanTodayCacheKey = (userId) => `vantoday:${userId}`;
export const packingListItemsCacheKey = (userId, listId) => `packinglist:${userId}:${listId}`;

// Cached lists are personal data, so they go away on logout instead of
// staying readable on a device someone else may use next.
export const cacheClearAll = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter(key => key.startsWith(CACHE_PREFIX)));
  } catch {
    // Best-effort, like the rest of the cache.
  }
};
