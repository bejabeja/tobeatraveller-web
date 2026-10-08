jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ErrorBoundary from '../../components/ErrorBoundary';

let shouldFail = true;
const Screen = () => {
  if (shouldFail) throw new Error('boom');
  return <Text>the screen</Text>;
};

beforeEach(() => {
  shouldFail = true;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

// Regression-in-waiting: a screen that threw left the app blank, with no message and no way out.
it('says something went wrong, with a way to try again, when a screen fails to draw', () => {
  render(<ErrorBoundary><Screen /></ErrorBoundary>);

  expect(screen.getByText('errors.title')).toBeTruthy();
  expect(screen.getByText('common.retry')).toBeTruthy();
});

it('draws the screen again when they try again and it works this time', () => {
  render(<ErrorBoundary><Screen /></ErrorBoundary>);
  shouldFail = false;

  fireEvent.press(screen.getByText('common.retry'));

  expect(screen.getByText('the screen')).toBeTruthy();
});

it('does not get in the way of a screen that draws fine', () => {
  shouldFail = false;

  render(<ErrorBoundary><Screen /></ErrorBoundary>);

  expect(screen.getByText('the screen')).toBeTruthy();
  expect(screen.queryByText('errors.title')).toBeNull();
});
