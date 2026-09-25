jest.mock('react-i18next', () => {
  const t = (key, vars) => (vars?.count != null ? `${key}:${vars.count}` : key);
  return { useTranslation: () => ({ t, i18n: { language: 'es' } }) };
});

jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));

jest.mock('@tobeatraveller/shared', () => {
  const recap = jest.requireActual('../../../../shared/src/utils/recap.js');
  const badges = jest.requireActual('../../../../shared/src/utils/constants/badges.js');
  const countries = jest.requireActual('../../../../shared/src/utils/constants/countries.js');
  return {
    ...recap, ...badges, ...countries,
    getMyRecap: jest.fn(),
    getMyReferralInfo: jest.fn(),
    selectAuthUser: jest.fn(),
  };
});

jest.mock('../../utils/config', () => ({ WEB_URL: 'https://tobeatraveller.test' }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import { AccessibilityInfo, Animated } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { getMyRecap, getMyReferralInfo, selectAuthUser } from '@tobeatraveller/shared';
import RecapScreen from '../../screens/recap/RecapScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const RECAP = {
  available: true,
  year: 2026,
  hasActivity: true,
  countries: { codes: ['PT', 'ES'], newCodes: ['PT'], top: { code: 'PT', days: 20 } },
  daysOnRoad: 87,
  trips: { count: 0, longest: null },
  vanLog: { entries: 40, nights: 25, refuels: 9, liters: 413 },
  diary: { entries: 0, wouldReturn: 0 },
  badges: [],
};

const renderScreen = async (navigation = { goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn() }) => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <RecapScreen navigation={navigation} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

beforeEach(() => {
  jest.clearAllMocks();
  selectAuthUser.mockReturnValue({ id: 'user-1', username: 'jane' });
  getMyRecap.mockResolvedValue(RECAP);
  getMyReferralInfo.mockResolvedValue({ referralCode: 'jane' });
  captureRef.mockResolvedValue('file:///tmp/year.png');
  Sharing.isAvailableAsync.mockResolvedValue(true);
  Sharing.shareAsync.mockResolvedValue();
  Clipboard.setStringAsync.mockResolvedValue(true);
});

it('goes through the year one slide at a time, only those with something in them', async () => {
  await renderScreen();

  expect(screen.getByText('recap.title')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('recap.next'));
  expect(screen.getByText('recap.countriesTitle:2')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('recap.next'));
  expect(screen.getByText('recap.daysTitle:87')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('recap.next'));
  expect(screen.getByText('recap.vanTitle')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('recap.previous'));
  expect(screen.getByText('recap.daysTitle:87')).toBeTruthy();
});

it("shares the last slide's card, copying the link to the passport with the referral code", async () => {
  await renderScreen();
  for (let step = 0; step < 4; step += 1) fireEvent.press(screen.getByLabelText('recap.next'));
  await act(async () => {});

  expect(screen.getByText('@jane')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://tobeatraveller.test/profile/user-1/passport?ref=jane');
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/year.png', expect.objectContaining({ mimeType: 'image/png' }));
});

it('says so for a year with nothing logged', async () => {
  getMyRecap.mockResolvedValue({ ...RECAP, hasActivity: false });

  await renderScreen();

  expect(screen.getByText('recap.empty')).toBeTruthy();
});

it('says when the recap will be available out of season, and closes', async () => {
  getMyRecap.mockResolvedValue({ available: false });
  const navigation = { goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn() };

  await renderScreen(navigation);
  fireEvent.press(screen.getByLabelText('recap.close'));

  expect(screen.getByText('recap.notAvailable')).toBeTruthy();
  expect(navigation.goBack).toHaveBeenCalled();
});

// Opened from a push with the app closed: there's no screen to go back to.
it("goes to the owner's passport when closed with nothing to go back to", async () => {
  const navigation = { goBack: jest.fn(), canGoBack: () => false, navigate: jest.fn() };

  await renderScreen(navigation);
  fireEvent.press(screen.getByLabelText('recap.close'));

  expect(navigation.goBack).not.toHaveBeenCalled();
  expect(navigation.navigate).toHaveBeenCalledWith('Passport', { userId: 'user-1' });
});

describe('moving on by itself', () => {
  // jest-expo already mocks AccessibilityInfo: set both settings on every
  // case, so one case turning a setting on can't leak into the next.
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  });
  afterEach(() => jest.useRealTimers());

  const advance = async (ms) => { await act(async () => { jest.advanceTimersByTime(ms); }); };

  it('moves to the next slide once its time is up', async () => {
    await renderScreen();

    await advance(4000);
    expect(screen.getByText('recap.title')).toBeTruthy();
    await advance(1500);
    expect(screen.getByText('recap.countriesTitle:2')).toBeTruthy();
  });

  it('stays while a side of the screen is held, and carries on when released', async () => {
    await renderScreen();

    fireEvent(screen.getByLabelText('recap.next'), 'pressIn');
    await advance(8000);
    expect(screen.getByText('recap.title')).toBeTruthy();

    fireEvent(screen.getByLabelText('recap.next'), 'pressOut');
    await advance(5500);
    expect(screen.getByText('recap.countriesTitle:2')).toBeTruthy();
  });

  // Content changing on its own gets in the way of reduced motion and screen readers.
  it.each([
    ['reduced motion', 'isReduceMotionEnabled'],
    ['a screen reader', 'isScreenReaderEnabled'],
  ])('does not move on by itself with %s', async (_label, setting) => {
    jest.spyOn(AccessibilityInfo, setting).mockResolvedValue(true);

    await renderScreen();
    await advance(12000);

    expect(screen.getByText('recap.title')).toBeTruthy();
  });

  it('keeps the single slide of a year with nothing logged still', async () => {
    getMyRecap.mockResolvedValue({ ...RECAP, hasActivity: false });
    const timing = jest.spyOn(Animated, 'timing');

    await renderScreen();
    await advance(6000);

    expect(screen.getByText('recap.empty')).toBeTruthy();
    expect(timing).not.toHaveBeenCalled();
    timing.mockRestore();
  });
});
