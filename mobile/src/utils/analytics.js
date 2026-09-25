import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';
import { redactReferralCodes } from '@tobeatraveller/shared';
import { POSTHOG_HOST, POSTHOG_KEY } from './config';

export const ANALYTICS_CONSENT_KEY = 'analytics_consent';
export const ANALYTICS_CONSENT = Object.freeze({ GRANTED: 'granted', DENIED: 'denied' });

// null until the person answers. Kept here so tracking calls stay synchronous.
let consent = null;
let posthog = null;
const consentListeners = new Set();

// The first-launch notice and the settings switch show the same answer.
export const subscribeToAnalyticsConsent = (listener) => {
  consentListeners.add(listener);
  return () => consentListeners.delete(listener);
};

// Created only once the person agrees: until then nothing is sent, and no
// identifier is stored on the phone. Same events and redaction as the web.
const client = () => {
  if (!POSTHOG_KEY || consent !== ANALYTICS_CONSENT.GRANTED) return null;
  posthog ??= new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST || undefined,
    personProfiles: 'identified_only',
    before_send: redactReferralCodes,
  });
  return posthog;
};

export const loadAnalyticsConsent = async () => {
  try {
    consent = await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY);
  } catch {
    consent = null;
  }
  return consent;
};

export const setAnalyticsConsent = async (granted) => {
  consent = granted ? ANALYTICS_CONSENT.GRANTED : ANALYTICS_CONSENT.DENIED;
  try {
    await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  } catch {
    // Asked again next launch; tracking already follows the answer now.
  }
  if (granted) client()?.optIn();
  else posthog?.optOut();
  consentListeners.forEach(listener => listener(consent));
};

// Only the id and username: PostHog needs nothing else to tell people apart.
export const identifyUser = (user) => {
  if (!user?.id) return;
  client()?.identify(user.id, { username: user.username });
};

export const resetAnalytics = () => {
  client()?.reset();
};

// Event names and properties live in shared analyticsEvents.js; never put
// personal data in the properties.
export const trackEvent = (event, properties = {}) => {
  client()?.capture(event, properties);
};
