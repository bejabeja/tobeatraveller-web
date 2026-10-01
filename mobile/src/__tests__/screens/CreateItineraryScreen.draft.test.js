jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    i18n: { resolvedLanguage: 'en' },
  }),
}));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('../../utils/config', () => ({ GEOAPIFY_KEY: 'test' }));
jest.mock('../../hooks/useCurrentLocation', () => ({
  useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), getLocationIfPermitted: jest.fn(), loading: false }),
}));
jest.mock('../../components/UseCurrentLocationButton', () => ({ UseCurrentLocationButton: () => null }));
// The sections are other tests' business; the screen only needs them to exist.
jest.mock('../../screens/itinerary/ItineraryFormShared', () => {
  const none = () => null;
  return {
    BudgetSection: none, Card: ({ children }) => children, CategorySection: none, DatesSection: none,
    Field: ({ children }) => children, GallerySection: none, PlacesSection: none, TravellersSection: none,
    VisibilitySection: none, useGalleryPicker: () => jest.fn(), s: {},
  };
});
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/itineraryDraft.js'),
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
  NEW_ITINERARY_DEFAULT_VISIBILITY: false,
  createItinerary: jest.fn(),
  reverseGeocode: jest.fn(),
  searchDestinations: jest.fn(),
  selectAuthUser: jest.fn(),
  selectMe: jest.fn(),
  setUserInfo: jest.fn(),
  setUserInfoItineraries: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { itineraryDraftKey, selectAuthUser, selectMe, serializeItineraryDraft } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CreateItineraryScreen from '../../screens/itinerary/CreateItineraryScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const SAVED_AT = new Date('2026-09-20T10:00:00Z');
const SAVE_PAUSE_MS = 700;
const TITLE_PLACEHOLDER = 'createItinerary.titlePlaceholder';

const storeDraft = (userId, title = 'Ruta por Portugal') => AsyncStorage.setItem(
  itineraryDraftKey(userId),
  serializeItineraryDraft({ values: { title, destination: { name: 'Lisboa' }, places: [] }, days: [1, 2], step: 0 }, SAVED_AT),
);
const storedDraftOf = async (userId) => {
  const raw = await AsyncStorage.getItem(itineraryDraftKey(userId));
  return raw ? JSON.parse(raw) : null;
};

const renderScreen = async () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <CreateItineraryScreen navigation={navigation} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  return navigation;
};

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-01T10:00:00Z'));
  await AsyncStorage.clear();
  selectAuthUser.mockReturnValue({ id: 'user-1' });
  selectMe.mockReturnValue(null);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.useRealTimers());

it('opens straight on the form when there is nothing unfinished', async () => {
  await renderScreen();

  expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
  expect(screen.queryByText('createItinerary.draftTitle')).toBeNull();
});

it('offers to continue an unfinished trip, saying which one and when, instead of an empty form', async () => {
  await storeDraft('user-1');
  await renderScreen();

  expect(screen.getByText('createItinerary.draftTitle')).toBeTruthy();
  expect(screen.getByText(/Ruta por Portugal/)).toBeTruthy();
  expect(screen.getByText(/Sep 20, 2026/)).toBeTruthy();
  expect(screen.queryByPlaceholderText(TITLE_PLACEHOLDER)).toBeNull();
});

it('brings back what was written when the person continues', async () => {
  await storeDraft('user-1');
  await renderScreen();

  fireEvent.press(screen.getByText('createItinerary.draftContinue'));

  expect(screen.getByDisplayValue('Ruta por Portugal')).toBeTruthy();
});

it('starts from nothing, and forgets the draft, when the person starts a new one', async () => {
  await storeDraft('user-1');
  await renderScreen();

  await act(async () => { fireEvent.press(screen.getByText('createItinerary.draftDiscard')); });

  expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER).props.value).toBe('');
  expect(await storedDraftOf('user-1')).toBeNull();
});

it('does not offer the unfinished trip of another account', async () => {
  await storeDraft('user-2');
  await renderScreen();

  expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
  expect(screen.queryByText('createItinerary.draftTitle')).toBeNull();
});

it('saves what is being written after a short pause, so losing the app loses almost nothing', async () => {
  await renderScreen();

  fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Ruta por Galicia');
  expect(await storedDraftOf('user-1')).toBeNull();
  await act(async () => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

  expect((await storedDraftOf('user-1')).values.title).toBe('Ruta por Galicia');
});

it('saves nothing for a form nobody touched', async () => {
  await renderScreen();

  await act(async () => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

  expect(await storedDraftOf('user-1')).toBeNull();
});

// Regression-in-waiting: the empty form must not overwrite the trip waiting to be continued.
it('keeps the unfinished trip untouched while the person decides', async () => {
  await storeDraft('user-1');
  await renderScreen();

  await act(async () => { jest.advanceTimersByTime(SAVE_PAUSE_MS * 3); });

  expect((await storedDraftOf('user-1')).values.title).toBe('Ruta por Portugal');
});

it('forgets the draft when the person goes back and confirms discarding what they wrote', async () => {
  const navigation = await renderScreen();
  fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Ruta por Galicia');
  await act(async () => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });
  expect(await storedDraftOf('user-1')).not.toBeNull();

  fireEvent.press(screen.getByLabelText('common.back'));
  const discard = Alert.alert.mock.calls[0][2].find((button) => button.style === 'destructive');
  await act(async () => { discard.onPress(); });

  expect(await storedDraftOf('user-1')).toBeNull();
  expect(navigation.goBack).toHaveBeenCalled();
});
