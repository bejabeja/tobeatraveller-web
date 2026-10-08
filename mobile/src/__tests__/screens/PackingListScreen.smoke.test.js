jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => { callback(); }, []); } };
});
jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars && typeof vars === 'object' ? `${key}:${Object.values(vars).join('/')}` : key), i18n: { language: 'es' } }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../utils/offlineCache', () => ({
  ...jest.requireActual('../../utils/offlineCache'), cacheGet: jest.fn(), cacheSet: jest.fn() }));
jest.mock('../../components/PendingChangesNotice', () => ({ PendingChangesNotice: () => null }));
let mockChanges = [];
let mockTrips = [];
let mockTravelStyle = 'van';
jest.mock('../../offline/useOutbox', () => ({ useOutbox: () => ({ changes: mockChanges }), useRefetchAfterSync: jest.fn() }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../../offline/outbox', () => ({ newEntityId: () => 'new-id', runOrQueue: jest.fn() }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/constants/premiumFeatures.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/packingTemplates.js'),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  packingCategories: jest.requireActual('../../../../shared/src/utils/constants/constants.js').packingCategories,
  normalizeSearchText: jest.requireActual('../../../../shared/src/utils/normalizeSearchText.js').normalizeSearchText,
  isNetworkError: jest.requireActual('../../../../shared/src/utils/parseError.js').isNetworkError,
  isPackingListCapReachedError: jest.requireActual('../../../../shared/src/utils/parseError.js').isPackingListCapReachedError,
  ...jest.requireActual('../../../../shared/src/utils/packingLists.js'),
  ANALYTICS_EVENTS: { PACKING_LIST_LINKED_TO_TRIP: 'packing_list_linked_to_trip' },
  getPackingListItems: jest.fn(),
  getShoppingList: jest.fn(() => Promise.resolve([])),
  updatePackingList: jest.fn(),
  duplicatePackingList: jest.fn(),
  deletePackingList: jest.fn(),
  ...jest.requireActual('../../../../shared/src/utils/nextTrip.js'),
  selectAuthUser: () => ({ id: 'u1' }),
  selectMe: () => ({ travelStyle: mockTravelStyle }),
  TRAVEL_STYLES: { VAN: 'van', OCCASIONAL: 'occasional' },
  selectMyItineraries: () => mockTrips,
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { duplicatePackingList, getPackingListItems, getShoppingList, updatePackingList } from '@tobeatraveller/shared';
import { runOrQueue } from '../../offline/outbox';
import PackingListScreen from '../../screens/packingChecklist/PackingListScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let nextPosition = 0;
const item = (id, name, category, checked = false, listId = 'l1', extra = {}) => ({ id, name, category, checked, listId, position: ++nextPosition, ...extra });

const renderScreen = async (items, navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() }) => {
  getPackingListItems.mockResolvedValue(items);
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <PackingListScreen navigation={navigation} route={{ params: { listId: 'l1', name: 'Antes de arrancar' } }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  return navigation;
};

beforeEach(() => { jest.clearAllMocks(); mockChanges = []; mockTrips = []; mockTravelStyle = 'van'; });

it('shows only the categories that have something', async () => {
  await renderScreen([item('i1', 'Gas cerrado', 'van', true), item('i2', 'Toldo recogido', 'van')]);

  expect(screen.getByText('Antes de arrancar')).toBeTruthy();
  expect(screen.getAllByText('packingChecklist.category.van')).toHaveLength(2); // the chip and the heading
  expect(screen.getAllByText('packingChecklist.category.clothing')).toHaveLength(1); // only the chip
});

it('adds to the chosen category, with the list it belongs to', async () => {
  runOrQueue.mockResolvedValue({ queued: false, result: item('new-id', 'Botas', 'clothing') });
  await renderScreen([]);

  fireEvent.changeText(screen.getByLabelText('packingChecklist.addItemPlaceholder'), 'Botas');
  fireEvent.press(screen.getByText('packingChecklist.category.clothing'));
  await act(async () => { fireEvent.press(screen.getByLabelText('packingChecklist.add')); });

  expect(runOrQueue).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'create', payload: { id: 'new-id', listId: 'l1', category: 'clothing', name: 'Botas' },
  }));
});

it('starts the list again, queued for this list, once something is ticked', async () => {
  runOrQueue.mockResolvedValue({ queued: true });
  await renderScreen([item('i1', 'Gas cerrado', 'van', true)]);

  await act(async () => { fireEvent.press(screen.getByText('packingChecklist.restart')); });

  expect(runOrQueue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'restartList', entityId: 'l1' }));
});

it('leaves out things of other lists, such as ones still waiting to sync', async () => {
  await renderScreen([item('i1', 'Gas cerrado', 'van'), item('i9', 'Tabla de surf', 'other', false, 'l2')]);

  expect(screen.queryByText('Tabla de surf')).toBeNull();
});

it('offers Premium when copying goes over the free lists', async () => {
  duplicatePackingList.mockRejectedValue(Object.assign(new Error('limit'), { status: 403, field: 'packingListCap' }));
  const navigation = await renderScreen([]);

  fireEvent.press(screen.getByLabelText('common.moreOptions'));
  await act(async () => { fireEvent.press(screen.getByText('packingChecklist.duplicate')); });
  fireEvent.press(screen.getByText('premium.requiredCta'));

  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});

