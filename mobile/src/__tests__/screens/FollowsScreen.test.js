const mockDispatch = jest.fn();
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-redux', () => ({ useSelector: (selector) => selector(), useDispatch: () => mockDispatch }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@tobeatraveller/shared', () => ({
  ANALYTICS_EVENTS: { USER_FOLLOWED: 'user_followed' },
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getAllFollowers: jest.fn(),
  getAllFollowing: jest.fn(),
  selectIsAuthenticated: () => true,
  selectMe: () => ({ id: 'me', followingListIds: [] }),
  selectAuthUser: () => ({ id: 'me' }),
  setUserInfo: (id) => ({ type: 'setUserInfo', id }),
}));

import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { followUser, getAllFollowers } from '@tobeatraveller/shared';
import FollowsScreen from '../../screens/follows/FollowsScreen';

const ANA = { id: 'u2', username: 'ana', avatarUrl: null };

// Regression: when following failed the button just stopped loading, as if nothing had been asked.
it('says it did not work when following someone from the list fails', async () => {
  getAllFollowers.mockResolvedValue([ANA]);
  followUser.mockRejectedValue(new Error('Network request failed'));
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render(<FollowsScreen route={{ params: { userId: 'u1', type: 'followers' } }} navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
  await act(async () => {});

  await act(async () => { fireEvent.press(await screen.findByText('followers.follow')); });

  expect(alertSpy).toHaveBeenCalledWith('errors.somethingWrong');
});

// Regression: a list that failed to load showed "nobody follows you", which was not true.
it('says the list could not be loaded, instead of saying it is empty, and lets them try again', async () => {
  getAllFollowers.mockRejectedValueOnce(new Error('Network request failed'));
  getAllFollowers.mockResolvedValueOnce([ANA]);
  render(<FollowsScreen route={{ params: { userId: 'u1', type: 'followers' } }} navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
  await act(async () => {});

  expect(screen.getByText('errors.somethingWrong')).toBeTruthy();
  expect(screen.queryByText('followers.noFollowers')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByText('common.retry')); });

  expect(await screen.findByText('@ana')).toBeTruthy();
});
