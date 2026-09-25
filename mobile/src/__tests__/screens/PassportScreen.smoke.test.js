jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (callback) => { useEffect(() => callback(), []); },
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

jest.mock('@tobeatraveller/shared', () => {
  const badges = jest.requireActual('../../../../shared/src/utils/constants/badges.js');
  const countries = jest.requireActual('../../../../shared/src/utils/constants/countries.js');
  return {
    ...badges,
    ...countries,
    getUserPassport: jest.fn(),
    selectAuthUser: jest.fn(),
  };
});

import { getUserPassport, selectAuthUser } from '@tobeatraveller/shared';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PassportScreen from '../../screens/passport/PassportScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderScreen = async () => {
  const result = render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <PassportScreen navigation={{ goBack: jest.fn() }} route={{ params: { userId: 'user-1' } }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  selectAuthUser.mockReturnValue({ id: 'user-1' });
});

it('shows earned and locked stamps with progress, and a stamp per visited country', async () => {
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane', avatarUrl: null },
    achievements: [
      { id: 'explorer', family: 'trips', threshold: 1, isPrivate: false, earnedAt: '2026-09-01T10:00:00Z', current: 3 },
      { id: 'adventurer', family: 'trips', threshold: 5, isPrivate: false, earnedAt: null, current: 3 },
    ],
    countries: [{ code: 'ES', firstVisitedOn: '2026-03-01', isPrivate: false }],
  });

  await renderScreen();

  expect(screen.getByText('passport.ownTitle')).toBeTruthy();
  expect(screen.getByText('badges.explorer.name')).toBeTruthy();
  expect(screen.getByText('badges.adventurer.goal')).toBeTruthy();
  expect(screen.getByText('3 / 5')).toBeTruthy();
  expect(screen.getByText('ESPAÑA')).toBeTruthy();
});

it('says there are no public countries yet when viewing someone else', async () => {
  selectAuthUser.mockReturnValue({ id: 'someone-else' });
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane', avatarUrl: null },
    achievements: [],
    countries: [],
  });

  await renderScreen();

  expect(screen.getByText('passport.emptyCountriesOther')).toBeTruthy();
});

it('shows an error instead of crashing when the passport fails to load', async () => {
  getUserPassport.mockRejectedValue(new Error('offline'));

  await renderScreen();

  expect(screen.getByText('passport.loadError')).toBeTruthy();
});
