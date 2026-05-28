import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { store, setApiUrl, setTokenStorage, initAuthUser } from '@tobeatraveller/shared';
import Navigation from './src/navigation';

const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
setApiUrl(apiUrl);

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

  useEffect(() => {
    dispatch(initAuthUser());
  }, [dispatch]);

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
