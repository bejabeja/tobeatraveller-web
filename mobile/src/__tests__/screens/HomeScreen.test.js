let mockAuthenticated = true;
let mockMe = null;
let mockMeError = null;
let mockFeed = [];
const mockDispatch = jest.fn(() => Promise.resolve());

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children }));
jest.mock('../../components/EmailVerificationBanner', () => ({ EmailVerificationBanner: () => null }));
jest.mock('../../components/NextTripCard', () => () => null);
jest.mock('../../components/VanToday', () => {
  const { Text } = require('react-native');
  return () => <Text>van-today</Text>;
});
jest.mock('../../components/PassportSummary', () => {
  const { Text } = require('react-native');
  return () => <Text>passport-summary</Text>;
});
jest.mock('../../components/HomeNews', () => {
  const { Text } = require('react-native');
  return () => <Text>home-news</Text>;
});
jest.mock('../../components/WorldMapSection', () => {
  const { Text } = require('react-native');
  return () => <Text>world-map</Text>;
});
jest.mock('../../components/ItineraryCard', () => {
  const { Text } = require('react-native');
  return ({ itinerary }) => <Text>{`trip:${itinerary.title}`}</Text>;
});
jest.mock('../../components/Skeleton', () => {
  const { Text } = require('react-native');
  return { ItineraryCardSkeleton: () => <Text>skeleton</Text>, UserAvatarSkeleton: () => null };
});
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/travelStyle.js'),
  ...jest.requireActual('../../../../shared/src/utils/greetingName.js'),
  ...jest.requireActual('../../../../shared/src/utils/homeTab.js'),
  initNotifications: () => 'init-notifications',
  selectMeError: () => mockMeError,
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  getDestinations: jest.fn(() => Promise.resolve([{ name: 'Lisboa', count: 1, lat: 1, lon: 1 }])),
  initFeaturedItineraries: () => 'init-featured',
  initFeaturedUsers: () => 'init-users',
  initFeed: () => 'init-feed',
  refreshUnreadCount: () => 'refresh-unread',
  selectFeaturedItineraries: () => [{ id: 'f1', title: 'Destacado' }],
  selectFeaturedItinerariesLoading: () => false,
  selectFeaturedUsers: () => [],
  selectFeaturedUsersLoading: () => false,
  selectFeed: () => mockFeed,
  selectFeedLoading: () => false,
  selectIsAuthenticated: () => mockAuthenticated,
  selectMe: () => mockMe,
  selectAuthUser: () => ({ id: 'u1', username: 'ana' }),
  selectUnreadCount: () => 0,
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import HomeScreen from '../../screens/home/HomeScreen';

const navigation = { navigate: jest.fn() };
const FEED_TRIP = { id: 's1', title: 'De alguien que sigo' };

const renderHome = async () => {
  render(<HomeScreen navigation={navigation} />);
  await act(async () => {});
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
  mockMe = { id: 'u1', followingListIds: [] };
  mockFeed = [];
  mockMeError = null;
});

describe('Home for someone signed in', () => {
  // Regression-in-waiting: it was the visitor's Home with a greeting on top, pitch and all.
  it('leaves out the world map and the pitch lines written for visitors', async () => {
    await renderHome();

    expect(screen.getByText('trip:Destacado')).toBeTruthy();
    expect(screen.queryByText('world-map')).toBeNull();
    expect(screen.queryByText('home.featuredSubtitle')).toBeNull();
  });

  it('starts with what is theirs: what is new, and their passport', async () => {
    await renderHome();

    expect(screen.getByText('home-news')).toBeTruthy();
    expect(screen.getByText('passport-summary')).toBeTruthy();
  });

  it('greets by first name, not by @username', async () => {
    mockMe = { id: 'u1', name: 'Miriam Abella', username: 'miri', followingListIds: [] };

    await renderHome();

    expect(screen.getByText('home.heroGreeting')).toBeTruthy();
  });

  it('opens on the people they follow when they have something new', async () => {
    mockMe = { id: 'u1', followingListIds: [{ id: 'u2' }] };
    mockFeed = [FEED_TRIP];

    await renderHome();

    expect(screen.getByText('trip:De alguien que sigo')).toBeTruthy();
    expect(screen.queryByText('trip:Destacado')).toBeNull();
  });

  // Regression-in-waiting: someone following people whose feed is empty landed on "nothing here yet".
  it('opens on discovering when the people they follow have shared nothing yet', async () => {
    mockMe = { id: 'u1', followingListIds: [{ id: 'u2' }] };

    await renderHome();

    expect(screen.getByText('trip:Destacado')).toBeTruthy();
  });

  // Regression-in-waiting: a profile that failed to load left the whole Home on its skeleton for good.
it('does not wait for a profile that failed to load: it shows what there is to discover', async () => {
  mockMe = null;
  mockMeError = 'Network request failed';

  await renderHome();

  expect(screen.getByText('trip:Destacado')).toBeTruthy();
});

it('goes where they choose, whatever opened first', async () => {
    mockMe = { id: 'u1', followingListIds: [{ id: 'u2' }] };
    mockFeed = [FEED_TRIP];
    await renderHome();

    fireEvent.press(screen.getByText('home.tabDiscover'));

    expect(screen.getByText('trip:Destacado')).toBeTruthy();
  });

  it('shows the panel of the van, not the passport, to whoever lives in one', async () => {
    mockMe = { id: 'u1', travelStyle: 'van', followingListIds: [] };

    await renderHome();

    expect(screen.getByText('van-today')).toBeTruthy();
    expect(screen.queryByText('passport-summary')).toBeNull();
  });
});

describe('Home for a visitor', () => {
  it('keeps the map and the pitch, which is what it is for', async () => {
    mockAuthenticated = false;
    mockMe = null;

    await renderHome();

    expect(screen.getByText('world-map')).toBeTruthy();
    expect(screen.getByText('home.featuredSubtitle')).toBeTruthy();
    expect(screen.queryByText('home-news')).toBeNull();
  });
});
