let mockMe = { id: 'user-1', username: 'jane', email: 'jane@example.com' };
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { language: 'es', changeLanguage: jest.fn() },
  changeLanguage: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('../../utils/pushNotifications', () => ({ registerForPushNotifications: jest.fn() }));
jest.mock('../../utils/session', () => ({ clearDeviceSessionData: jest.fn() }));
jest.mock('../../utils/analytics', () => ({ ANALYTICS_CONSENT: { GRANTED: 'granted', DENIED: 'denied' } }));
jest.mock('../../hooks/useAnalyticsConsent', () => ({
  useAnalyticsConsent: () => ({ consent: 'denied', answer: jest.fn() }),
}));

jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/constants/languages.js'),
  ...jest.requireActual('../../../../shared/src/utils/parseRichText.js'),
  ...jest.requireActual('../../../../shared/src/utils/schemasValidation.js'),
  ...jest.requireActual('../../../../shared/src/utils/travelStyle.js'),
  selectAuthUser: () => ({ id: 'user-1', username: 'jane' }),
  selectMe: () => mockMe,
  setUserInfo: (id) => ({ type: 'setUserInfo', id }),
  updateMyTravelStyle: jest.fn(),
  getBlockedUsers: jest.fn().mockResolvedValue([]),
  unblockUser: jest.fn(),
  fetchNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(),
  changePassword: jest.fn(),
  changeUnverifiedEmail: jest.fn(),
  deleteMyAccount: jest.fn(),
  exportMyData: jest.fn(),
  logoutUser: jest.fn(),
}));

import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { changePassword, changeUnverifiedEmail, fetchNotificationPreferences, updateMyTravelStyle } from '@tobeatraveller/shared';
import { changeLanguage } from '../../i18n';
import SettingsScreen from '../../screens/settings/SettingsScreen';

const renderScreen = () => render(<SettingsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

beforeEach(() => {
  jest.clearAllMocks();
  fetchNotificationPreferences.mockResolvedValue({
    pushEnabled: false, notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true, notifyOnFriendStamps: false,
  });
});

it('shows the account email and the current language in their rows', async () => {
  renderScreen();

  expect(await screen.findByText('jane@example.com')).toBeTruthy();
  expect(screen.getByText('🇪🇸 Español')).toBeTruthy();
  expect(screen.queryByText('🇫🇷 Français')).toBeNull();
});

it('unfolds the languages from their row and switches to the one tapped', async () => {
  renderScreen();

  fireEvent.press(await screen.findByText('settings.language'));
  fireEvent.press(screen.getByText('🇫🇷 Français'));

  expect(changeLanguage).toHaveBeenCalledWith('fr');
  expect(screen.queryByText('🇩🇪 Deutsch')).toBeNull();
});

it('opens the password form from its row', async () => {
  renderScreen();

  fireEvent.press(await screen.findByText('editProfile.changePassword'));

  expect(screen.getByPlaceholderText('editProfile.currentPasswordLabel')).toBeTruthy();
});

it('asks to type the username before deleting the account', async () => {
  renderScreen();

  fireEvent.press(await screen.findByText('editProfile.deleteAccount'));

  expect(screen.getByPlaceholderText('jane')).toBeTruthy();
});

describe('changing the password', () => {
  const submitNewPassword = async (newPassword) => {
    renderScreen();
    fireEvent.press(await screen.findByText('editProfile.changePassword'));
    fireEvent.changeText(screen.getByPlaceholderText('editProfile.currentPasswordLabel'), 'old-password');
    fireEvent.changeText(screen.getByPlaceholderText('editProfile.newPasswordLabel'), newPassword);
    fireEvent.changeText(screen.getByPlaceholderText('editProfile.confirmNewPasswordLabel'), newPassword);
    // The row that opens the form and the button that sends it carry the same text.
    await act(async () => { fireEvent.press(screen.getAllByText('editProfile.changePassword').at(-1)); });
  };

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    changePassword.mockResolvedValue({});
  });

  // Regression-in-waiting: it asked for 6 here while signing up and resetting ask for 8.
  it('asks for 8 characters, like signing up, and does not send a shorter one', async () => {
    await submitNewPassword('abcdefg');

    expect(screen.getByText('errors.passwordMin')).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('does not take a password made of spaces', async () => {
    await submitNewPassword('        ');

    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes it with 8 characters', async () => {
    await submitNewPassword('abcdefgh');

    expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'old-password', newPassword: 'abcdefgh' });
  });
});

