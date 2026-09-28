jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => { callback(); }, []); } };
});
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join('/')}` : key) }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/packingLists.js'),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  isNetworkError: jest.requireActual('../../../../shared/src/utils/parseError.js').isNetworkError,
  getPackingLists: jest.fn(),
  selectAuthUser: () => ({ id: 'u1' }),
}));
let mockChanges = [];
jest.mock('../../offline/useOutbox', () => ({ useOutbox: () => ({ changes: mockChanges }) }));
jest.mock('../../utils/offlineCache', () => ({
  ...jest.requireActual('../../utils/offlineCache'), cacheGet: jest.fn(), cacheSet: jest.fn() }));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getPackingLists } from '@tobeatraveller/shared';
import { cacheGet } from '../../utils/offlineCache';
import TripListsSection from '../../components/TripListsSection';

it("lists the trip's packing lists and offers a new one for it", async () => {
  getPackingLists.mockResolvedValue({ lists: [
    { id: 'l1', name: 'Equipaje', itemCount: 12, checkedCount: 4, itinerary: { id: 't1', title: 'Algarve' } },
    { id: 'l2', name: 'Otra', itemCount: 0, checkedCount: 0, itinerary: { id: 't9', title: 'Otro' } },
  ] });
  const navigation = { navigate: jest.fn() };
  render(<TripListsSection itineraryId="t1" navigation={navigation} />);
  await act(async () => {});

  expect(screen.getByText('Equipaje')).toBeTruthy();
  expect(screen.queryByText('Otra')).toBeNull();
  fireEvent.press(screen.getByText('packingChecklist.newListForTrip'));

  expect(navigation.navigate).toHaveBeenCalledWith('PackingChecklist', { forTripId: 't1' });
});

const TRIP_LIST = { id: 'l1', name: 'Equipaje', itemCount: 2, checkedCount: 0, itinerary: { id: 't1', title: 'Algarve' } };

// Regression: the trip page showed only the server's counts, so what was
// ticked offline didn't show there while the lists screen did count it.
it('counts what was ticked offline in the progress of the trip\'s lists', async () => {
  getPackingLists.mockResolvedValue({ lists: [TRIP_LIST] });
  cacheGet.mockResolvedValue([
    { id: 'i1', listId: 'l1', checked: false },
    { id: 'i2', listId: 'l1', checked: false },
  ]);
  mockChanges = [{ id: 'c1', collection: 'packingChecklist', kind: 'update', entityId: 'i1', payload: { checked: true } }];
  render(<TripListsSection itineraryId="t1" navigation={{ navigate: jest.fn() }} />);
  await act(async () => {});

  expect(screen.getByText('packingChecklist.listProgress:1/2')).toBeTruthy();
  mockChanges = [];
});

// Regression: offline the trip page showed no lists at all, only the button
// to start one, which invited a second list for the same trip.
it('shows the lists last loaded when there is no connection', async () => {
  getPackingLists.mockRejectedValue(new TypeError('Network request failed'));
  cacheGet.mockResolvedValue({ lists: [TRIP_LIST] });
  render(<TripListsSection itineraryId="t1" navigation={{ navigate: jest.fn() }} />);
  await act(async () => {});

  expect(screen.getByText('Equipaje')).toBeTruthy();
});
