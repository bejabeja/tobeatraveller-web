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
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
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
    ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
    ...jest.requireActual('../../../../shared/src/utils/locationLine.js'),
    groupVanLogEntriesByMonth: vanLogStats.groupVanLogEntriesByMonth,
    getVanLogFuelPriceTrend: vanLogStats.getVanLogFuelPriceTrend,
    getVanLogSpendingByCurrency: vanLogStats.getVanLogSpendingByCurrency,
    getVanLogBreakdownByCurrency: vanLogStats.getVanLogBreakdownByCurrency,
    getTripBudgetProgress: vanLogStats.getTripBudgetProgress,
    getVanLogDateRangePresets: vanLogStats.getVanLogDateRangePresets,
    groupVanLogEntriesByTrip: vanLogStats.groupVanLogEntriesByTrip,
    vanLogCategories: constants.vanLogCategories,
    vanLogCategoryEmoji: constants.vanLogCategoryEmoji,
    isNetworkError: parseError.isNetworkError,
    isPremiumRequiredError: parseError.isPremiumRequiredError,
    getVanLogEntries: jest.fn(),
    getVanLogStats: jest.fn(),
    deleteVanLogEntry: jest.fn(),
    selectAuthUser: jest.fn(),
    selectMyItineraries: jest.fn(() => []),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVanLogEntries, getVanLogStats, selectAuthUser, selectMyItineraries } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { cacheSet } from '../../utils/offlineCache';
import { clearOutbox, loadOutbox, runOrQueue, setOfflineEditingEnabled, setOutboxOnline } from '../../offline/outbox';
import { CHANGE_KINDS, COLLECTIONS } from '../../offline/pendingChanges';
import VanLogScreen from '../../screens/vanLog/VanLogScreen';

// This test renders VanLogScreen in isolation, so it needs its own
// <SafeAreaProvider> regardless of the one now in mobile/App.js - a
// screen-level test shouldn't depend on the app root's setup. This is
// also what originally surfaced that App.js had no SafeAreaProvider at
// all (since fixed): useSafeAreaInsets() throws identically in Jest and
// in a real app, it's plain React Context with no native fallback.
const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
// The screen loads its data in effects on mount; flushing them inside act()
// lets those loads settle there instead of updating state after the test.
const renderScreen = async (ui) => {
  const result = render(<SafeAreaProvider initialMetrics={INITIAL_METRICS}>{ui}</SafeAreaProvider>);
  await act(async () => {});
  return result;
};

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

