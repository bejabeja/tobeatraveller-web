jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => { callback(); }, []); } };
});
jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join('/')}` : key), i18n: { language: 'es' } }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../../utils/offlineCache', () => ({
  ...jest.requireActual('../../utils/offlineCache'), cacheGet: jest.fn(), cacheSet: jest.fn() }));
let mockChanges = [];
let mockTrips = [];
let mockTravelStyle = 'van';
jest.mock('../../offline/useOutbox', () => ({ useOutbox: () => ({ changes: mockChanges }), useRefetchAfterSync: jest.fn() }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/constants/packingTemplates.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/premiumFeatures.js'),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  toAppLanguage: jest.requireActual('../../../../shared/src/utils/constants/languages.js').toAppLanguage,
  isNetworkError: jest.requireActual('../../../../shared/src/utils/parseError.js').isNetworkError,
  isPackingListCapReachedError: jest.requireActual('../../../../shared/src/utils/parseError.js').isPackingListCapReachedError,
  ANALYTICS_EVENTS: { PACKING_LIST_CREATED: 'packing_list_created' },
  getPackingLists: jest.fn(),
  createPackingList: jest.fn(),
  ...jest.requireActual('../../../../shared/src/utils/packingLists.js'),
  ...jest.requireActual('../../../../shared/src/utils/nextTrip.js'),
  selectAuthUser: () => ({ id: 'u1' }),
  selectMe: () => ({ travelStyle: mockTravelStyle }),
  TRAVEL_STYLES: { VAN: 'van', OCCASIONAL: 'occasional' },
  selectMyItineraries: () => mockTrips,
  selectMyItinerariesLoaded: () => true,
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createPackingList, getPackingLists } from '@tobeatraveller/shared';
import { cacheGet } from '../../utils/offlineCache';
import PackingListsScreen from '../../screens/packingChecklist/PackingListsScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = async (navigation = { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() }, params = {}) => {
  render(<SafeAreaProvider initialMetrics={INITIAL_METRICS}><PackingListsScreen navigation={navigation} route={{ params }} /></SafeAreaProvider>);
  await act(async () => {});
  return navigation;
};

beforeEach(() => { jest.clearAllMocks(); mockChanges = []; mockTrips = []; mockTravelStyle = 'van'; });

it('shows each list with how far along it is, and opens it', async () => {
  getPackingLists.mockResolvedValue({ lists: [{ id: 'l1', name: 'Antes de arrancar', itemCount: 12, checkedCount: 3 }], freeTierUsage: { limited: true, used: 1, limit: 2 } });
  const navigation = await renderScreen();

  expect(screen.getByText('packingChecklist.listProgress:3/12')).toBeTruthy();
  fireEvent.press(screen.getByText('Antes de arrancar'));

  expect(navigation.navigate).toHaveBeenCalledWith('PackingList', { listId: 'l1', name: 'Antes de arrancar', itinerary: undefined });
});

it('creates a list from the chosen template and opens it', async () => {
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: { limited: true, used: 0, limit: 2 } });
  createPackingList.mockResolvedValue({ id: 'new', name: 'packingChecklist.templates.winter.name' });
  const navigation = await renderScreen();

  fireEvent.press(screen.getAllByText('packingChecklist.newList')[0]);
  fireEvent.press(screen.getByText('packingChecklist.templates.winter.name'));
  await act(async () => { fireEvent.press(screen.getByText('packingChecklist.createList')); });

  const { name, items } = createPackingList.mock.calls[0][0];
  expect(name).toBe('packingChecklist.templates.winter.name');
  expect(items).toEqual(expect.arrayContaining([{ category: 'van', name: 'Cadenas para la nieve' }]));
  expect(navigation.navigate).toHaveBeenCalledWith('PackingList', { listId: 'new', name: 'packingChecklist.templates.winter.name', itinerary: undefined });
});

it('leaves the van items out of a winter list, and the before-driving-off template, for someone who travels from time to time', async () => {
  mockTravelStyle = 'occasional';
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: { limited: true, used: 0, limit: 2 } });
  createPackingList.mockResolvedValue({ id: 'new', name: 'x' });
  await renderScreen();

  fireEvent.press(screen.getAllByText('packingChecklist.newList')[0]);
  expect(screen.queryByText('packingChecklist.templates.departure.name')).toBeNull();
  fireEvent.press(screen.getByText('packingChecklist.templates.winter.name'));
  await act(async () => { fireEvent.press(screen.getByText('packingChecklist.createList')); });

  const { items } = createPackingList.mock.calls[0][0];
  expect(items.some(item => item.category === 'van')).toBe(false);
});

it('leads to Premium instead once the free lists are used up', async () => {
  getPackingLists.mockResolvedValue({ lists: [{ id: 'a', name: 'A', itemCount: 0, checkedCount: 0 }, { id: 'b', name: 'B', itemCount: 0, checkedCount: 0 }], freeTierUsage: { limited: true, used: 2, limit: 2 } });
  const navigation = await renderScreen();

  fireEvent.press(screen.getByText('tools.unlockMore'));
  fireEvent.press(screen.getByText('premium.requiredCta'));

  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});

it('shows the lists it last loaded when there is no connection', async () => {
  getPackingLists.mockRejectedValue(Object.assign(new Error('Network request failed'), { isNetworkError: true }));
  cacheGet.mockResolvedValue({ lists: [{ id: 'l1', name: 'Invierno', itemCount: 0, checkedCount: 0 }], freeTierUsage: null });
  await renderScreen();

  expect(screen.getByText('Invierno')).toBeTruthy();
  expect(screen.getByText('common.showingCachedData')).toBeTruthy();
});

// Regression: what was ticked offline didn't show in a list's progress
// until it synced.
it('counts what was ticked offline in each list\'s progress', async () => {
  getPackingLists.mockResolvedValue({ lists: [{ id: 'l1', name: 'Antes de arrancar', itemCount: 2, checkedCount: 0 }], freeTierUsage: null });
  cacheGet.mockResolvedValue([{ id: 'i1', listId: 'l1', checked: false }, { id: 'i2', listId: 'l1', checked: false }]);
  mockChanges = [{ id: 'c1', collection: 'packingChecklist', kind: 'update', entityId: 'i1', payload: { checked: true }, status: 'pending' }];

  await renderScreen();

  expect(screen.getByText('packingChecklist.listProgress:1/2')).toBeTruthy();
});

it('starts a list for the trip it was opened from, named after it, with a template for its length', async () => {
  mockTrips = [{ id: 't1', title: 'Costa Vicentina', startDate: '2099-10-02', endDate: '2099-10-09', tripTotalDays: 8 }];
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: { limited: true, used: 0, limit: 2 } });
  createPackingList.mockResolvedValue({ id: 'new', name: 'Costa Vicentina', itinerary: { id: 't1', title: 'Costa Vicentina' } });
  await renderScreen(undefined, { forTripId: 't1' });

  await act(async () => { fireEvent.press(screen.getByText('packingChecklist.createList')); });

  const { name, itineraryId, items } = createPackingList.mock.calls[0][0];
  expect({ name, itineraryId }).toEqual({ name: 'Costa Vicentina', itineraryId: 't1' });
  expect(items.length).toBeGreaterThan(40); // the long-trip template
});

// Regression: opened for a trip, the form showed before the free plan's
// count was in, so it only led to Premium after filling it in.
it('leads to Premium straight away when opened for a trip with the free lists used up', async () => {
  mockTrips = [{ id: 't1', title: 'Costa Vicentina', startDate: '2099-10-02', endDate: '2099-10-09', tripTotalDays: 8 }];
  getPackingLists.mockResolvedValue({ lists: [], freeTierUsage: { limited: true, used: 2, limit: 2 } });

  await renderScreen(undefined, { forTripId: 't1' });

  expect(screen.getByText('premium.requiredCta')).toBeTruthy();
  expect(screen.queryByText('packingChecklist.createList')).toBeNull();
});

it('says on each card which trip it is for', async () => {
  getPackingLists.mockResolvedValue({ lists: [{ id: 'l1', name: 'Equipaje', itemCount: 0, checkedCount: 0, itinerary: { id: 't1', title: 'Costa Vicentina' } }], freeTierUsage: null });
  await renderScreen();

  expect(screen.getByText('packingChecklist.forTrip:Costa Vicentina')).toBeTruthy();
});

