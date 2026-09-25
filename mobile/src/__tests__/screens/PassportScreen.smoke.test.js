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
  const recap = jest.requireActual('../../../../shared/src/utils/recap.js');
  return {
    ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
    ...badges,
    ...countries,
    ...recap,
    getUserPassport: jest.fn(),
    getMyPassportLeaderboard: jest.fn(),
    selectAuthUser: jest.fn(),
  };
});

jest.mock('../../components/MomentShareModal', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ visible, moment }) => (
    visible ? <Text>moment-modal {moment.kind}:{moment.code} private:{String(moment.isPrivate)}</Text> : null
  );
});

jest.mock('../../components/PassportShareModal', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ visible, initialIncludeAchievements }) => (
    visible ? <Text>share-modal achievements:{String(initialIncludeAchievements)}</Text> : null
  );
});

jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));

import { getMyPassportLeaderboard, getUserPassport, selectAuthUser } from '@tobeatraveller/shared';
import { trackEvent } from '../../utils/analytics';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PassportScreen from '../../screens/passport/PassportScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderScreen = async (params = {}, navigation = { goBack: jest.fn(), setParams: jest.fn(), push: jest.fn(), navigate: jest.fn() }) => {
  const result = render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <PassportScreen navigation={navigation} route={{ params: { userId: 'user-1', ...params } }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  selectAuthUser.mockReturnValue({ id: 'user-1' });
  getMyPassportLeaderboard.mockResolvedValue({ entries: [], followsAnyone: false });
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

// A new user's passport shows them how to get their first stamp.
describe('before the first stamp', () => {
  const UNSTARTED = {
    owner: { id: 'user-1', username: 'jane', avatarUrl: null },
    achievements: [{ id: 'explorer', family: 'trips', threshold: 1, isPrivate: false, earnedAt: null, current: 0 }],
    countries: [],
  };

  it('takes the owner to publish a trip, log an expense or write in the diary, recording the step', async () => {
    getUserPassport.mockResolvedValue(UNSTARTED);
    const navigation = { goBack: jest.fn(), setParams: jest.fn(), push: jest.fn(), navigate: jest.fn() };
    await renderScreen({}, navigation);

    expect(screen.getByText('passport.startTitle')).toBeTruthy();
    fireEvent.press(screen.getByText('passport.startTrip'));
    fireEvent.press(screen.getByText('nav.vanLog'));
    fireEvent.press(screen.getByText('nav.lifeDiary'));

    expect(navigation.navigate.mock.calls.map(([name]) => name)).toEqual(['CreateItinerary', 'VanLog', 'LifeDiary']);
    expect(trackEvent).toHaveBeenCalledWith('passport_start_step_clicked', { step: 'trip' });
  });

  it('is gone once they have a stamp, and never shown on someone else', async () => {
    getUserPassport.mockResolvedValue({ ...UNSTARTED, countries: [{ code: 'ES', firstVisitedOn: '2026-03-01', isPrivate: false }] });
    await renderScreen();
    expect(screen.queryByText('passport.startTitle')).toBeNull();

    screen.unmount();
    selectAuthUser.mockReturnValue({ id: 'someone-else' });
    getUserPassport.mockResolvedValue(UNSTARTED);
    await renderScreen();
    expect(screen.queryByText('passport.startTitle')).toBeNull();
  });
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

it('opens the share sheet right away, with the achievements, when coming from a badge notification', async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });
  const navigation = { goBack: jest.fn(), setParams: jest.fn() };

  await renderScreen({ share: 'achievements' }, navigation);

  expect(screen.getByText('share-modal achievements:true')).toBeTruthy();
  expect(navigation.setParams).toHaveBeenCalledWith({ share: undefined });
});

it("does not open the share sheet for someone else's passport", async () => {
  selectAuthUser.mockReturnValue({ id: 'someone-else' });
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });

  await renderScreen({ share: 'countries' });

  expect(screen.queryByText(/share-modal/)).toBeNull();
});

it('shows the countries someone declared apart from the earned ones', async () => {
  selectAuthUser.mockReturnValue({ id: 'someone-else' });
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane' },
    achievements: [],
    countries: [{ code: 'ES', firstVisitedOn: '2026-03-01', isPrivate: false }],
    declaredCountries: [{ code: 'JP', declaredAt: '2026-09-01' }],
  });

  await renderScreen();

  expect(screen.getByText('passport.declaredTitleOther')).toBeTruthy();
  expect(screen.getByLabelText('Japón, passport.declaredStampLabel')).toBeTruthy();
  expect(screen.queryByText('passport.declaredEdit')).toBeNull();
});