afterEach(async () => {
  await clearOutbox();
  setOutboxOnline(true);
  setOfflineEditingEnabled(false);
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear(); // the AsyncStorage jest mock persists its storage across tests otherwise
  selectAuthUser.mockReturnValue({ id: 'user-1' });
  getVanLogStats.mockResolvedValue({ totalsByCurrency: [], byCategory: [], byCountry: [], availableCurrencies: [] });
  selectMyItineraries.mockReturnValue([]);
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

it('shows an expense saved offline next to the cached ones, marked as waiting to sync', async () => {
  await cacheSet('vanlog:entries:user-1', [CACHED_ENTRY]);
  getVanLogEntries.mockRejectedValue({ isNetworkError: true });
  setOutboxOnline(false);
  setOfflineEditingEnabled(true);
  await loadOutbox('user-1');
  await runOrQueue({
    collection: COLLECTIONS.VAN_LOG,
    kind: CHANGE_KINDS.CREATE,
    entityId: 'entry-offline',
    payload: { id: 'entry-offline', category: 'water_fresh', title: 'Offline water refill', amount: 2, currency: 'EUR', entryDate: '2026-01-16' },
  });

  await renderScreen(<VanLogScreen navigation={{}} />);

  expect(await screen.findByText('Offline water refill')).toBeTruthy();
  expect(screen.getByText('Cached fuel stop')).toBeTruthy();
  expect(screen.getByText('offline.pendingSync')).toBeTruthy();
});

it('hides an expense deleted offline even though the cache still has it', async () => {
  await cacheSet('vanlog:entries:user-1', [CACHED_ENTRY, { ...CACHED_ENTRY, id: 'entry-2', title: 'Deleted offline' }]);
  getVanLogEntries.mockRejectedValue({ isNetworkError: true });
  setOutboxOnline(false);
  setOfflineEditingEnabled(true);
  await loadOutbox('user-1');
  await runOrQueue({ collection: COLLECTIONS.VAN_LOG, kind: CHANGE_KINDS.DELETE, entityId: 'entry-2' });

  await renderScreen(<VanLogScreen navigation={{}} />);

  expect(await screen.findByText('Cached fuel stop')).toBeTruthy();
  expect(screen.queryByText('Deleted offline')).toBeNull();
});

describe('grouping by trip', () => {
  const PORTUGAL = { id: 'trip-pt', title: 'Portugal' };

  it('groups an expense saved offline under its trip, whose title comes from the user\'s own trips', async () => {
    selectMyItineraries.mockReturnValue([PORTUGAL]);
    await cacheSet('vanlog:entries:user-1', [CACHED_ENTRY]);
    getVanLogEntries.mockRejectedValue({ isNetworkError: true });
    setOutboxOnline(false);
    setOfflineEditingEnabled(true);
    await loadOutbox('user-1');
    await runOrQueue({
      collection: COLLECTIONS.VAN_LOG,
      kind: CHANGE_KINDS.CREATE,
      entityId: 'entry-offline',
      payload: {
        id: 'entry-offline', category: 'water_fresh', title: 'Offline water refill', amount: 2, currency: 'EUR',
        entryDate: '2026-01-16', itineraryId: PORTUGAL.id,
      },
    });

    await renderScreen(<VanLogScreen navigation={{}} />);
    fireEvent.press(await screen.findByText('vanLog.byTrip'));

    expect(screen.getByText('Portugal')).toBeTruthy();
    expect(screen.getByText('vanLog.noTripGroup')).toBeTruthy();
  });

  it('offers no grouping choice when none of the expenses belong to a trip', async () => {
    selectMyItineraries.mockReturnValue([PORTUGAL]);
    getVanLogEntries.mockResolvedValue([CACHED_ENTRY]);

    await renderScreen(<VanLogScreen navigation={{}} />);

    expect(await screen.findByText('Cached fuel stop')).toBeTruthy();
    expect(screen.queryByText('vanLog.byTrip')).toBeNull();
  });
});

describe('filters', () => {
  it('keeps the filters collapsed until the filters button is pressed', async () => {
    getVanLogEntries.mockResolvedValue([CACHED_ENTRY]);

    await renderScreen(<VanLogScreen navigation={{}} />);

    expect(await screen.findByText('Cached fuel stop')).toBeTruthy();
    expect(screen.queryByPlaceholderText('vanLog.dateFromLabel')).toBeNull();

    fireEvent.press(screen.getByText('vanLog.filters'));

    expect(screen.getByPlaceholderText('vanLog.dateFromLabel')).toBeTruthy();
  });

  it('shows how many filters are active on the filters button', async () => {
    getVanLogEntries.mockResolvedValue([CACHED_ENTRY]);

    await renderScreen(<VanLogScreen navigation={{}} />);
    await screen.findByText('Cached fuel stop');
    fireEvent.press(screen.getByText('vanLog.filters'));
    fireEvent.press(screen.getByText('vanLog.category.fuel'));

    expect(screen.getByText('1')).toBeTruthy();
  });
});

// Regression: tapping an expense did nothing unless it had notes, and editing it was only behind the three dots.
it('opens an expense to edit when it is tapped', async () => {
  getVanLogEntries.mockResolvedValue([CACHED_ENTRY]);
  const navigation = { navigate: jest.fn() };

  await renderScreen(<VanLogScreen navigation={navigation} />);
  fireEvent.press(await screen.findByText('Cached fuel stop'));

  expect(navigation.navigate).toHaveBeenCalledWith('VanLogEntryForm', { entry: expect.objectContaining({ title: 'Cached fuel stop' }) });
});

describe('long notes', () => {
  const LONG_NOTES = 'Una nota muy larga sobre este gasto. '.repeat(20);

  // Jest has no text layout, so a measured line count is simulated.
  const reportLines = (lineCount) => {
    fireEvent(screen.getAllByText(LONG_NOTES, { includeHiddenElements: true }).at(-1), 'textLayout', { nativeEvent: { lines: Array.from({ length: lineCount }) } });
  };

  it('offers "show more" only once the notes are measured as longer than the preview, and expands them on press', async () => {
    getVanLogEntries.mockResolvedValue([{ ...CACHED_ENTRY, notes: LONG_NOTES }]);

    await renderScreen(<VanLogScreen navigation={{}} />);
    await screen.findByText('Cached fuel stop');
    expect(screen.queryByText('vanLog.notesShowMore')).toBeNull();

    await act(async () => { reportLines(6); });
    fireEvent.press(screen.getByText('vanLog.notesShowMore'));

    expect(screen.getByText('vanLog.notesShowLess')).toBeTruthy();
  });

  it('does not offer "show more" for notes that fit in the preview', async () => {
    getVanLogEntries.mockResolvedValue([{ ...CACHED_ENTRY, notes: LONG_NOTES }]);

    await renderScreen(<VanLogScreen navigation={{}} />);
    await screen.findByText('Cached fuel stop');
    await act(async () => { reportLines(2); });

    expect(screen.queryByText('vanLog.notesShowMore')).toBeNull();
  });
});

describe('stats tab', () => {
  const ENTRIES = [
    { ...CACHED_ENTRY, id: 'a', entryDate: '2026-03-01', amount: 30, currency: 'EUR' },
    { ...CACHED_ENTRY, id: 'b', entryDate: '2026-03-10', amount: 30, currency: 'EUR' },
    { ...CACHED_ENTRY, id: 'c', entryDate: '2026-03-05', amount: 200, currency: 'MAD' },
  ];

  it('replaces the entries with the statistics, one block per currency', async () => {
    getVanLogEntries.mockResolvedValue(ENTRIES);
    getVanLogStats.mockResolvedValue({
      totalsByCurrency: [{ currency: 'EUR', total: 60 }, { currency: 'MAD', total: 200 }],
      byCategory: [{ category: 'fuel', currency: 'EUR', total: 60 }, { category: 'fuel', currency: 'MAD', total: 200 }],
      byCountry: [], byTrip: [], availableCurrencies: ['EUR', 'MAD'],
    });

    await renderScreen(<VanLogScreen navigation={{}} />);
    await screen.findAllByText('Cached fuel stop');
    fireEvent.press(screen.getByText('vanLog.statsTab'));

    expect(screen.queryByText('Cached fuel stop')).toBeNull();
    expect(screen.getByText('EUR')).toBeTruthy();
    expect(screen.getByText('MAD')).toBeTruthy();
    expect(screen.getAllByText('vanLog.statsAveragePerDay')).toHaveLength(2);
  });

  it('shows the empty message when there is nothing to measure yet', async () => {
    getVanLogEntries.mockResolvedValue([]);

    await renderScreen(<VanLogScreen navigation={{}} />);
    fireEvent.press(await screen.findByText('vanLog.statsTab'));

    expect(screen.getByText('vanLog.noStatsYet')).toBeTruthy();
  });
});
