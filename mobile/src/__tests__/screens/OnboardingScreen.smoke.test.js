jest.mock('react-redux', () => ({ useDispatch: () => jest.fn(), useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('@tobeatraveller/shared', () => ({
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getSuggestedUsers: jest.fn(),
  setUserInfo: jest.fn(),
  selectAuthUser: () => ({ id: 'u1' }),
  ANALYTICS_EVENTS: { ONBOARDING_START_STEP_CLICKED: 'onboarding_start_step_clicked', USER_FOLLOWED: 'user_followed' },
}));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));

import { getSuggestedUsers } from '@tobeatraveller/shared';
import { trackEvent } from '../../utils/analytics';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OnboardingScreen from '../../screens/auth/OnboardingScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderScreen = async () => {
  const navigation = { replace: jest.fn(), navigate: jest.fn() };
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <OnboardingScreen navigation={navigation} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  return navigation;
};

// Regression: it said there were no suggestions and left nothing to do.
it('offers first steps of their own when there is nobody to follow, and goes to the one chosen', async () => {
  getSuggestedUsers.mockResolvedValue([]);
  const navigation = await renderScreen();

  fireEvent.press(screen.getByText('onboarding.startPassport'));

  expect(navigation.replace).toHaveBeenCalledWith('Tabs');
  expect(navigation.navigate).toHaveBeenCalledWith('Passport', { userId: 'u1' });
  expect(trackEvent).toHaveBeenCalledWith('onboarding_start_step_clicked', { step: 'startPassport' });
  expect(screen.queryByText('onboarding.skip')).toBeNull();
});

// Regression: a failed request left the screen loading forever.
it('stops loading when the suggestions cannot be fetched', async () => {
  getSuggestedUsers.mockRejectedValue(new Error('Network error'));

  await renderScreen();

  expect(screen.getByText('onboarding.startTrip')).toBeTruthy();
});
