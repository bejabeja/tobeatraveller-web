jest.mock('react-redux', () => ({ useDispatch: () => jest.fn(), useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key), i18n: { resolvedLanguage: 'en', language: 'en' } }),
}));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('../../utils/config', () => ({ GEOAPIFY_KEY: 'test' }));
jest.mock('../../hooks/useCurrentLocation', () => ({
  useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), getLocationIfPermitted: jest.fn(), loading: false }),
}));
jest.mock('../../components/UseCurrentLocationButton', () => ({ UseCurrentLocationButton: () => null }));
jest.mock('../../components/ExperienceStartDate', () => () => null);
jest.mock('../../components/PhotoPickerCard', () => ({ PhotoPickerCard: () => null }));
// The sections are other tests' business; the van answer is the one thing needed here.
jest.mock('../../screens/itinerary/ItineraryFormShared', () => ({
  ByVanSection: ({ value, onChange }) => {
    const { Switch } = require('react-native');
    return <Switch testID="by-van" value={value} onValueChange={onChange} />;
  },
}));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/experienceDates.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/constants.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/colors.js'),
  EXISTING_ITINERARY_VISIBILITY_FALLBACK: true,
  GENERATE_TIMEOUT_MESSAGE: 'AI generation timed out',
  generateSmartItinerary: jest.fn(),
  getItineraryById: jest.fn(),
  updateItinerary: jest.fn(),
  isPremiumRequiredError: () => false,
  reverseGeocode: jest.fn(),
  searchDestinations: jest.fn(),
  selectAuthUser: () => ({ id: 'user-1' }),
  selectMe: () => ({ id: 'user-1', isPremium: true }),
  setUserInfo: jest.fn(),
  setUserInfoItineraries: jest.fn(),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getItineraryById, updateItinerary } from '@tobeatraveller/shared';
import EditExperienceScreen from '../../screens/itinerary/EditExperienceScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const TRIP = {
  id: 't1', userId: 'user-1', title: 'Ruta por Portugal', photoUrl: null, tripTotalDays: 3, startDate: null,
  category: 'relax', numberOfPeople: 2, isPublic: false,
  location: { name: 'Lisboa', label: 'Lisboa, Portugal', lat: 38, lon: -9 },
  places: [{ id: 'p1', name: 'Praia da Bordeira', description: 'Una playa', category: 'beach', dayNumber: 1, orderIndex: 0, latitude: 1, longitude: 2 }],
};

const renderScreen = async (trip) => {
  getItineraryById.mockResolvedValue(trip);
  updateItinerary.mockResolvedValue({});
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <EditExperienceScreen route={{ params: { id: 't1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

const savedBody = () => JSON.parse(updateItinerary.mock.calls[0][1].get('itinerary'));
const save = async () => { await act(async () => { fireEvent.press(screen.getAllByText('createExperience.saveExperience').at(-1)); }); };

beforeEach(() => jest.clearAllMocks());

describe('editing an AI trip: by van', () => {
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
