jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'project-1' } } },
}));

jest.mock('@tobeatraveller/shared', () => {
  const { PASSPORT_SHARE_COUNTRIES, PASSPORT_SHARE_MOMENT, PASSPORT_SHARE_WITH_ACHIEVEMENTS } = jest.requireActual('../../../../shared/src/utils/constants/badges.js');
  return {
    ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
    PASSPORT_SHARE_COUNTRIES,
    PASSPORT_SHARE_MOMENT,
    PASSPORT_SHARE_WITH_ACHIEVEMENTS,
    registerPushToken: jest.fn(),
    unregisterPushToken: jest.fn(),
  };
});

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerPushToken, unregisterPushToken } from '@tobeatraveller/shared';
import {
  registerForPushNotifications, routeForPushData, unregisterCurrentPushToken,
} from '../../utils/pushNotifications';

const TOKEN = 'ExponentPushToken[device-1]';

beforeEach(async () => {
  await unregisterCurrentPushToken();
  jest.clearAllMocks();
  Platform.OS = 'android';
  Notifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: TOKEN });
  registerPushToken.mockResolvedValue();
  unregisterPushToken.mockResolvedValue();
});

describe('registerForPushNotifications', () => {
  it('registers the Expo token with the platform and the app language', async () => {
    const token = await registerForPushNotifications('es');

    expect(token).toBe(TOKEN);
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-1' });
    expect(registerPushToken).toHaveBeenCalledWith({ token: TOKEN, platform: 'android', locale: 'es' });
  });

  it('sends English for a language the server has no push texts for', async () => {
    await registerForPushNotifications('fr-FR');

    expect(registerPushToken).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }));
  });

  it('creates the Android channel before asking for permission', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });

    await registerForPushNotifications('en');

    const channelOrder = Notifications.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const requestOrder = Notifications.requestPermissionsAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(requestOrder);
  });

  it('does not register anything when the user denies permission', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: false });

    const token = await registerForPushNotifications('en');

    expect(token).toBeNull();
    expect(registerPushToken).not.toHaveBeenCalled();
  });

  it('does not prompt again once the user blocked notifications in system settings', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    await registerForPushNotifications('en');

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns null instead of throwing when the build has no push credentials', async () => {
    Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error('No FCM credentials'));

    await expect(registerForPushNotifications('en')).resolves.toBeNull();
  });

  it('skips push entirely on web', async () => {
    Platform.OS = 'web';

    const token = await registerForPushNotifications('en');

    expect(token).toBeNull();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('unregisterCurrentPushToken', () => {
  it('unregisters the token this device registered', async () => {
    await registerForPushNotifications('en');

    await unregisterCurrentPushToken();

    expect(unregisterPushToken).toHaveBeenCalledWith(TOKEN);
  });

  it('does nothing when this device never registered a token', async () => {
    await unregisterCurrentPushToken();

    expect(unregisterPushToken).not.toHaveBeenCalled();
  });

  it('does not throw when the server call fails, so logout still goes ahead', async () => {
    await registerForPushNotifications('en');
    unregisterPushToken.mockRejectedValue(new Error('offline'));

    await expect(unregisterCurrentPushToken()).resolves.toBeUndefined();
  });
});

describe('routeForPushData', () => {
  it('opens the follower profile for a follow', () => {
    expect(routeForPushData({ type: 'follow', actorId: 'u2' })).toEqual({ name: 'UserProfile', params: { id: 'u2' } });
  });

  it('opens the itinerary at the comment for a comment', () => {
    expect(routeForPushData({ type: 'comment', itineraryId: 'i1', commentId: 'c1' }))
      .toEqual({ name: 'Itinerary', params: { id: 'i1', commentId: 'c1' } });
  });

  it('opens the itinerary without a comment for a like', () => {
    expect(routeForPushData({ type: 'like', itineraryId: 'i1', commentId: null }))
      .toEqual({ name: 'Itinerary', params: { id: 'i1', commentId: undefined } });
  });

  it('opens the referral screen for a referral reward', () => {
    expect(routeForPushData({ type: 'referral_reward', itineraryId: 'i1' })).toEqual({ name: 'Referral' });
  });

  it('opens the card of the badge they earned, ready to share', () => {
    expect(routeForPushData({ type: 'badge_earned', actorId: 'u1', badgeId: 'countries_5' }))
      .toEqual({ name: 'Passport', params: { userId: 'u1', share: 'moment', badge: 'countries_5' } });
  });

  // Sent before pushes carried which badge or country it was.
  it("opens the user's own passport, ready to share, for an older badge push", () => {
    expect(routeForPushData({ type: 'badge_earned', actorId: 'u1' }))
      .toEqual({ name: 'Passport', params: { userId: 'u1', share: 'achievements' } });
  });

  it('opens the yearly recap', () => {
    expect(routeForPushData({ type: 'recap_ready', actorId: 'u1' })).toEqual({ name: 'Recap', params: { from: 'notification' } });
  });

  it('opens the card of the new country, ready to share', () => {
    expect(routeForPushData({ type: 'country_stamp', actorId: 'u1', countryCode: 'IT' }))
      .toEqual({ name: 'Passport', params: { userId: 'u1', share: 'moment', country: 'IT' } });
  });

  it("opens the user's own passport, ready to share, for an older country push", () => {
    expect(routeForPushData({ type: 'country_stamp', actorId: 'u1' }))
      .toEqual({ name: 'Passport', params: { userId: 'u1', share: 'countries' } });
  });

  // Their passport, where the countries in common and the ranking are.
  it("opens the passport of the friend who earned a new stamp", () => {
    expect(routeForPushData({ type: 'friend_stamp', actorId: 'ana', countryCode: 'PT' }))
      .toEqual({ name: 'Passport', params: { userId: 'ana' } });
  });

  it('ignores a push without a known destination', () => {
    expect(routeForPushData({})).toBeNull();
    expect(routeForPushData(undefined)).toBeNull();
  });
});
