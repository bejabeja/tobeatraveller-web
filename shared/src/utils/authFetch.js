import { tokenStorage } from './tokenStorage';
import { getApiUrl } from './apiConfig';

// Deduplicates concurrent refreshes: if several requests 401 around the same
// moment (access token just expired), only one refresh call goes out and the
// rest await its result instead of each minting their own.
let refreshPromise = null;

// On a weak connection that still counts as "connected" a request can hang
// for minutes before the OS gives up. Past these limits it fails as a
// network error instead, so callers fall back to cached data or the offline
// queue. Uploads get longer, since slow is expected there.
const DEFAULT_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 120_000;

const refreshAccessToken = async () => {
  const refreshToken = await tokenStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetchWithTimeout(`${getApiUrl()}/auth/refresh`, {
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

const timeoutFor = ({ timeoutMs, body }) => {
  if (timeoutMs != null) return timeoutMs;
  const isUpload = typeof FormData !== 'undefined' && body instanceof FormData;
  return isUpload ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
};

const timeoutError = () => {
  const error = new Error('Request timed out');
  error.name = 'TimeoutError';
  // Still a network error for every caller that only checks that; the
  // separate flag is for the few that must know the server may have
  // received the request anyway.
  error.isNetworkError = true;
  error.isTimeout = true;
  return error;
};

const fetchWithTimeout = async (url, { timeoutMs, ...options }) => {
  // A caller passing its own signal already controls cancellation (and
  // may need longer than the default, like AI itinerary generation).
  if (options.signal) return fetch(url, options).catch(markNetworkError);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutFor({ timeoutMs, body: options.body }));
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw timeoutError();
    return markNetworkError(error);
  } finally {
    clearTimeout(timer);
  }
};

export const authFetch = async (url, options = {}) => {
  const token = await tokenStorage.getItem('access_token');
  const response = await fetchWithTimeout(url, withAuthHeader(options, token));

  // No token, or the failure isn't auth-related: nothing a refresh would fix.
  if (!token || response.status !== 401) return response;

  refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
  const newToken = await refreshPromise;
  if (!newToken) return response;

  return fetchWithTimeout(url, withAuthHeader(options, newToken));
};
