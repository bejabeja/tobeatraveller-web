import { redactReferralCodes } from "./analyticsEvents";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;

const CONSENT_KEY = "cookie_consent";
export const REOPEN_COOKIE_PREFERENCES_EVENT = "reopen-cookie-preferences";

// posthog-js ships session recording/surveys bundled in by default (~600KB
// unminified), so it's dynamically imported instead of adding it to the
// critical-path bundle we just finished splitting down.
let posthogPromise = null;
const loadPosthog = () => {
  if (!POSTHOG_KEY) return null;
  posthogPromise ??= import("posthog-js").then((mod) => mod.default);
  return posthogPromise;
};

export const getCookieConsent = () => localStorage.getItem(CONSENT_KEY);

const initAnalytics = () => {
  loadPosthog()?.then((posthog) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: true,
      disable_session_recording: true,
      before_send: redactReferralCodes,
    });
  });
};

// Only loads/initializes PostHog if the person already granted consent on a
// previous visit; never loads it just to check, so declining truly means
// nothing analytics-related is fetched.
export const initAnalyticsIfConsented = () => {
  if (getCookieConsent() === "granted") initAnalytics();
};

export const grantCookieConsent = () => {
  localStorage.setItem(CONSENT_KEY, "granted");
  initAnalytics();
};

export const denyCookieConsent = () => {
  localStorage.setItem(CONSENT_KEY, "denied");
  // If PostHog was already loaded (consent was granted earlier this session),
  // stop it from continuing to capture instead of just flipping the stored flag.
  posthogPromise?.then((posthog) => posthog.opt_out_capturing());
};

export const identifyUser = (user) => {
  if (!user?.id || getCookieConsent() !== "granted") return;
  loadPosthog()?.then((posthog) => posthog.identify(user.id, { email: user.email, username: user.username }));
};

export const resetAnalytics = () => {
  if (getCookieConsent() !== "granted") return;
  loadPosthog()?.then((posthog) => posthog.reset());
};

// Only with consent, like everything else here. Event names and properties
// live in analyticsEvents.js; never put personal data in the properties.
export const trackEvent = (event, properties = {}) => {
  if (getCookieConsent() !== "granted") return;
  loadPosthog()?.then((posthog) => posthog.capture(event, properties));
};
