const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${vars.count}` : key) }) }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/travelStyle.js'),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getSuggestedUsers: jest.fn(),
  updateMyTravelStyle: jest.fn(),
  setUserInfo: (id) => ({ type: 'setUserInfo', id }),
  selectAuthUser: () => ({ id: 'u1' }),
  ANALYTICS_EVENTS: {
    ONBOARDING_START_STEP_CLICKED: 'onboarding_start_step_clicked',
    ONBOARDING_TRAVEL_STYLE_CHOSEN: 'onboarding_travel_style_chosen',
    USER_FOLLOWED: 'user_followed',
  },
}));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));

import { getSuggestedUsers, updateMyTravelStyle } from '@tobeatraveller/shared';
import { trackEvent } from '../../utils/analytics';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OnboardingScreen from '../../screens/auth/OnboardingScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ANA = { id: 'u2', username: 'ana', totalItineraries: 1 };

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

const choose = async (style) => {
  await act(async () => { fireEvent.press(screen.getByText(`travelStyle.${style}`)); });
};

beforeEach(() => {
  jest.clearAllMocks();
  getSuggestedUsers.mockResolvedValue([]);
  updateMyTravelStyle.mockResolvedValue(undefined);
});

describe('how do you travel', () => {
  it('asks first how they travel, with both answers and a way to skip', async () => {
    await renderScreen();

    expect(screen.getByText('travelStyle.question')).toBeTruthy();
    expect(screen.getByText('travelStyle.van')).toBeTruthy();
    expect(screen.getByText('travelStyle.occasional')).toBeTruthy();
    expect(screen.getByText('onboarding.skip')).toBeTruthy();
  });

  it('starts someone in a van with their expenses, their supplies and the list before driving off', async () => {
    const navigation = await renderScreen();
    await choose('van');

    expect(screen.getByText('onboarding.startExpense')).toBeTruthy();
    expect(screen.getByText('onboarding.startSupplies')).toBeTruthy();
    expect(screen.getByText('onboarding.startChecklist')).toBeTruthy();
    expect(screen.queryByText('onboarding.startTrip')).toBeNull();

    fireEvent.press(screen.getByText('onboarding.startSupplies'));

    expect(navigation.replace).toHaveBeenCalledWith('Tabs');
    expect(navigation.navigate).toHaveBeenCalledWith('Supplies', undefined);
    expect(trackEvent).toHaveBeenCalledWith('onboarding_start_step_clicked', { step: 'startSupplies' });
  });

  it('takes the first step of a van to its own screen: expenses, and the list before driving off', async () => {
    const navigation = await renderScreen();
    await choose('van');

    fireEvent.press(screen.getByText('onboarding.startExpense'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('VanLog', undefined);

    fireEvent.press(screen.getByText('onboarding.startChecklist'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('PackingChecklist', undefined);
  });

  it('starts someone who travels now and then with a trip, a packing list and their countries', async () => {
    const navigation = await renderScreen();
    await choose('occasional');

    expect(screen.getByText('onboarding.startTrip')).toBeTruthy();
    expect(screen.getByText('onboarding.startPackingList')).toBeTruthy();
    expect(screen.queryByText('onboarding.startExpense')).toBeNull();

    fireEvent.press(screen.getByText('onboarding.startPassport'));

    expect(navigation.navigate).toHaveBeenCalledWith('Passport', { userId: 'u1' });
  });

  it('saves the answer, counts it and refreshes the profile', async () => {
    await renderScreen();

    await choose('van');

    expect(updateMyTravelStyle).toHaveBeenCalledWith('van');
    expect(trackEvent).toHaveBeenCalledWith('onboarding_travel_style_chosen', { style: 'van' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setUserInfo', id: 'u1' });
  });

  // Regression-in-waiting: an optional preference that fails to save must never keep someone out of the app.
  it('carries on with the first steps when the answer cannot be saved', async () => {
    updateMyTravelStyle.mockRejectedValue(new Error('Network error'));
    await renderScreen();

    await choose('van');

    expect(screen.getByText('onboarding.startExpense')).toBeTruthy();
  });

  it('gives the general first steps, and saves nothing, to whoever skips the question', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('onboarding.skip'));

    expect(screen.getByText('onboarding.startTrip')).toBeTruthy();
    expect(updateMyTravelStyle).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalledWith('onboarding_travel_style_chosen', expect.anything());
  });
});

describe('after the first steps', () => {
  const reachFirstSteps = async () => {
    const navigation = await renderScreen();
    await choose('occasional');
    return navigation;
  };

  it('goes into the app when there is nobody to follow', async () => {
    const navigation = await reachFirstSteps();

    fireEvent.press(screen.getByText('onboarding.skip'));

    expect(navigation.replace).toHaveBeenCalledWith('Tabs');
  });

  it('offers to follow someone when there is, as the last step', async () => {
    getSuggestedUsers.mockResolvedValue([ANA]);
    const navigation = await reachFirstSteps();

    fireEvent.press(screen.getByText('onboarding.skip'));

    expect(screen.getByText('onboarding.followPrompt')).toBeTruthy();
    expect(screen.getByText('@ana')).toBeTruthy();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  // Regression: it asked to follow at least one traveller before it let anyone continue.
  it('lets them continue without following anyone', async () => {
    getSuggestedUsers.mockResolvedValue([ANA]);
    const navigation = await reachFirstSteps();
    fireEvent.press(screen.getByText('onboarding.skip'));

    fireEvent.press(screen.getByText('onboarding.continue'));

    expect(navigation.replace).toHaveBeenCalledWith('Tabs');
  });

  it('waits for the suggestions before deciding whether there is anyone to follow', async () => {
    getSuggestedUsers.mockReturnValue(new Promise(() => {}));
    const navigation = await reachFirstSteps();

    fireEvent.press(screen.getByText('onboarding.skip'));

    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('onboarding.followPrompt')).toBeNull();
  });

  // Regression: a failed request left the screen loading forever.
  it('goes on when the suggestions cannot be fetched', async () => {
    getSuggestedUsers.mockRejectedValue(new Error('Network error'));
    const navigation = await reachFirstSteps();

    fireEvent.press(screen.getByText('onboarding.skip'));

    expect(navigation.replace).toHaveBeenCalledWith('Tabs');
  });
});

describe('when the answer cannot be saved', () => {
  it('says so instead of moving on as if it had been, since Settings is the only other way to say it', async () => {
    updateMyTravelStyle.mockRejectedValue(new Error('offline'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderScreen();

    await choose('van');

    expect(alert).toHaveBeenCalledWith('onboarding.travelStyleSaveError');
  });
});
