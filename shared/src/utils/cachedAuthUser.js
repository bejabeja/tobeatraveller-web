import { tokenStorage } from './tokenStorage';

const CACHED_AUTH_USER_KEY = 'auth_user';

// The last session user, kept next to the tokens so the mobile app can still
// open logged in with no connection (the offline screens need to know whose
// cached data to show). Cleared on logout together with the tokens.
export const getCachedAuthUser = async () => {
  try {
    const raw = await tokenStorage.getItem(CACHED_AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedAuthUser = async (user) => {
  try {
    if (user) await tokenStorage.setItem(CACHED_AUTH_USER_KEY, JSON.stringify(user));
    else await tokenStorage.removeItem(CACHED_AUTH_USER_KEY);
  } catch {
    // Best-effort: without it the app just can't open logged in offline.
  }
};
