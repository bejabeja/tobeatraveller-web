let mockAuthError;
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('@tobeatraveller/shared', () => ({
  clearError: jest.fn(() => 'clear-error'),
  loginUser: jest.fn(),
  selectAuthError: () => mockAuthError,
  translateAuthError: (t, message) => message,
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from '../../screens/auth/LoginScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderScreen = async () => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <LoginScreen navigation={{ navigate: jest.fn() }} route={{}} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthError = null;
});

// Regression: a failed attempt on another screen used to stay on the next one
// for good, because nothing ever cleared it.
it('forgets a failure left by another screen when it opens', async () => {
  mockAuthError = 'Invalid credentials';

  await renderScreen();

  expect(mockDispatch).toHaveBeenCalledWith('clear-error');
});

it('clears the failure as soon as they start typing again', async () => {
  mockAuthError = 'Invalid credentials';
  await renderScreen();
  mockDispatch.mockClear();

  fireEvent.changeText(screen.getByLabelText('auth.emailLabel'), 'ana@example.com');

  expect(mockDispatch).toHaveBeenCalledWith('clear-error');
});
