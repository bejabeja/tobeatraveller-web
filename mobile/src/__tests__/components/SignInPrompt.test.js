jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../utils/styles', () => ({ shadow: () => ({}) }));

import { Text, TouchableOpacity } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SIGN_IN_REASONS, SignInPromptProvider, useSignInPrompt } from '../../components/SignInPrompt';

const LikeButton = () => {
  const promptSignIn = useSignInPrompt();
  return (
    <TouchableOpacity onPress={() => promptSignIn(SIGN_IN_REASONS.LIKE)}>
      <Text>like</Text>
    </TouchableOpacity>
  );
};

const renderPrompt = () => {
  const navigate = jest.fn();
  render(
    <SignInPromptProvider navigate={navigate}>
      <LikeButton />
    </SignInPromptProvider>
  );
  return navigate;
};

it('stays out of the way until an action asks for an account', () => {
  renderPrompt();

  expect(screen.queryByText('guestPrompt.title')).toBeNull();
});

it('says why an account is needed for what was tapped', () => {
  renderPrompt();

  fireEvent.press(screen.getByText('like'));

  expect(screen.getByText('guestPrompt.like')).toBeTruthy();
});

it.each([
  ['nav.createAccountBtn', 'Register'],
  ['nav.login', 'Login'],
])('offers %s and closes when it is chosen', (label, screenName) => {
  const navigate = renderPrompt();
  fireEvent.press(screen.getByText('like'));

  fireEvent.press(screen.getByText(label));

  expect(navigate).toHaveBeenCalledWith(screenName);
  expect(screen.queryByText('guestPrompt.title')).toBeNull();
});

it('closes without going anywhere when dismissed', () => {
  const navigate = renderPrompt();
  fireEvent.press(screen.getByText('like'));

  fireEvent.press(screen.getAllByText('guestPrompt.notNow')[0]);

  expect(navigate).not.toHaveBeenCalled();
  expect(screen.queryByText('guestPrompt.title')).toBeNull();
});
