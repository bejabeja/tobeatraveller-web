import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, routeForPushData } from '../utils/pushNotifications';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Re-registers on every launch and language change: the server purges tokens
// not refreshed within 90 days and writes push text in the stored locale.
export const usePushTokenRegistration = (isAuthenticated, language) => {
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications(language);
  }, [isAuthenticated, language]);
};

export const usePushNotificationReceived = (onReceived) => {
  const onReceivedRef = useRef(onReceived);
  onReceivedRef.current = onReceived;

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = Notifications.addNotificationReceivedListener(() => onReceivedRef.current());
    return () => subscription.remove();
  }, []);
};

export const usePushNotificationNavigation = (navigationRef, isNavigationReady) => {
  useEffect(() => {
    if (Platform.OS === 'web' || !isNavigationReady) return undefined;

    const openResponse = (response) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const route = routeForPushData(response.notification.request.content.data);
      if (route) navigationRef.navigate(route.name, route.params);
    };

    // A tap that cold-started the app happened before this listener existed.
    openResponse(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();

    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
    return () => subscription.remove();
  }, [navigationRef, isNavigationReady]);
};
