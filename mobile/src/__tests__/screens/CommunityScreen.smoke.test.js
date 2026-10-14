jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const mockPromptSignIn = jest.fn();
jest.mock('../../components/SignInPrompt', () => ({
  SIGN_IN_REASONS: { FOLLOW: 'follow' },
  useSignInPrompt: () => mockPromptSignIn,
}));

jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('@tobeatraveller/shared', () => ({
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  initAllUsers: jest.fn(() => ({ type: 'init' })),
  loadMoreUsers: jest.fn(() => ({ type: 'more' })),
  setUserInfo: jest.fn(),
  selectAllUsers: jest.fn(),
  selectAllUsersCurrentPage: jest.fn(),
  selectAllUsersLoading: jest.fn(),
  selectAllUsersLoadingMore: jest.fn(),
  selectAllUsersTotalPages: jest.fn(),
  selectIsAuthenticated: jest.fn(),
  selectMe: jest.fn(),
  selectAuthUser: jest.fn(),
}));

import {
  selectAllUsers, selectAllUsersCurrentPage, selectAllUsersLoading, selectAllUsersLoadingMore,
  selectAllUsersTotalPages, selectAuthUser, selectIsAuthenticated, selectMe, initAllUsers,
} from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CommunityScreen from '../../screens/community/CommunityScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderScreen = async (navigation = { navigate: jest.fn() }) => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <CommunityScreen navigation={navigation} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  return navigation;
};

beforeEach(() => {
  jest.clearAllMocks();
  selectIsAuthenticated.mockReturnValue(true);
  selectAuthUser.mockReturnValue({ id: 'u1' });
  selectMe.mockReturnValue({ id: 'u1', followingListIds: [] });
  selectAllUsers.mockReturnValue([{ id: 'u2', username: 'ana', totalItineraries: 1 }]);
  selectAllUsersLoading.mockReturnValue(false);
  selectAllUsersLoadingMore.mockReturnValue(false);
  selectAllUsersCurrentPage.mockReturnValue(1);
  selectAllUsersTotalPages.mockReturnValue(1);
});

// With few people on the platform the list ends quickly: it ends on a way
// to bring more in rather than on nothing.
it('ends the whole list with an invitation to bring friends', async () => {
  const navigation = await renderScreen();

  fireEvent.press(screen.getByText('community.inviteButton'));

  expect(screen.getByText('community.inviteTitle')).toBeTruthy();
  expect(navigation.navigate).toHaveBeenCalledWith('Referral');
});

it('keeps the invitation for the end while there are more people to load', async () => {
  selectAllUsersTotalPages.mockReturnValue(3);

  await renderScreen();

  expect(screen.queryByText('community.inviteTitle')).toBeNull();
});

it('says once who a search did not find and offers to invite them', async () => {
  selectAllUsers.mockReturnValue([]);
  const navigation = await renderScreen();

  fireEvent.changeText(screen.getByPlaceholderText('community.searchPlaceholder'), 'marta');
  fireEvent.press(screen.getByText('community.inviteButton'));

  expect(screen.getByText('community.noTravelersFor')).toBeTruthy();
  expect(navigation.navigate).toHaveBeenCalledWith('Referral');
});

it('reminds, under a search\'s results, that the person may not be here yet', async () => {
  const navigation = await renderScreen();

  fireEvent.changeText(screen.getByPlaceholderText('community.searchPlaceholder'), 'an');
  fireEvent.press(screen.getByText('community.inviteButton'));

  expect(screen.getByText('community.searchInvite')).toBeTruthy();
  expect(screen.queryByText('community.inviteTitle')).toBeNull();
  expect(navigation.navigate).toHaveBeenCalledWith('Referral');
});

it("shows a person's bio, and a follow button that asks a signed-out visitor to sign in", async () => {
  selectIsAuthenticated.mockReturnValue(false);
  selectAllUsers.mockReturnValue([{ id: 'u2', username: 'ana', bio: 'Furgo y surf', totalItineraries: 1 }]);
  const navigation = await renderScreen();

  fireEvent.press(screen.getByText('community.follow'));

  expect(screen.getByText('Furgo y surf')).toBeTruthy();
  expect(mockPromptSignIn).toHaveBeenCalledWith('follow');
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it("opens a person's profile to a signed-out visitor, as on the web", async () => {
  selectIsAuthenticated.mockReturnValue(false);
  selectAllUsers.mockReturnValue([{ id: 'u2', username: 'ana', totalItineraries: 1 }]);
  const navigation = await renderScreen();

  fireEvent.press(screen.getByLabelText('@ana'));

  expect(navigation.navigate).toHaveBeenCalledWith('UserProfile', { id: 'u2' });
});

// Regression: the list of travellers to follow included the person looking at it.
it('does not list the signed-in person among the travellers to follow', async () => {
  selectAllUsers.mockReturnValue([{ id: 'u1', username: 'tbat', totalItineraries: 1 }, { id: 'u2', username: 'ana', totalItineraries: 1 }]);

  await renderScreen();

  expect(screen.queryByText('@tbat')).toBeNull();
  expect(screen.getByText('@ana')).toBeTruthy();
});

// Regression: it opened in alphabetical order, so people with no trips came first, while the web opens on the most trips.
it('opens with the people who have shared the most trips, and goes alphabetical on request', async () => {
  initAllUsers.mockClear();
  await renderScreen();
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  expect(initAllUsers).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'itineraries' }));

  await act(async () => { fireEvent.press(screen.getByText('community.sortAZ')); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  expect(initAllUsers).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'username' }));
});