describe('how you travel', () => {
  beforeEach(() => {
    mockMe = { id: 'user-1', username: 'jane', email: 'jane@example.com' };
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    updateMyTravelStyle.mockResolvedValue(undefined);
  });

  it('shows what they said in its row', async () => {
    mockMe = { ...mockMe, travelStyle: 'van' };
    renderScreen();

    expect(await screen.findByText('travelStyle.van')).toBeTruthy();
  });

  it('says it is not set for someone who skipped the question, instead of choosing for them', async () => {
    renderScreen();

    expect(await screen.findByText('settings.travelStyleNotSet')).toBeTruthy();
  });

  // Regression-in-waiting: the basic profile does not carry the answer, so "not set" was shown to someone who did choose.
  it('does not show the row until the whole profile has arrived', async () => {
    mockMe = null;
    renderScreen();

    expect(await screen.findByText('settings.language')).toBeTruthy();
    expect(screen.queryByText('settings.travelStyle')).toBeNull();
    expect(screen.queryByText('settings.travelStyleNotSet')).toBeNull();
  });

  it('unfolds both answers from its row, marking the one chosen', async () => {
    mockMe = { ...mockMe, travelStyle: 'occasional' };
    renderScreen();

    fireEvent.press(await screen.findByText('settings.travelStyle'));

    expect(screen.getByRole('button', { name: 'travelStyle.occasional', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'travelStyle.van', selected: false })).toBeTruthy();
  });

  it('saves the new answer, refreshes the profile and folds the list', async () => {
    renderScreen();
    fireEvent.press(await screen.findByText('settings.travelStyle'));

    await act(async () => { fireEvent.press(screen.getByText('travelStyle.van')); });

    expect(updateMyTravelStyle).toHaveBeenCalledWith('van');
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setUserInfo', id: 'user-1' });
    expect(screen.queryByText('travelStyle.occasional')).toBeNull();
  });

  it('says it could not be saved, and does not refresh the profile as if it had been', async () => {
    updateMyTravelStyle.mockRejectedValue(new Error('Network error'));
    renderScreen();
    fireEvent.press(await screen.findByText('settings.travelStyle'));

    await act(async () => { fireEvent.press(screen.getByText('travelStyle.van')); });

    expect(Alert.alert).toHaveBeenCalledWith('errors.somethingWrong');
    expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'setUserInfo', id: 'user-1' });
  });
});

describe('correcting an email that was never confirmed', () => {
  const UNCONFIRMED = { id: 'user-1', username: 'jane', email: 'jane@exmaple.com', emailVerified: false };

  afterEach(() => {
    mockMe = { id: 'user-1', username: 'jane', email: 'jane@example.com' };
  });

  it('offers it only to whoever has not confirmed', async () => {
    mockMe = { ...UNCONFIRMED, emailVerified: true };
    renderScreen();

    await screen.findByText('jane@exmaple.com');
    expect(screen.queryByText('emailVerification.changeLink')).toBeNull();
  });

  it('sends the corrected address with the password and refreshes the profile', async () => {
    mockMe = UNCONFIRMED;
    changeUnverifiedEmail.mockResolvedValue({});
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen();

    fireEvent.press(await screen.findByText('emailVerification.changeLink'));
    fireEvent.changeText(screen.getByPlaceholderText('emailVerification.newEmailLabel'), ' jane@example.com ');
    fireEvent.changeText(screen.getByPlaceholderText('emailVerification.passwordLabel'), 'secret-pass');
    await act(async () => { fireEvent.press(screen.getByText('emailVerification.save')); });

    expect(changeUnverifiedEmail).toHaveBeenCalledWith({ email: 'jane@example.com', currentPassword: 'secret-pass' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setUserInfo', id: 'user-1' });
  });

  it('says why it failed and keeps the form open', async () => {
    mockMe = UNCONFIRMED;
    changeUnverifiedEmail.mockRejectedValue(new Error('auth.emailInUse'));
    renderScreen();

    fireEvent.press(await screen.findByText('emailVerification.changeLink'));
    fireEvent.changeText(screen.getByPlaceholderText('emailVerification.newEmailLabel'), 'taken@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('emailVerification.passwordLabel'), 'secret-pass');
    await act(async () => { fireEvent.press(screen.getByText('emailVerification.save')); });

    expect(screen.getByText('auth.emailInUse')).toBeTruthy();
    expect(screen.getByPlaceholderText('emailVerification.newEmailLabel')).toBeTruthy();
  });
});

it('leads to the subscription and to inviting friends', async () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  render(<SettingsScreen navigation={navigation} />);

  fireEvent.press(await screen.findByText('settings.inviteFriends'));

  expect(navigation.navigate).toHaveBeenCalledWith('Referral');
  fireEvent.press(screen.getAllByText('settings.plan')[1]);
  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});
