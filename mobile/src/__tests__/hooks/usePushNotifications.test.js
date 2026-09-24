let capturedResponseListener;
const mockRemoveSubscription = jest.fn();

jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn((listener) => {
    capturedResponseListener = listener;
    return { remove: mockRemoveSubscription };
  }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@tobeatraveller/shared', () => ({
  registerPushToken: jest.fn(),
  unregisterPushToken: jest.fn(),
}));

import * as Notifications from 'expo-notifications';
import { act, renderHook } from '@testing-library/react-native';
import { usePushNotificationNavigation } from '../../hooks/usePushNotifications';

const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

const responseFor = (data, actionIdentifier = DEFAULT_ACTION) => ({
  actionIdentifier,
  notification: { request: { content: { data } } },
});

let navigationRef;

beforeEach(() => {
  jest.clearAllMocks();
  capturedResponseListener = undefined;
  navigationRef = { navigate: jest.fn() };
  Notifications.getLastNotificationResponse.mockReturnValue(null);
});

describe('usePushNotificationNavigation', () => {
  it('waits for the navigation container before handling any tap', async () => {
    Notifications.getLastNotificationResponse.mockReturnValue(responseFor({ type: 'follow', actorId: 'u2' }));

    await renderHook(() => usePushNotificationNavigation(navigationRef, false));

    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('opens the screen of the push that cold-started the app, only once', async () => {
    Notifications.getLastNotificationResponse.mockReturnValue(responseFor({ type: 'follow', actorId: 'u2' }));

    await renderHook(() => usePushNotificationNavigation(navigationRef, true));

    expect(navigationRef.navigate).toHaveBeenCalledWith('UserProfile', { id: 'u2' });
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it('opens the screen of a push tapped while the app is running', async () => {
    await renderHook(() => usePushNotificationNavigation(navigationRef, true));

    await act(async () => capturedResponseListener(responseFor({ type: 'like', itineraryId: 'i1', commentId: null })));

    expect(navigationRef.navigate).toHaveBeenCalledWith('Itinerary', { id: 'i1', commentId: undefined });
  });

  it('ignores responses that are not a tap on the notification itself', async () => {
    await renderHook(() => usePushNotificationNavigation(navigationRef, true));

    await act(async () => capturedResponseListener(responseFor({ type: 'follow', actorId: 'u2' }, 'dismiss')));

    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('stops listening on unmount', async () => {
    const { unmount } = await renderHook(() => usePushNotificationNavigation(navigationRef, true));

    await act(async () => unmount());

    expect(mockRemoveSubscription).toHaveBeenCalled();
  });
});