it('invites the owner to mark the countries they have been to', async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [], declaredCountries: [] });

  await renderScreen();

  expect(screen.getByText('passport.declaredAdd')).toBeTruthy();
  expect(screen.getByText('passport.declaredEmptyOwn')).toBeTruthy();
});

it("shows a member the countries they share with someone and how many of theirs they're missing", async () => {
  selectAuthUser.mockReturnValue({ id: 'someone-else' });
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [],
    comparison: { inCommon: ['ES', 'FR'], onlyTheirs: ['IT'] },
  });

  await renderScreen();

  expect(screen.getByText(/passport.compareInCommon/)).toBeTruthy();
  expect(screen.getByText('🇪🇸 🇫🇷')).toBeTruthy();
  expect(screen.getByText('passport.compareMissing')).toBeTruthy();
  expect(getMyPassportLeaderboard).not.toHaveBeenCalled();
});

it('ranks the owner among the people they follow, opening their passports', async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });
  getMyPassportLeaderboard.mockResolvedValue({
    followsAnyone: true,
    entries: [
      { user: { id: 'ana', username: 'ana', avatarUrl: null }, countries: 9, rank: 1, isMe: false },
      { user: { id: 'user-1', username: 'jane', avatarUrl: null }, countries: 3, rank: 2, isMe: true },
    ],
  });
  const navigation = { goBack: jest.fn(), setParams: jest.fn(), push: jest.fn(), navigate: jest.fn() };

  await renderScreen({}, navigation);
  fireEvent.press(screen.getByText('@ana'));

  expect(screen.getByText('passport.leaderboardYou')).toBeTruthy();
  expect(navigation.push).toHaveBeenCalledWith('Passport', { userId: 'ana' });

  // Would stack their own passport again on top of it.
  navigation.push.mockClear();
  fireEvent.press(screen.getByText('passport.leaderboardYou'));
  expect(navigation.push).not.toHaveBeenCalled();
});

it('invites the owner to find travellers when they follow no one', async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });
  const navigation = { goBack: jest.fn(), setParams: jest.fn(), push: jest.fn(), navigate: jest.fn() };

  await renderScreen({}, navigation);
  fireEvent.press(screen.getByText('passport.leaderboardExplore'));

  expect(navigation.navigate).toHaveBeenCalledWith('Community');
});

it('does not compare when the other person has no countries to compare', async () => {
  selectAuthUser.mockReturnValue({ id: 'someone-else' });
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [],
    comparison: { inCommon: [], onlyTheirs: [] },
  });

  await renderScreen();

  expect(screen.queryByText(/passport.compare/)).toBeNull();
});

it('opens the card of the new country from its notification, knowing it is private', async () => {
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane' }, achievements: [],
    countries: [{ code: 'FR', firstVisitedOn: '2026-06-10', isPrivate: true }],
  });
  const navigation = { goBack: jest.fn(), setParams: jest.fn(), push: jest.fn(), navigate: jest.fn() };

  await renderScreen({ share: 'moment', country: 'FR' }, navigation);

  expect(screen.getByText('moment-modal country:FR private:true')).toBeTruthy();
  expect(navigation.setParams).toHaveBeenCalledWith({ share: undefined, country: undefined, badge: undefined });
});

it("falls back to sharing the whole passport when the moment can't be found", async () => {
  getUserPassport.mockResolvedValue({ owner: { id: 'user-1', username: 'jane' }, achievements: [], countries: [] });

  await renderScreen({ share: 'moment', badge: 'explorer' });

  expect(screen.getByText('share-modal achievements:true')).toBeTruthy();
  expect(screen.queryByText(/moment-modal/)).toBeNull();
});

// E.g. a countries badge reached through van log countries: others see it locked.
it("marks as only-yours an earned badge others don't see as earned", async () => {
  getUserPassport.mockResolvedValue({
    owner: { id: 'user-1', username: 'jane' }, countries: [],
    achievements: [{ id: 'countries_5', family: 'countries', threshold: 5, isPrivate: false, earnedAt: '2026-09-01', current: 5, visibleToOthers: false }],
  });

  await renderScreen();

  expect(screen.getByLabelText('badges.onlyYou')).toBeTruthy();
});