// Regression: a list deleted elsewhere offered to "try again", which never could work.
it('says the list no longer exists and leads back to all lists', async () => {
  getPackingListItems.mockRejectedValue(Object.assign(new Error('Packing list not found'), { status: 404 }));
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <PackingListScreen navigation={navigation} route={{ params: { listId: 'gone', name: 'Surf' } }} />
    </SafeAreaProvider>
  );
  await act(async () => {});

  fireEvent.press(screen.getByText('packingChecklist.allLists'));

  expect(screen.getByText('packingChecklist.listNotFound')).toBeTruthy();
  expect(navigation.goBack).toHaveBeenCalled();
});

it('edits something: name, category and how many, queued like any other change', async () => {
  runOrQueue.mockResolvedValue({ queued: true });
  await renderScreen([item('i1', 'Calcetines', 'clothing')]);

  fireEvent.press(screen.getByLabelText('packingChecklist.editItem'));
  fireEvent.changeText(screen.getByLabelText('packingChecklist.itemName'), 'Calcetines de lana');
  fireEvent.press(screen.getByLabelText('packingChecklist.quantityMore'));
  fireEvent.press(screen.getByLabelText('packingChecklist.quantityMore'));
  await act(async () => { fireEvent.press(screen.getByText('common.save')); });

  expect(runOrQueue).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'update', entityId: 'i1', payload: { name: 'Calcetines de lana', category: 'clothing', quantity: 3 },
  }));
});

it('shows how many to take next to the name', async () => {
  await renderScreen([item('i1', 'Calcetines', 'clothing', false, 'l1', { quantity: 5 })]);

  expect(screen.getByText('packingChecklist.quantityBadge:5')).toBeTruthy();
});

it('moves something up within its category while reordering', async () => {
  runOrQueue.mockResolvedValue({ queued: true });
  const listItems = [item('i1', 'Gas cerrado', 'van'), item('i2', 'Toldo recogido', 'van')];
  await renderScreen(listItems);

  fireEvent.press(screen.getByText('packingChecklist.reorder'));
  await act(async () => { fireEvent.press(screen.getByLabelText('packingChecklist.moveUp:Toldo recogido')); });

  expect(runOrQueue).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'i2', payload: { position: listItems[0].position } }));
  expect(runOrQueue).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'i1', payload: { position: listItems[1].position } }));
});

// Regression: tapping the cart twice added the same thing again, raising its
// amount on the shopping list.
it('marks what is already on the shopping list instead of adding it again', async () => {
  getShoppingList.mockResolvedValue([{ id: 's1', name: 'Toldo recogido' }]);
  runOrQueue.mockResolvedValue({ queued: false, result: { id: 's2', name: 'Calzos' } });
  await renderScreen([item('i1', 'Toldo recogido', 'van'), item('i2', 'Calzos', 'van')]);

  expect(screen.getByLabelText('packingChecklist.onShoppingList')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByLabelText('packingChecklist.addToShoppingList')); });

  expect(screen.getAllByLabelText('packingChecklist.onShoppingList')).toHaveLength(2);
  expect(screen.queryByLabelText('packingChecklist.addToShoppingList')).toBeNull();
});

it('counts what is waiting to sync to the shopping list', async () => {
  mockChanges = [{
    id: 'c1', collection: 'shoppingList', kind: 'create', entityId: 's9', status: 'pending',
    payload: { id: 's9', name: 'Calzos', category: 'other', amount: 1, unit: 'units' },
  }];
  await renderScreen([item('i1', 'Calzos', 'van')]);

  expect(screen.getByLabelText('packingChecklist.onShoppingList')).toBeTruthy();
});

it('uses the last shopping list loaded when there is no connection', async () => {
  getShoppingList.mockRejectedValue(Object.assign(new Error('Network request failed'), { isNetworkError: true }));
  require('../../utils/offlineCache').cacheGet.mockImplementation(async (key) => (key.startsWith('supplies:') ? { shoppingList: [{ id: 's1', name: 'Calzos' }] } : null));
  await renderScreen([item('i1', 'Calzos', 'van')]);

  expect(screen.getByLabelText('packingChecklist.onShoppingList')).toBeTruthy();
});

it('links the list to one of the user\'s trips and says so, with a way to it', async () => {
  mockTrips = [{ id: 't1', title: 'Costa Vicentina', startDate: '2099-10-02', endDate: '2099-10-04' }];
  updatePackingList.mockResolvedValue({ id: 'l1', name: 'Antes de arrancar', itinerary: { id: 't1', title: 'Costa Vicentina' } });
  const navigation = await renderScreen([]);

  fireEvent.press(screen.getByLabelText('common.moreOptions'));
  fireEvent.press(screen.getByText('packingChecklist.linkToTrip'));
  fireEvent.press(screen.getByText('Costa Vicentina'));
  await act(async () => { fireEvent.press(screen.getByText('common.save')); });

  expect(updatePackingList).toHaveBeenCalledWith('l1', { itineraryId: 't1' });
  expect(require('../../utils/analytics').trackEvent).toHaveBeenCalledWith('packing_list_linked_to_trip');
  fireEvent.press(screen.getByText('packingChecklist.forTrip:Costa Vicentina'));
  expect(navigation.navigate).toHaveBeenCalledWith('Itinerary', { id: 't1' });
});

