jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { language: 'es', changeLanguage: jest.fn() },
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
  selectAuthUser: () => ({ id: 'user-1', username: 'jane' }),
  selectMe: () => ({ id: 'user-1', username: 'jane', email: 'jane@example.com' }),
  fetchNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(),
  changePassword: jest.fn(),
  deleteMyAccount: jest.fn(),
  exportMyData: jest.fn(),
  logoutUser: jest.fn(),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { fetchNotificationPreferences } from '@tobeatraveller/shared';
import i18n from '../../i18n';
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

  expect(i18n.changeLanguage).toHaveBeenCalledWith('fr');
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
