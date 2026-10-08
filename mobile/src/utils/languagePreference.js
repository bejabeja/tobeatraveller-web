import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_APP_LANGUAGES } from '@tobeatraveller/shared';

const LANGUAGE_KEY = 'app_language';

// The language they picked in Settings, kept on the phone so the app opens in it
// again. A storage that fails must never break the app: the phone's language is used.
export const readLanguagePreference = async () => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return SUPPORTED_APP_LANGUAGES.includes(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const saveLanguagePreference = async (language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Nothing to do: it is used until the app closes.
  }
};
