jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('@tobeatraveller/shared', () => ({
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
  selectAllUsersTotalPages, selectAuthUser, selectIsAuthenticated, selectMe,
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
