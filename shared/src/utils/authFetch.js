import { tokenStorage } from './tokenStorage';

export const authFetch = async (url, options = {}) => {
  const token = await tokenStorage.getItem('access_token');
  return fetch(url, {
    ...options,
    credentials: 'omit',
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
