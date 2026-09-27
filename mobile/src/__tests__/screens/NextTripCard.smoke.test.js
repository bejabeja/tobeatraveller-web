let mockTrips = [];
jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join('/')}` : key) }),
}));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/nextTrip.js'),
  selectMyItineraries: () => mockTrips,
  selectMyItinerariesLoaded: () => true,
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
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
