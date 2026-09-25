jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (callback) => { useEffect(() => callback(), []); },
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.username ? `${key}:${vars.username}` : key), i18n: { language: 'es' } }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => children,
}));

// Pulls in expo-notifications (via the push token cleanup), irrelevant here.
jest.mock('../../utils/session', () => ({
  clearDeviceSessionData: jest.fn(),
}));

jest.mock('../../utils/config', () => ({ WEB_URL: 'https://tobeatraveller.test' }));

jest.mock('../../offline/useOutbox', () => ({
  useOutbox: () => ({ changes: [] }),
}));

jest.mock('@tobeatraveller/shared', () => {
  const badges = jest.requireActual('../../../../shared/src/utils/constants/badges.js');
  const countries = jest.requireActual('../../../../shared/src/utils/constants/countries.js');
  const recap = jest.requireActual('../../../../shared/src/utils/recap.js');
  const { filterItineraries } = jest.requireActual('../../../../shared/src/utils/filterItineraries.js');
  const { COLORS } = jest.requireActual('../../../../shared/src/utils/constants/colors.js');
  return {
    COLORS,
    ...badges,
    ...countries,
    ...recap,
    filterItineraries,
    checkIsLiked: jest.fn(),
    toggleLike: jest.fn(),
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
    getItinerariesByUserId: jest.fn().mockResolvedValue([]),
    getUserById: jest.fn(),
    getUserFavorites: jest.fn().mockResolvedValue([]),
    getUserPassport: jest.fn(),
    logoutUser: jest.fn(),
    setUserInfo: jest.fn(),
    selectAuthUser: jest.fn(),
    selectIsAuthenticated: jest.fn(),
    selectMe: jest.fn(),
    selectMyItineraries: jest.fn(),
  };
});

import {
  getUserPassport, selectAuthUser, selectIsAuthenticated, selectMe, selectMyItineraries,
} from '@tobeatraveller/shared';
import { Share } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileScreen from '../../screens/profile/ProfileScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ME = {
  id: 'user-1', username: 'jane', name: 'Jane', bio: 'Van life', location: 'Barcelona',
  followers: 1, following: 4, totalItineraries: 2, createdAt: '2026-05-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  selectIsAuthenticated.mockReturnValue(true);
  selectMe.mockReturnValue(ME);
  selectAuthUser.mockReturnValue(ME);
  selectMyItineraries.mockReturnValue([]);
});

// Guards the header markup (moved around more than once), which no other
// test renders.
it('renders the own profile header with counters and the passport card', async () => {
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane', avatarUrl: null },
    achievements: [
      { id: 'explorer', family: 'trips', threshold: 1, isPrivate: false, earnedAt: '2026-09-01T10:00:00Z', current: 2 },
      { id: 'adventurer', family: 'trips', threshold: 5, isPrivate: false, earnedAt: null, current: 2 },
    ],
    countries: [{ code: 'FI', firstVisitedOn: '2026-06-02', isPrivate: false }],
  });

  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ProfileScreen route={{ params: {} }} navigation={{ navigate: jest.fn(), canGoBack: () => false }} />
    </SafeAreaProvider>
  );
  await act(async () => {});

  expect(screen.getByText('Jane')).toBeTruthy();
  expect(screen.getByText('profile.trips')).toBeTruthy();
  expect(screen.getByText('passport.title')).toBeTruthy();
  expect(screen.getByText(/badges\.nextTip\.trips/)).toBeTruthy();
});

// Without the link there is nothing to open or preview on the other side.
it('shares the profile with a link to it', async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });
  const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ProfileScreen route={{ params: {} }} navigation={{ navigate: jest.fn(), canGoBack: () => false }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByLabelText('profile.shareProfile')); });

  expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({
    message: 'profile.shareText:jane https://tobeatraveller.test/profile/user-1',
    url: 'https://tobeatraveller.test/profile/user-1',
  }));
});
