jest.mock('react-redux', () => ({ useDispatch: () => jest.fn(), useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
// The sections are other tests' business; the van answer is the one thing needed here.
jest.mock('../../screens/itinerary/ItineraryFormShared', () => {
  const none = () => null;
  return {
    ByVanSection: ({ value, onChange }) => {
      const { Switch } = require('react-native');
      return <Switch testID="by-van" value={value} onValueChange={onChange} />;
    },
    BudgetSection: none, Card: ({ children }) => children, CategorySection: none, DatesSection: none,
    Field: ({ children }) => children, GallerySection: none, PlacesSection: none, TravellersSection: none,
    VisibilitySection: none, useGalleryPicker: () => jest.fn(), s: {},
  };
});
jest.mock('@tobeatraveller/shared', () => ({
  EXISTING_ITINERARY_VISIBILITY_FALLBACK: true,
  getItineraryById: jest.fn(),
  updateItinerary: jest.fn(),
  selectAuthUser: () => ({ id: 'user-1' }),
  selectMe: () => ({ id: 'user-1' }),
  setUserInfo: jest.fn(),
  setUserInfoItineraries: jest.fn(),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getItineraryById, updateItinerary } from '@tobeatraveller/shared';
import EditItineraryScreen from '../../screens/itinerary/EditItineraryScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const TRIP = {
  id: 't1', userId: 'user-1', title: 'Algarve', description: '', photoUrl: null, isPublic: false,
  location: { name: 'Faro', label: 'Faro, Portugal', lat: 37, lon: -8 },
  startDate: '2026-10-02T00:00:00.000Z', endDate: '2026-10-04T00:00:00.000Z',
  budget: 500, currency: 'EUR', numberOfPeople: 2, category: 'adventure', places: [], images: [],
};

const renderScreen = async (trip) => {
  getItineraryById.mockResolvedValue(trip);
  updateItinerary.mockResolvedValue({});
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <EditItineraryScreen route={{ params: { id: 't1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

const savedBody = () => JSON.parse(updateItinerary.mock.calls[0][1].get('itinerary'));
const save = async () => { await act(async () => { fireEvent.press(screen.getByText('common.save')); }); };

beforeEach(() => jest.clearAllMocks());

describe('editing a trip: by van', () => {
  it('shows the trip as it was saved: by van', async () => {
    await renderScreen({ ...TRIP, byVan: true });

    expect(screen.getByTestId('by-van').props.value).toBe(true);
  });

  it('shows a trip saved before the van answer existed as not by van', async () => {
    await renderScreen(TRIP);

    expect(screen.getByTestId('by-van').props.value).toBe(false);
  });

  // Regression-in-waiting: leaving it out of the body would turn a trip into not-by-van on every save.
  it('sends the answer it was loaded with when the trip is saved without touching it', async () => {
    await renderScreen({ ...TRIP, byVan: true });

    await save();

    expect(savedBody().byVan).toBe(true);
  });

  it('sends the new answer when it is changed', async () => {
    await renderScreen({ ...TRIP, byVan: true });

    fireEvent(screen.getByTestId('by-van'), 'valueChange', false);
    await save();

    expect(savedBody().byVan).toBe(false);
  });
});
