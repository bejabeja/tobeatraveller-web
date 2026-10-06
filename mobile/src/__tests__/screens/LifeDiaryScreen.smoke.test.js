jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => { callback(); }, []); } };
});
jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../utils/offlineCache', () => ({ cacheGet: jest.fn(), cacheSet: jest.fn() }));
jest.mock('../../offline/outbox', () => ({ runOrQueue: jest.fn() }));
jest.mock('../../offline/useOutbox', () => ({ useOutbox: () => ({ changes: [] }), useRefetchAfterSync: jest.fn() }));
jest.mock('../../components/PendingChangesNotice', () => ({ PendingChangesNotice: () => null }));
jest.mock('../../components/PendingSyncBadge', () => ({ PendingSyncBadge: () => null }));
jest.mock('../../components/FeatureLoadState', () => () => null);
jest.mock('@tobeatraveller/shared', () => ({
  getLifeDiaryEntries: jest.fn(),
  LIFE_DIARY_PAGE_SIZE: 30,
  isNetworkError: (error) => error?.isNetwork === true,
  isPremiumRequiredError: () => false,
  selectAuthUser: () => ({ id: 'u1' }),
  formatCalendarDay: (day) => day,
}));

import { Alert, FlatList } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getLifeDiaryEntries } from '@tobeatraveller/shared';
import { cacheGet, cacheSet } from '../../utils/offlineCache';
import LifeDiaryScreen from '../../screens/lifeDiary/LifeDiaryScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const entry = (id, entryDate) => ({ id, entryDate, location: { name: 'Sagres' }, bestMoment: `moment ${id}`, images: [], wouldReturn: null });

const renderScreen = async () => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <LifeDiaryScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

const scrollToEnd = async () => {
  await act(async () => { screen.UNSAFE_getByType(FlatList).props.onEndReached(); });
};

beforeEach(() => {
  jest.clearAllMocks();
  cacheGet.mockResolvedValue(null);
});

it('loads the first page and, at the end of the list, the next ones from where it ends, without repeating any', async () => {
  getLifeDiaryEntries
    .mockResolvedValueOnce({ entries: [entry('l1', '2026-09-21')], totalCount: 2 })
    .mockResolvedValueOnce({ entries: [entry('l1', '2026-09-21'), entry('l2', '2026-09-01')], totalCount: 2 });
  await renderScreen();

  await scrollToEnd();

  expect(getLifeDiaryEntries).toHaveBeenLastCalledWith({ limit: 30, offset: 1 });
  expect(screen.getByText('"moment l2"')).toBeTruthy();
  expect(screen.getAllByText('"moment l1"')).toHaveLength(1);
});

it('keeps on the device what it has loaded, so it is there without signal', async () => {
  getLifeDiaryEntries
    .mockResolvedValueOnce({ entries: [entry('l1', '2026-09-21')], totalCount: 2 })
    .mockResolvedValueOnce({ entries: [entry('l2', '2026-09-01')], totalCount: 2 });
  await renderScreen();

  await scrollToEnd();

  expect(cacheSet).toHaveBeenLastCalledWith('lifediary:entries:u1', [entry('l1', '2026-09-21'), entry('l2', '2026-09-01')]);
});

it('asks for nothing more when everything is already loaded', async () => {
  getLifeDiaryEntries.mockResolvedValueOnce({ entries: [entry('l1', '2026-09-21')], totalCount: 1 });
  await renderScreen();

  await scrollToEnd();

  expect(getLifeDiaryEntries).toHaveBeenCalledTimes(1);
});

it('says it could not load more and keeps what it has', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getLifeDiaryEntries
    .mockResolvedValueOnce({ entries: [entry('l1', '2026-09-21')], totalCount: 2 })
    .mockRejectedValueOnce(new Error('boom'));
  await renderScreen();

  await scrollToEnd();

  expect(alert).toHaveBeenCalledWith('errors.somethingWrong', 'lifeDiary.loadMoreError');
  expect(screen.getByText('"moment l1"')).toBeTruthy();
});

it('shows what is on the device, and does not ask for more, when there is no connection', async () => {
  getLifeDiaryEntries.mockRejectedValueOnce(Object.assign(new Error('offline'), { isNetwork: true }));
  cacheGet.mockResolvedValue([entry('l1', '2026-09-21')]);
  await renderScreen();

  await scrollToEnd();

  expect(screen.getByText('"moment l1"')).toBeTruthy();
  expect(screen.getByText('common.showingCachedData')).toBeTruthy();
  expect(getLifeDiaryEntries).toHaveBeenCalledTimes(1);
});
