import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL = extra.apiUrl || 'http://localhost:3000';
export const GEOAPIFY_KEY = extra.geoapifyKey || '';
