import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import {
  store, setApiUrl, setTokenStorage, initAuthUser,
  selectIsAuthenticated, selectAuthUser,
  setUserInfo, setUserInfoItineraries,
} from '@tobeatraveller/shared';
import { useSelector } from 'react-redux';
import Navigation from './src/navigation';
import { API_URL } from './src/utils/config';

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

  // Bootstrap auth state on launch
  useEffect(() => {
    dispatch(initAuthUser());
  }, [dispatch]);

  // After login, fetch full profile (includes followers/following/totalItineraries)
  useEffect(() => {
    if (isAuthenticated && authUser?.id) {
      dispatch(setUserInfo(authUser.id));
      dispatch(setUserInfoItineraries(authUser.id));
    }
  }, [isAuthenticated, authUser?.id, dispatch]);

  return (
    <>
      <StatusBar style="auto" />
      <Navigation />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
