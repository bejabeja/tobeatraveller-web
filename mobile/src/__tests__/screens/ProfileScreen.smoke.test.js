const mockDispatch = jest.fn();
let mockUnsyncedChanges = [];

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (callback) => { useEffect(() => callback(), []); },
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
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
  useOutbox: () => ({ changes: mockUnsyncedChanges }),
}));

jest.mock('@tobeatraveller/shared', () => {
  const badges = jest.requireActual('../../../../shared/src/utils/constants/badges.js');
  const countries = jest.requireActual('../../../../shared/src/utils/constants/countries.js');
  const recap = jest.requireActual('../../../../shared/src/utils/recap.js');
  const { filterItineraries } = jest.requireActual('../../../../shared/src/utils/filterItineraries.js');
  const { COLORS } = jest.requireActual('../../../../shared/src/utils/constants/colors.js');
  return {
    ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
    ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
    COLORS,
    ...badges,
    ...countries,
    ...recap,
    filterItineraries,
    ...jest.requireActual('../../../../shared/src/utils/profileLinks.js'),
    ...jest.requireActual('../../../../shared/src/utils/constants/premiumFeatures.js'),
    getMyReferralInfo: jest.fn(),
    checkIsLiked: jest.fn(),
    toggleLike: jest.fn(),
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
    getItinerariesByUserId: jest.fn().mockResolvedValue([]),
    getUserById: jest.fn(),
    getUserFavorites: jest.fn().mockResolvedValue([]),
    getUserPassport: jest.fn(),
    logoutUser: jest.fn(() => 'logout-thunk'),
    getBlockStatus: jest.fn().mockResolvedValue({ blocked: false }),
    blockUser: jest.fn().mockResolvedValue(null),
    unblockUser: jest.fn().mockResolvedValue(null),
    setUserInfo: jest.fn(),
    selectAuthUser: jest.fn(),
    selectIsAuthenticated: jest.fn(),
    selectMe: jest.fn(),
    selectMyItineraries: jest.fn(),
    selectMyItinerariesLoaded: jest.fn(),
  };
});

import {
  blockUser, checkIsLiked, getBlockStatus, getMyReferralInfo, getUserById, getUserPassport, unblockUser, selectAuthUser, selectIsAuthenticated, selectMe, selectMyItineraries, selectMyItinerariesLoaded,
} from '@tobeatraveller/shared';
import { Alert, Share } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clearDeviceSessionData } from '../../utils/session';
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
  selectMyItinerariesLoaded.mockReturnValue(true);
  mockUnsyncedChanges = [];
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
  expect(screen.getByText('profile.tripsStat')).toBeTruthy();
  expect(screen.getByText('passport.title')).toBeTruthy();
  expect(screen.getByText(/badges\.nextTip\.trips/)).toBeTruthy();
});

// Without the link there is nothing to open or preview on the other side.
// Regression: it linked /profile/<id>, a page only for signed-in users,
// without the invite code.
it('shares your profile by name, with your invite code', async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });
  getMyReferralInfo.mockResolvedValue({ referralCode: 'jane' });
  const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ProfileScreen route={{ params: {} }} navigation={{ navigate: jest.fn(), canGoBack: () => false }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByLabelText('profile.shareProfile')); });

  expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({
    message: 'profile.shareText:jane https://tobeatraveller.test/@jane?ref=jane',
    url: 'https://tobeatraveller.test/@jane?ref=jane',
  }));
});

// Regression: the counter followed the visibility filter of the trips below,
// and showed a 0 before the trips had loaded.
it("counts all of the owner's trips, and shows a dash until they've loaded", async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane', avatarUrl: null }, achievements: [], countries: [], declaredCountries: [] });
  const trip = (id, isPublic) => ({
    id, isPublic, title: `Trip ${id}`, location: { name: 'Lisbon' }, tripTotalDays: 3, category: 'relax',
    photoUrl: null, images: [], likesCount: 0, commentsCount: 0, user: { id: 'user-1', username: 'jane' },
  });
  selectMyItineraries.mockReturnValue([trip('t1', true), trip('t2', false), trip('t3', false)]);
  checkIsLiked.mockResolvedValue({ isLiked: false, likesCount: 0 });
  const { rerender } = render(<SafeAreaProvider initialMetrics={INITIAL_METRICS}><ProfileScreen navigation={{ navigate: jest.fn(), canGoBack: () => false, addListener: () => jest.fn() }} route={{ params: {} }} /></SafeAreaProvider>);

  expect(await screen.findByText('3')).toBeTruthy();

  selectMyItinerariesLoaded.mockReturnValue(false);
  rerender(<SafeAreaProvider initialMetrics={INITIAL_METRICS}><ProfileScreen navigation={{ navigate: jest.fn(), canGoBack: () => false, addListener: () => jest.fn() }} route={{ params: {} }} /></SafeAreaProvider>);

  expect(screen.getByText('–')).toBeTruthy();
});

