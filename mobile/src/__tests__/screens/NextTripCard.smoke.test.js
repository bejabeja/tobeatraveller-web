let mockTrips = [];
let mockRefocus;
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (callback) => { mockRefocus = callback; useEffect(() => callback(), [callback]); } };
});
jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join('/')}` : key) }),
}));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/nextTrip.js'),
  ...jest.requireActual('../../../../shared/src/utils/packingLists.js'),
  getPackingLists: jest.fn(() => Promise.resolve({ lists: [] })),
  selectMyItineraries: () => mockTrips,
  selectMyItinerariesLoaded: () => true,
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getPackingLists } from '@tobeatraveller/shared';
import NextTripCard from '../../components/NextTripCard';

beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 8, 27, 10) }));
afterEach(() => jest.useRealTimers());

it('shows the trip under way and opens it', () => {
  mockTrips = [{ id: 't1', title: 'Fiordos', location: { name: 'Noruega' }, startDate: '2026-09-25', endDate: '2026-10-01' }];
  const navigation = { navigate: jest.fn() };
  render(<NextTripCard navigation={navigation} />);

  expect(screen.getByText('home.onTripDay:3/7 · Noruega')).toBeTruthy();
  fireEvent.press(screen.getByText('Fiordos'));

  expect(navigation.navigate).toHaveBeenCalledWith('Itinerary', { id: 't1' });
});

it('counts down to the next trip', () => {
  mockTrips = [{ id: 't2', title: 'Lisboa', startDate: '2026-10-02', endDate: '2026-10-05' }];
  render(<NextTripCard navigation={{ navigate: jest.fn() }} />);

  expect(screen.getByText('home.nextTripLabel')).toBeTruthy();
  expect(screen.getByText('home.nextTripIn:5')).toBeTruthy();
});

it('invites to plan one when there is no trip ahead', () => {
  mockTrips = [];
  const navigation = { navigate: jest.fn() };
  render(<NextTripCard navigation={navigation} />);

  fireEvent.press(screen.getByText('home.planTrip'));

  expect(screen.getByText('home.noNextTrip')).toBeTruthy();
  expect(navigation.navigate).toHaveBeenCalledWith('CreateItinerary');
});

it('offers to get packing for the next trip when it has no list', async () => {
  mockTrips = [{ id: 't2', title: 'Lisboa', startDate: '2026-10-02', endDate: '2026-10-05' }];
  const navigation = { navigate: jest.fn() };
  render(<NextTripCard navigation={navigation} />);
  await act(async () => {});

  fireEvent.press(screen.getByText('🎒 home.prepareTrip'));

  expect(navigation.navigate).toHaveBeenCalledWith('PackingChecklist', { forTripId: 't2' });
});

it('shows how far along the next trip\'s list is, and opens it', async () => {
  mockTrips = [{ id: 't2', title: 'Lisboa', startDate: '2026-10-02', endDate: '2026-10-05' }];
  getPackingLists.mockResolvedValue({ lists: [{ id: 'l1', name: 'Equipaje', itemCount: 12, checkedCount: 4, itinerary: { id: 't2', title: 'Lisboa' } }] });
  const navigation = { navigate: jest.fn() };
  render(<NextTripCard navigation={navigation} />);
  await act(async () => {});

  fireEvent.press(screen.getByText('🎒 home.tripListProgress:Equipaje/4/12'));

  expect(navigation.navigate).toHaveBeenCalledWith('PackingList', { listId: 'l1', name: 'Equipaje', itinerary: { id: 't2', title: 'Lisboa' } });
});


// Regression: Home stays mounted, so after making the list and coming back
// the card still offered to start one, and a second list got made.
it('picks up the list made for the trip when Home comes back into view', async () => {
  mockTrips = [{ id: 't2', title: 'Lisboa', startDate: '2026-10-02', endDate: '2026-10-05' }];
  getPackingLists.mockResolvedValue({ lists: [] });
  render(<NextTripCard navigation={{ navigate: jest.fn() }} />);
  await act(async () => {});
  getPackingLists.mockResolvedValue({ lists: [{ id: 'l1', name: 'Equipaje', itemCount: 12, checkedCount: 0, itinerary: { id: 't2', title: 'Lisboa' } }] });

  await act(async () => { mockRefocus(); });

  expect(screen.getByText('🎒 home.tripListProgress:Equipaje/0/12')).toBeTruthy();
  expect(screen.queryByText('🎒 home.prepareTrip')).toBeNull();
});

it("doesn't offer to start a list when the lists couldn't be loaded", async () => {
  mockTrips = [{ id: 't2', title: 'Lisboa', startDate: '2026-10-02', endDate: '2026-10-05' }];
  getPackingLists.mockRejectedValue(new Error('offline'));
  render(<NextTripCard navigation={{ navigate: jest.fn() }} />);
  await act(async () => {});

  expect(screen.queryByText('🎒 home.prepareTrip')).toBeNull();
});
