import { tokenStorage } from './tokenStorage';
import { getApiUrl } from './apiConfig';

// Deduplicates concurrent refreshes: if several requests 401 around the same
// moment (access token just expired), only one refresh call goes out and the
// rest await its result instead of each minting their own.
let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = await tokenStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    await tokenStorage.setItem('access_token', data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
};

const withAuthHeader = (options, token) => ({
  ...options,
  credentials: 'omit',
  headers: {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

// Raw fetch() rejects (TypeError) when there's no network at all, distinct
// from a resolved Response with a non-2xx status. Re-thrown with a marker
// so callers can tell "you're offline" apart from any server-side error
// (see isNetworkError in parseError.js).
const markNetworkError = (error) => {
  error.isNetworkError = true;
  throw error;
};

export const authFetch = async (url, options = {}) => {
  const token = await tokenStorage.getItem('access_token');
  const response = await fetch(url, withAuthHeader(options, token)).catch(markNetworkError);

  // No token, or the failure isn't auth-related: nothing a refresh would fix.
  if (!token || response.status !== 401) return response;

  refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
  const newToken = await refreshPromise;
  if (!newToken) return response;

  return fetch(url, withAuthHeader(options, newToken)).catch(markNetworkError);
};
