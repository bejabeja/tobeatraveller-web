jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (callback) => { useEffect(() => callback(), [callback]); } };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key),
    i18n: { resolvedLanguage: 'en' },
  }),
}));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/vanToday.js'),
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  getVanLogStats: jest.fn(),
  getShoppingList: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { currentMonthRange, getShoppingList, getVanLogStats } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import VanToday from '../../components/VanToday';
import { cacheSet, vanTodayCacheKey } from '../../utils/offlineCache';

const THIS_MONTH = currentMonthRange().dateFrom;
const LAST_YEAR = '2000-01-01';

const renderToday = async () => {
  const navigation = { navigate: jest.fn() };
  render(<VanToday navigation={navigation} userId="user-1" />);
  await act(async () => {});
  return navigation;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getVanLogStats.mockResolvedValue({ totalsByCurrency: [{ currency: 'EUR', total: 412.3 }] });
  getShoppingList.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
});

describe('what is shown', () => {
  it('shows what has been spent this month and what is left to buy', async () => {
    await renderToday();

    expect(screen.getByText('€412.30')).toBeTruthy();
    expect(screen.getByText('vanToday.shoppingCount:3')).toBeTruthy();
  });

  it('asks only for this month', async () => {
    await renderToday();

    expect(getVanLogStats).toHaveBeenCalledWith(currentMonthRange());
  });

  it('says nothing was spent, and nothing is left to buy, when that is the case', async () => {
    getVanLogStats.mockResolvedValue({ totalsByCurrency: [] });
    getShoppingList.mockResolvedValue([]);
    await renderToday();

    expect(screen.getByText('vanToday.monthNothing')).toBeTruthy();
    expect(screen.getByText('vanToday.shoppingNothing')).toBeTruthy();
  });

  it('shows a placeholder while it loads for the first time, not a zero', async () => {
    getVanLogStats.mockReturnValue(new Promise(() => {}));
    getShoppingList.mockReturnValue(new Promise(() => {}));
    await renderToday();

    expect(screen.getAllByText('…')).toHaveLength(2);
    expect(screen.queryByText('vanToday.shoppingNothing')).toBeNull();
  });
});

describe('without signal', () => {
  beforeEach(() => {
    getVanLogStats.mockRejectedValue(new Error('Network request failed'));
    getShoppingList.mockRejectedValue(new Error('Network request failed'));
  });

  it('says it is not available, not zero, when it has never been loaded', async () => {
    await renderToday();

    expect(screen.getAllByText('vanToday.unavailable')).toHaveLength(2);
    expect(screen.queryByText('vanToday.monthNothing')).toBeNull();
  });

  it('shows what was last known, instead of nothing', async () => {
    await cacheSet(vanTodayCacheKey('user-1'), { month: THIS_MONTH, monthTotals: [{ currency: 'EUR', total: 98.5 }], shoppingCount: 2 });
    await renderToday();

    expect(screen.getByText('€98.50')).toBeTruthy();
    expect(screen.getByText('vanToday.shoppingCount:2')).toBeTruthy();
  });

  // Regression-in-waiting: last month's total shown as "this month" would be a plain lie.
  it('does not show a total from another month as this month', async () => {
    await cacheSet(vanTodayCacheKey('user-1'), { month: LAST_YEAR, monthTotals: [{ currency: 'EUR', total: 98.5 }], shoppingCount: 2 });
    await renderToday();

    expect(screen.queryByText('€98.50')).toBeNull();
    expect(screen.getByText('vanToday.unavailable')).toBeTruthy();
    expect(screen.getByText('vanToday.shoppingCount:2')).toBeTruthy();
  });

  it('shows what was last known while it asks again', async () => {
    getVanLogStats.mockReturnValue(new Promise(() => {}));
    getShoppingList.mockReturnValue(new Promise(() => {}));
    await cacheSet(vanTodayCacheKey('user-1'), { month: THIS_MONTH, monthTotals: [{ currency: 'EUR', total: 98.5 }], shoppingCount: 2 });
    await renderToday();

    expect(screen.getByText('€98.50')).toBeTruthy();
  });
});

describe('what it remembers', () => {
  it('keeps what it loaded, to show it the next time there is no signal', async () => {
    await renderToday();

    const stored = JSON.parse(await AsyncStorage.getItem(`offline-cache:${vanTodayCacheKey('user-1')}`));
    expect(stored).toEqual({ month: THIS_MONTH, monthTotals: [{ currency: 'EUR', total: 412.3 }], shoppingCount: 3 });
  });

  it('keeps the part that failed from the last time, and updates the one that worked', async () => {
    await cacheSet(vanTodayCacheKey('user-1'), { month: THIS_MONTH, monthTotals: [{ currency: 'EUR', total: 98.5 }], shoppingCount: 2 });
    getVanLogStats.mockRejectedValue(new Error('Network request failed'));
    await renderToday();

    expect(screen.getByText('€98.50')).toBeTruthy();
    expect(screen.getByText('vanToday.shoppingCount:3')).toBeTruthy();
  });

  it('remembers nothing when nothing could be loaded', async () => {
    getVanLogStats.mockRejectedValue(new Error('Network request failed'));
    getShoppingList.mockRejectedValue(new Error('Network request failed'));
    await renderToday();

    expect(await AsyncStorage.getItem(`offline-cache:${vanTodayCacheKey('user-1')}`)).toBeNull();
  });
});

describe('where it takes you', () => {
  it('goes straight to adding an expense', async () => {
    const navigation = await renderToday();

    fireEvent.press(screen.getByText('vanToday.addExpense'));

    expect(navigation.navigate).toHaveBeenCalledWith('VanLogEntryForm');
  });

  it('takes each card to its tool', async () => {
    const navigation = await renderToday();

    fireEvent.press(screen.getByText('vanToday.monthTitle'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('VanLog');
    fireEvent.press(screen.getByText('vanToday.shoppingTitle'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('Supplies');
  });

  it('puts the four tools within reach', async () => {
    const navigation = await renderToday();

    ['nav.vanLog', 'nav.supplies', 'nav.packingChecklist', 'nav.lifeDiary'].forEach((label) => fireEvent.press(screen.getByText(label)));

    expect(navigation.navigate.mock.calls.map(([screen_]) => screen_)).toEqual(['VanLog', 'Supplies', 'PackingChecklist', 'LifeDiary']);
  });
});
