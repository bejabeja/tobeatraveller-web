jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    // The real useFocusEffect runs its callback as an effect (after
    // render/commit) on focus, not synchronously during render. A naive
    // `(callback) => callback()` mock calls it mid-render, which triggers
    // this screen's setState-in-fetchEntries during that same render pass
    // and spirals into "too many re-renders".
    useFocusEffect: (callback) => { useEffect(() => { callback(); }, []); },
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Importing the real named pieces from their own source files (rather than
// `jest.requireActual('@tobeatraveller/shared')`, the barrel index) avoids
// pulling in the shared Redux store setup, which drags in `immer`'s ESM
// build and breaks Jest's default transformIgnorePatterns.
jest.mock('@tobeatraveller/shared', () => {
  const vanLogStats = jest.requireActual('../../../../shared/src/utils/vanLogStats.js');
  const constants = jest.requireActual('../../../../shared/src/utils/constants/constants.js');
  const parseError = jest.requireActual('../../../../shared/src/utils/parseError.js');
  return {
    groupVanLogEntriesByMonth: vanLogStats.groupVanLogEntriesByMonth,
    getVanLogFuelPriceTrend: vanLogStats.getVanLogFuelPriceTrend,
    vanLogCategories: constants.vanLogCategories,
    vanLogCategoryEmoji: constants.vanLogCategoryEmoji,
    isNetworkError: parseError.isNetworkError,
    isPremiumRequiredError: parseError.isPremiumRequiredError,
    getVanLogEntries: jest.fn(),
    getVanLogStats: jest.fn(),
    deleteVanLogEntry: jest.fn(),
    selectMe: jest.fn(),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVanLogEntries, getVanLogStats, selectMe } from '@tobeatraveller/shared';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { cacheSet } from '../../utils/offlineCache';
import VanLogScreen from '../../screens/vanLog/VanLogScreen';

// This test renders VanLogScreen in isolation, so it needs its own
// <SafeAreaProvider> regardless of the one now in mobile/App.js - a
// screen-level test shouldn't depend on the app root's setup. This is
// also what originally surfaced that App.js had no SafeAreaProvider at
// all (since fixed): useSafeAreaInsets() throws identically in Jest and
// in a real app, it's plain React Context with no native fallback.
const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = (ui) => render(
  <SafeAreaProvider initialMetrics={INITIAL_METRICS}>{ui}</SafeAreaProvider>
);

const CACHED_ENTRY = {
  id: 'entry-1',
  category: 'fuel',
  title: 'Cached fuel stop',
  amount: 45.5,
  currency: 'EUR',
  entryDate: '2026-01-15',
  location: null,
  notes: null,
  pricePerLiter: null,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear(); // the AsyncStorage jest mock persists its storage across tests otherwise
  selectMe.mockReturnValue({ id: 'user-1' });
  getVanLogStats.mockResolvedValue({ totalsByCurrency: [], byCategory: [], byCountry: [], availableCurrencies: [] });
});

// Regression coverage for the offline-caching flow added this session
// (VanLogScreen.js fetchEntries): a network failure with a cached entry
// available must render that cached entry plus the "showing cached data"
// notice, not the generic error state.
it('shows the cached entries and a "showing cached data" notice when the fetch fails offline', async () => {
  await cacheSet('vanlog:entries:user-1', [CACHED_ENTRY]);
  getVanLogEntries.mockRejectedValue({ isNetworkError: true });

  await renderScreen(<VanLogScreen navigation={{}} />);

  expect(await screen.findByText('Cached fuel stop')).toBeTruthy();
  expect(screen.getByText('common.showingCachedData')).toBeTruthy();
});

it('does not show the cached-data notice when the fetch succeeds', async () => {
  await cacheSet('vanlog:entries:user-1', [CACHED_ENTRY]);
  getVanLogEntries.mockResolvedValue([{ ...CACHED_ENTRY, id: 'entry-2', title: 'Fresh fuel stop' }]);

  await renderScreen(<VanLogScreen navigation={{}} />);

  expect(await screen.findByText('Fresh fuel stop')).toBeTruthy();
  expect(screen.queryByText('common.showingCachedData')).toBeNull();
});

it('shows the generic error state (not a crash) when offline with no cache available', async () => {
  getVanLogEntries.mockRejectedValue({ isNetworkError: true });

  await renderScreen(<VanLogScreen navigation={{}} />);

  expect(await screen.findByText('premium.loadErrorDesc')).toBeTruthy();
});
