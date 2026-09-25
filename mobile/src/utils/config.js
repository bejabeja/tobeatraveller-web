import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL = extra.apiUrl || 'http://localhost:3000';
export const GEOAPIFY_KEY = extra.geoapifyKey || '';
export const WEB_URL = extra.webUrl || 'http://localhost:5173';
export const POSTHOG_KEY = extra.posthogKey || '';
export const POSTHOG_HOST = extra.posthogHost || '';