const renderOwnProfile = async ({ routeName = 'Profile', canGoBack = true, me = ME } = {}) => {
  selectMe.mockReturnValue(me);
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ProfileScreen route={{ name: routeName, params: {} }} navigation={{ navigate: jest.fn(), canGoBack: () => canGoBack, goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

// Regression: as a tab it showed a back arrow that jumped to another tab.
it('has no back arrow as the profile tab', async () => {
  await renderOwnProfile();

  expect(screen.queryByLabelText('common.back')).toBeNull();
});

it('has a back arrow when opened over another screen', async () => {
  await renderOwnProfile({ routeName: 'UserProfile' });

  expect(screen.getByLabelText('common.back')).toBeTruthy();
});

// Regression: Expenses, the shopping list and the diary were marked Premium,
// when the free plan has them up to a limit; now the packing lists too.
it('marks no tool as Premium, all of them being free up to a limit', async () => {
  await renderOwnProfile({ me: { ...ME, isPremium: false } });

  expect(screen.queryByText('admin.premium')).toBeNull();
  expect(screen.getByText('🎒 packingChecklist.title')).toBeTruthy();
});

describe('signing out', () => {
  // Regression: it always asked "Log out?", although with nothing unsent there is nothing to lose.
  it('signs out at once when there is nothing waiting to be sent', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderOwnProfile();

    await act(async () => { fireEvent.press(screen.getByText('profile.signOut')); });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(clearDeviceSessionData).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith('logout-thunk');
  });

  it('warns how many changes would be lost, and signs out only if it is confirmed', async () => {
    mockUnsyncedChanges = [{ id: 'c1' }, { id: 'c2' }];
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderOwnProfile();

    await act(async () => { fireEvent.press(screen.getByText('profile.signOut')); });

    expect(alertSpy).toHaveBeenCalledWith('auth.confirmLogoutTitle', 'offline.logoutLosesChanges', expect.any(Array));
    expect(mockDispatch).not.toHaveBeenCalledWith('logout-thunk');

    const [, , buttons] = alertSpy.mock.calls[0];
    await act(async () => { await buttons.find((button) => button.style === 'destructive').onPress(); });

    expect(mockDispatch).toHaveBeenCalledWith('logout-thunk');
  });
});

describe('blocking someone from their profile', () => {
  const ANA = { id: 'user-2', username: 'ana', name: 'Ana', followers: 0, following: 0, totalItineraries: 0, createdAt: '2026-05-01T00:00:00Z' };

  const renderOtherProfile = async () => {
    getUserById.mockResolvedValue(ANA);
    getUserPassport.mockResolvedValue({ owner: { id: 'user-2', username: 'ana' }, achievements: [], countries: [] });
    render(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <ProfileScreen route={{ name: 'UserProfile', params: { id: 'user-2' } }} navigation={{ navigate: jest.fn(), canGoBack: () => true, goBack: jest.fn() }} />
      </SafeAreaProvider>
    );
    await act(async () => {});
  };

  it('asks before blocking, and blocks only when it is confirmed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderOtherProfile();

    await act(async () => { fireEvent.press(screen.getByLabelText('block.button')); });

    expect(alertSpy).toHaveBeenCalledWith('block.confirmTitle:ana', 'block.confirmDesc', expect.any(Array));
    expect(blockUser).not.toHaveBeenCalled();

    const [, , buttons] = alertSpy.mock.calls[0];
    await act(async () => { await buttons.find((button) => button.style === 'destructive').onPress(); });

    expect(blockUser).toHaveBeenCalledWith('user-2');
    expect(screen.getByText('block.unblockButton')).toBeTruthy();
  });

  it('unblocks at once, without asking, someone who is already blocked', async () => {
    getBlockStatus.mockResolvedValue({ blocked: true });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderOtherProfile();

    await act(async () => { fireEvent.press(screen.getByText('block.unblockButton')); });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(unblockUser).toHaveBeenCalledWith('user-2');
  });

  it('offers to unblock instead of follow for someone who is blocked', async () => {
    getBlockStatus.mockResolvedValue({ blocked: true });
    await renderOtherProfile();

    expect(screen.queryByText('profile.follow')).toBeNull();
    expect(screen.getByText('block.unblockButton')).toBeTruthy();
  });

  it('offers no block button on your own profile', async () => {
    await renderOwnProfile();

    expect(screen.queryByLabelText('block.button')).toBeNull();
  });
});
