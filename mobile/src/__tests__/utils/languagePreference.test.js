jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/constants/languages.js'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readLanguagePreference, saveLanguagePreference } from '../../utils/languagePreference';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

// Regression: a language chosen in Settings was forgotten the next time the app opened, which started in the phone's language again.
it('gives back the language the person chose', async () => {
  await saveLanguagePreference('es');

  expect(await readLanguagePreference()).toBe('es');
});

it('has nothing when they never chose one, so the phone language is used', async () => {
  expect(await readLanguagePreference()).toBeNull();
});

it('ignores a stored language the app does not have', async () => {
  await AsyncStorage.setItem('app_language', 'xx');

  expect(await readLanguagePreference()).toBeNull();
});

it('never breaks the app when the storage fails', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('disk'));
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disk'));

  expect(await readLanguagePreference()).toBeNull();
  await expect(saveLanguagePreference('es')).resolves.toBeUndefined();
});
