jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => callback(), [callback]); } };
});
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key) }) }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/unfinishedDraft.js'),
  ...jest.requireActual('../../../../shared/src/utils/itineraryDraft.js'),
  summarizePassport: jest.requireActual('../../../../shared/src/utils/constants/badges.js').summarizePassport,
}));
jest.mock('../../hooks/useUserPassport', () => ({ useUserPassport: jest.fn() }));
jest.mock('../../utils/itineraryDraftStorage', () => ({ readItineraryDraft: jest.fn() }));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useUserPassport } from '../../hooks/useUserPassport';
import { readItineraryDraft } from '../../utils/itineraryDraftStorage';
import YourTravel from '../../components/YourTravel';

const PASSPORT = { countries: [{ code: 'PT' }, { code: 'ES' }], achievements: [{ id: 'a', earnedAt: '2026-09-01' }, { id: 'b', earnedAt: null }] };
const draftOf = (savedAt, values) => ({ savedAt: new Date(savedAt), values });

const renderCard = async (navigation = { navigate: jest.fn() }) => {
  const result = render(<YourTravel navigation={navigation} userId="u1" />);
  await act(async () => {});
  return { navigation, ...result };
};

beforeEach(() => {
  jest.clearAllMocks();
  useUserPassport.mockReturnValue({ passport: PASSPORT });
  readItineraryDraft.mockResolvedValue(null);
});

it('shows where the passport stands and opens it', async () => {
  const { navigation } = await renderCard();

  expect(screen.getByText('passport.countriesCount:2')).toBeTruthy();
  fireEvent.press(screen.getByText('passport.countriesCount:2'));
  expect(navigation.navigate).toHaveBeenCalledWith('Passport', { userId: 'u1' });
  expect(screen.queryByText('home.draftLabel')).toBeNull();
});

// Regression-in-waiting: a trip left half done was only found by opening the form again, by chance.
it('offers to pick up a trip left unfinished, by its title', async () => {
  readItineraryDraft.mockImplementation(async (_, kind) => (kind === 'itinerary' ? draftOf('2026-10-01', { title: 'Algarve' }) : null));
  const { navigation } = await renderCard();

  fireEvent.press(screen.getByText('Algarve'));

  expect(navigation.navigate).toHaveBeenCalledWith('CreateItinerary');
});

it('sends an AI plan left unfinished back to the AI plan, not to the form', async () => {
  readItineraryDraft.mockImplementation(async (_, kind) => (kind === 'experience' ? draftOf('2026-10-01', { destination: { name: 'Lisboa' } }) : null));
  const { navigation } = await renderCard();

  fireEvent.press(screen.getByText('Lisboa'));

  expect(navigation.navigate).toHaveBeenCalledWith('PlanExperience');
});

it('shows nothing while there is neither a draft nor a passport', async () => {
  useUserPassport.mockReturnValue({ passport: null });

  await renderCard();

  expect(screen.queryByText('home.draftLabel')).toBeNull();
  expect(screen.queryByText('passport.title')).toBeNull();
});
