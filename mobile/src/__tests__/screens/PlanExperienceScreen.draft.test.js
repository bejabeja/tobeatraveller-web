jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    i18n: { resolvedLanguage: 'en', language: 'en' },
  }),
}));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('../../utils/config', () => ({ GEOAPIFY_KEY: 'test' }));
jest.mock('../../hooks/useCurrentLocation', () => ({
  useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), getLocationIfPermitted: jest.fn(), loading: false }),
}));
jest.mock('../../components/UseCurrentLocationButton', () => ({ UseCurrentLocationButton: () => null }));
jest.mock('../../components/ExperienceStartDate', () => () => null);
jest.mock('../../components/PhotoPickerCard', () => ({ PhotoPickerCard: () => null }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/itineraryDraft.js'),
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
  ...jest.requireActual('../../../../shared/src/utils/experienceDates.js'),
  ...jest.requireActual('../../../../shared/src/utils/schemasValidation.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/constants.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/colors.js'),
  GENERATE_TIMEOUT_MESSAGE: 'AI generation timed out',
  generateSmartItinerary: jest.fn(),
  createItinerary: jest.fn(),
  isPremiumRequiredError: () => false,
  reverseGeocode: jest.fn(),
  searchDestinations: jest.fn(),
  selectAuthUser: jest.fn(),
  selectMe: jest.fn(),
  setUserInfo: jest.fn(),
  setUserInfoItineraries: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ITINERARY_DRAFT_KINDS, itineraryDraftKey, selectAuthUser, selectMe, serializeItineraryDraft } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PlanExperienceScreen from '../../screens/itinerary/PlanExperienceScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const SAVED_AT = new Date('2026-09-20T10:00:00Z');
const SAVE_PAUSE_MS = 700;
const AI_PLAN = ITINERARY_DRAFT_KINDS.AI_PLAN;
const FORM = ITINERARY_DRAFT_KINDS.FORM;
const STEP = { _key: 's1', name: 'Praia da Bordeira', description: 'Una playa', category: 'beach', dayNumber: 1, lat: 1, lon: 2, mood: null, personalNote: '' };

const storeDraft = (userId, kind, { step = 1, title = 'Ruta por Portugal', places = [STEP] } = {}) => AsyncStorage.setItem(
  itineraryDraftKey(userId, kind),
  serializeItineraryDraft({
    values: {
      title, destination: { name: 'Lisboa', label: 'Lisboa, Portugal', coordinates: { lat: 38, lon: -9 } }, destQuery: 'Lisboa',
      days: 3, startDateText: '', category: 'relax', travelers: 2, intention: 'Surf', isPublic: false, places,
    },
    step,
    pace: 'relaxed',
  }, SAVED_AT),
);
const storedDraftOf = async (userId, kind) => {
  const raw = await AsyncStorage.getItem(itineraryDraftKey(userId, kind));
  return raw ? JSON.parse(raw) : null;
};

const renderScreen = async () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <PlanExperienceScreen navigation={navigation} />
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
});

afterEach(() => jest.useRealTimers());

it('opens straight on the form when there is nothing unfinished', async () => {
  await renderScreen();

  expect(screen.getByText('createExperience.heroInput')).toBeTruthy();
  expect(screen.queryByText('createItinerary.draftTitle')).toBeNull();
});

it('offers to continue the plan the AI wrote, instead of an empty form', async () => {
  await storeDraft('user-1', AI_PLAN);
  await renderScreen();

  expect(screen.getByText('createItinerary.draftTitle')).toBeTruthy();
  expect(screen.getByText(/Ruta por Portugal/)).toBeTruthy();
  expect(screen.queryByText('createExperience.heroInput')).toBeNull();
});

it('brings the plan back on the review screen, with what the person had written', async () => {
  await storeDraft('user-1', AI_PLAN);
  await renderScreen();

  fireEvent.press(screen.getByText('createItinerary.draftContinue'));

  expect(screen.getByText('createExperience.heroReview')).toBeTruthy();
  expect(screen.getByDisplayValue('Ruta por Portugal')).toBeTruthy();
});

it('brings back what was chosen, on the first screen, when no plan had been written yet', async () => {
  await storeDraft('user-1', AI_PLAN, { step: 0, places: [] });
  await renderScreen();

  fireEvent.press(screen.getByText('createItinerary.draftContinue'));

  expect(screen.getByText('createExperience.heroInput')).toBeTruthy();
  expect(screen.getByDisplayValue('Lisboa')).toBeTruthy();
});

it('starts from nothing, and forgets the draft, when the person starts a new one', async () => {
  await storeDraft('user-1', AI_PLAN);
  await renderScreen();

  await act(async () => { fireEvent.press(screen.getByText('createItinerary.draftDiscard')); });

  expect(screen.getByText('createExperience.heroInput')).toBeTruthy();
  expect(await storedDraftOf('user-1', AI_PLAN)).toBeNull();
});

// Regression-in-waiting: each way of starting a trip keeps its own, or one would offer the other's.
it('does not offer what was left in the other form', async () => {
  await storeDraft('user-1', FORM);
  await renderScreen();

  expect(screen.queryByText('createItinerary.draftTitle')).toBeNull();
  expect(screen.getByText('createExperience.heroInput')).toBeTruthy();
});

it('does not offer the unfinished plan of another account', async () => {
  await storeDraft('user-2', AI_PLAN);
  await renderScreen();

  expect(screen.queryByText('createItinerary.draftTitle')).toBeNull();
});

it('saves the plan as it is edited, so losing the app does not lose what a generation cost', async () => {
  await storeDraft('user-1', AI_PLAN);
  await renderScreen();
  fireEvent.press(screen.getByText('createItinerary.draftContinue'));

  fireEvent.changeText(screen.getByDisplayValue('Ruta por Portugal'), 'Ruta por el Algarve');
  await act(async () => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

  const saved = await storedDraftOf('user-1', AI_PLAN);
  expect(saved.values.title).toBe('Ruta por el Algarve');
  expect(saved.values.places).toHaveLength(1);
  expect(saved.step).toBe(1);
});

it('saves nothing for a form nobody touched', async () => {
  await renderScreen();

  await act(async () => { jest.advanceTimersByTime(SAVE_PAUSE_MS); });

  expect(await storedDraftOf('user-1', AI_PLAN)).toBeNull();
});

it('keeps the unfinished plan untouched while the person decides', async () => {
  await storeDraft('user-1', AI_PLAN);
  await renderScreen();

  await act(async () => { jest.advanceTimersByTime(SAVE_PAUSE_MS * 3); });

  expect((await storedDraftOf('user-1', AI_PLAN)).values.title).toBe('Ruta por Portugal');
});
