const mockPosthog = { capture: jest.fn(), identify: jest.fn(), reset: jest.fn(), optIn: jest.fn(), optOut: jest.fn() };
const mockPostHogConstructor = jest.fn(() => mockPosthog);

jest.mock('posthog-react-native', () => ({ __esModule: true, default: function PostHog(...args) { return mockPostHogConstructor(...args); } }));
jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'));
jest.mock('../../utils/config', () => ({ POSTHOG_KEY: 'phc_test', POSTHOG_HOST: 'https://eu.i.posthog.com' }));

// A fresh copy per test, as on a new launch, with the storage it really uses.
let AsyncStorage;
const loadModule = () => {
  let analytics;
  jest.isolateModules(() => {
    AsyncStorage = require('@react-native-async-storage/async-storage');
    analytics = require('../../utils/analytics');
  });
  return analytics;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// Declining (or not answering yet) must mean nothing analytics-related runs.
it('sends nothing and creates no client before the person agrees', async () => {
  const analytics = loadModule();
  await analytics.loadAnalyticsConsent();

  analytics.trackEvent('passport_viewed', { viewer: 'owner' });
  analytics.identifyUser({ id: 'u1', username: 'jane' });

  expect(mockPostHogConstructor).not.toHaveBeenCalled();
});

it('starts measuring once the person agrees, and remembers it', async () => {
  const analytics = loadModule();
  await analytics.loadAnalyticsConsent();

  await analytics.setAnalyticsConsent(true);
  analytics.trackEvent('passport_viewed', { viewer: 'owner' });

  expect(mockPosthog.capture).toHaveBeenCalledWith('passport_viewed', { viewer: 'owner' });
  expect(await AsyncStorage.getItem('analytics_consent')).toBe('granted');
});

it('keeps measuring on the next launch when the person already agreed', async () => {
  const analytics = loadModule();
  await AsyncStorage.setItem('analytics_consent', 'granted');

  expect(await analytics.loadAnalyticsConsent()).toBe('granted');
  analytics.trackEvent('recap_opened');

  expect(mockPosthog.capture).toHaveBeenCalledWith('recap_opened', {});
});

it('stops measuring when the person changes their mind', async () => {
  const analytics = loadModule();
  await analytics.setAnalyticsConsent(true);

  await analytics.setAnalyticsConsent(false);
  analytics.trackEvent('recap_opened');

  expect(mockPosthog.optOut).toHaveBeenCalled();
  expect(mockPosthog.capture).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('analytics_consent')).toBe('denied');
});

// Same redaction as the web: a referral code is someone else's username.
it('removes referral codes from events before they leave the phone', async () => {
  const analytics = loadModule();
  await analytics.setAnalyticsConsent(true);

  const { before_send: beforeSend } = mockPostHogConstructor.mock.calls[0][1];
  const event = beforeSend({ event: 'x', properties: { url: 'https://t.test/profile/u1/passport?ref=jane' } });

  expect(event.properties.url).toBe('https://t.test/profile/u1/passport?ref=shared');
});

it('identifies the signed-in user and forgets them on logout', async () => {
  const analytics = loadModule();
  await analytics.setAnalyticsConsent(true);

  analytics.identifyUser({ id: 'u1', username: 'jane', email: 'jane@t.test' });
  analytics.resetAnalytics();

  expect(mockPosthog.identify).toHaveBeenCalledWith('u1', { username: 'jane' });
  expect(mockPosthog.reset).toHaveBeenCalled();
});
