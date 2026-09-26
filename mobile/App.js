import './src/i18n';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import {
  store, setApiUrl, setTokenStorage, initAuthUser,
  selectIsAuthenticated, selectAuthUser, selectMe, ADMIN_ROLES,
  setUserInfo, setUserInfoItineraries, refreshUnreadCount,
} from '@tobeatraveller/shared';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Navigation from './src/navigation';
import { OfflineBanner } from './src/components/OfflineBanner';
import { API_URL } from './src/utils/config';
import { usePushNotificationReceived, usePushTokenRegistration } from './src/hooks/usePushNotifications';
import { useSyncUserLanguage } from './src/hooks/useSyncUserLanguage';
import { useOutboxSync } from './src/offline/useOutbox';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { useAnalyticsConsent } from './src/hooks/useAnalyticsConsent';
import { identifyUser } from './src/utils/analytics';

setApiUrl(API_URL);

setTokenStorage(
  Platform.OS === 'web'
    ? {
        getItem: (key) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
        removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      }
);

function AppContent() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authUser = useSelector(selectAuthUser);
  const me = useSelector(selectMe);
  const { i18n } = useTranslation();

  usePushTokenRegistration(isAuthenticated, i18n.language);
  useSyncUserLanguage(isAuthenticated ? authUser?.id : null, i18n.resolvedLanguage);
  const sessionUser = me ?? authUser;
  useOutboxSync(
    isAuthenticated ? authUser?.id : null,
    Boolean(sessionUser?.isPremium || ADMIN_ROLES.includes(sessionUser?.role))
  );
  usePushNotificationReceived(() => {
    if (isAuthenticated) dispatch(refreshUnreadCount());
  });

  // Bootstrap auth state on launch
  useEffect(() => {
    dispatch(initAuthUser());
  }, [dispatch]);

  // Only does something once the person agreed to analytics, so it runs
  // again when they do.
  const { consent: analyticsConsent } = useAnalyticsConsent();
  useEffect(() => {
    if (isAuthenticated && authUser?.id) identifyUser(authUser);
  }, [isAuthenticated, authUser?.id, analyticsConsent]);

  // After login, fetch full profile (includes followers/following/totalItineraries)
  useEffect(() => {
    if (isAuthenticated && authUser?.id) {
      dispatch(setUserInfo(authUser.id));
      dispatch(setUserInfoItineraries());
    }
  }, [isAuthenticated, authUser?.id, dispatch]);

  // Opened offline, the session comes from cache but the full profile can't
  // load; fetch it once the connection is back instead of waiting for a relaunch.
  const { isConnected } = useNetworkStatus();
  useEffect(() => {
    if (isConnected && isAuthenticated && authUser?.id && !me) {
      dispatch(setUserInfo(authUser.id));
      dispatch(setUserInfoItineraries());
    }
  }, [isConnected]);

  // Poll unread notification count every 30s and on app foreground
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(refreshUnreadCount());
    const interval = setInterval(() => dispatch(refreshUnreadCount()), 30_000);
    const sub = AppState.addEventListener('change', next => {
      if (appState.current !== 'active' && next === 'active') {
        dispatch(refreshUnreadCount());
      }
      appState.current = next;
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [dispatch, isAuthenticated]);

  return (
    <>
      <StatusBar style="auto" />
      <OfflineBanner />
      <Navigation />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </SafeAreaProvider>
  );
}
