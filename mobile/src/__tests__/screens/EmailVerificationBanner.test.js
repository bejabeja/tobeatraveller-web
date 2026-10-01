const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${vars.email}` : key) }),
}));
jest.mock('@tobeatraveller/shared', () => ({
  resendVerificationEmail: jest.fn(),
  selectMe: jest.fn(),
  setUserInfo: (id) => ({ type: 'setUserInfo', id }),
}));

import { Alert, AppState } from 'react-native';
import { resendVerificationEmail, selectMe } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { EmailVerificationBanner } from '../../components/EmailVerificationBanner';

const UNCONFIRMED = { id: 'user-1', email: 'ana@example.com', emailVerified: false };
let appStateHandler;
let removeListener;

beforeEach(() => {
  jest.clearAllMocks();
  selectMe.mockReturnValue(UNCONFIRMED);
  resendVerificationEmail.mockResolvedValue({ alreadyVerified: false });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  removeListener = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
    appStateHandler = handler;
    return { remove: removeListener };
  });
});

it('tells whoever has not confirmed which address the link went to', () => {
  render(<EmailVerificationBanner />);

  expect(screen.getByText('emailVerification.bannerText:ana@example.com')).toBeTruthy();
});

it('shows nothing to someone who has confirmed', () => {
  selectMe.mockReturnValue({ ...UNCONFIRMED, emailVerified: true });
  render(<EmailVerificationBanner />);

  expect(screen.queryByText(/emailVerification.bannerText/)).toBeNull();
});

// Regression-in-waiting: before the profile arrives the state is unknown, and a notice that blinks away is worse than none.
it('shows nothing while it is not known yet', () => {
  selectMe.mockReturnValue({ id: 'user-1', email: 'ana@example.com' });
  render(<EmailVerificationBanner />);

  expect(screen.queryByText(/emailVerification.bannerText/)).toBeNull();
});

it('sends the link again and says so', async () => {
  render(<EmailVerificationBanner />);

  await act(async () => { fireEvent.press(screen.getByText('emailVerification.bannerSend')); });

  expect(resendVerificationEmail).toHaveBeenCalledTimes(1);
  expect(screen.getByText('emailVerification.bannerSent')).toBeTruthy();
  expect(screen.queryByText('emailVerification.bannerSend')).toBeNull();
});

it('says they asked for too many links when the limit is reached, and lets them try later', async () => {
  resendVerificationEmail.mockRejectedValue(Object.assign(new Error('Too many'), { status: 429 }));
  render(<EmailVerificationBanner />);

  await act(async () => { fireEvent.press(screen.getByText('emailVerification.bannerSend')); });

  expect(Alert.alert).toHaveBeenCalledWith('errors.somethingWrong', 'emailVerification.tooMany');
  expect(screen.getByText('emailVerification.bannerSend')).toBeTruthy();
});

it('says it could not send it on any other failure', async () => {
  resendVerificationEmail.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
  render(<EmailVerificationBanner />);

  await act(async () => { fireEvent.press(screen.getByText('emailVerification.bannerSend')); });

  expect(Alert.alert).toHaveBeenCalledWith('errors.somethingWrong', 'emailVerification.sendFailed');
});

// The link opens in the browser, so the app only finds out when the person comes back to it.
it('refreshes the profile when the app comes back to the front, so the notice goes away once confirmed', () => {
  render(<EmailVerificationBanner />);

  act(() => { appStateHandler('background'); });
  expect(mockDispatch).not.toHaveBeenCalled();
  act(() => { appStateHandler('active'); });

  expect(mockDispatch).toHaveBeenCalledWith({ type: 'setUserInfo', id: 'user-1' });
});

it('does not listen to the app at all for someone who has confirmed', () => {
  selectMe.mockReturnValue({ ...UNCONFIRMED, emailVerified: true });
  render(<EmailVerificationBanner />);

  expect(AppState.addEventListener).not.toHaveBeenCalled();
});

it('stops listening when it goes away', () => {
  const { unmount } = render(<EmailVerificationBanner />);

  unmount();

  expect(removeListener).toHaveBeenCalled();
});
