jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => callback(), []); } };
});
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('@tobeatraveller/shared', () => ({
  getMyReferralInfo: jest.fn(),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
}));
jest.mock('../../utils/config', () => ({ WEB_URL: 'https://tobeatraveller.test' }));

import { getMyReferralInfo } from '@tobeatraveller/shared';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReferralScreen from '../../screens/referral/ReferralScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderScreen = async () => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ReferralScreen navigation={{ goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

// Regression: a first visit showed "0" and "0" as the progress.
it('offers the reward for both and nudges to a first invite instead of showing zeros', async () => {
  getMyReferralInfo.mockResolvedValue({ referralCode: 'tbat', invited: 0, rewarded: 0, invites: [] });

  await renderScreen();

  expect(screen.getByText('referral.rewardForFriend')).toBeTruthy();
  expect(screen.getByText('referral.firstInviteHint')).toBeTruthy();
  expect(screen.queryByText('referral.statsInvited')).toBeNull();
});

it('shows who was invited once there is someone', async () => {
  getMyReferralInfo.mockResolvedValue({
    referralCode: 'tbat', invited: 1, rewarded: 0,
    invites: [{ id: 'i1', status: 'pending', referredUser: { username: 'ana', avatarUrl: null } }],
  });

  await renderScreen();

  expect(screen.getByText('@ana')).toBeTruthy();
  expect(screen.getByText('referral.inviteStatusPending')).toBeTruthy();
  expect(screen.queryByText('referral.firstInviteHint')).toBeNull();
});
