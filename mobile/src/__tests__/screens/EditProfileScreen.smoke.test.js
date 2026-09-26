jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.date ? `${key}:${vars.date}` : key), i18n: { language: 'en' } }),
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('../../utils/config', () => ({ GEOAPIFY_KEY: 'test' }));
jest.mock('../../hooks/useCurrentLocation', () => ({ useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), loading: false }) }));
jest.mock('../../components/UseCurrentLocationButton', () => ({ UseCurrentLocationButton: () => null }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  checkUsernameAvailable: jest.fn().mockResolvedValue(true),
  initAuthUser: jest.fn(),
  reverseGeocode: jest.fn(),
  selectMe: jest.fn(),
  selectAuthUser: jest.fn(),
  setUserInfo: jest.fn(),
  updateUser: jest.fn(),
}));

import { selectAuthUser, selectMe } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EditProfileScreen from '../../screens/profile/EditProfileScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ME = { id: 'user-1', username: 'jane', name: '', bio: '', location: '', about: '', usernameChangeAvailableAt: null };

const renderScreen = async () => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <EditProfileScreen navigation={{ goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

beforeEach(() => {
  selectAuthUser.mockReturnValue(ME);
});

it('locks the username until 30 days after the last change, saying until when', async () => {
  selectMe.mockReturnValue({ ...ME, usernameChangeAvailableAt: '2026-10-26T12:00:00Z' });

  await renderScreen();

  expect(screen.getByDisplayValue('jane').props.editable).toBe(false);
  expect(screen.getByText(/editProfile.usernameLockedUntil:October 26, 2026/)).toBeTruthy();
});

it("warns, before saving, that a new name can't be changed again for 30 days", async () => {
  selectMe.mockReturnValue(ME);
  await renderScreen();

  fireEvent.changeText(screen.getByDisplayValue('jane'), 'jane_vanlife');

  expect(screen.getByText('editProfile.usernameChangeLimit')).toBeTruthy();
});
