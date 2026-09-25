jest.mock('react-i18next', () => {
  const t = (key) => key;
  return { useTranslation: () => ({ t, i18n: { language: 'es' } }) };
});

jest.mock('@tobeatraveller/shared', () => {
  const badges = jest.requireActual('../../../../shared/src/utils/constants/badges.js');
  const countries = jest.requireActual('../../../../shared/src/utils/constants/countries.js');
  return { ...badges, ...countries, getMyReferralInfo: jest.fn() };
});

jest.mock('../../utils/config', () => ({ WEB_URL: 'https://tobeatraveller.test' }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { getMyReferralInfo } from '@tobeatraveller/shared';
import MomentShareModal from '../../components/MomentShareModal';

const OWNER = { id: 'user-1', username: 'jane' };

const renderModal = async (moment, props = {}) => {
  render(<MomentShareModal moment={moment} owner={OWNER} visible onClose={jest.fn()} onShareWholePassport={jest.fn()} {...props} />);
  await act(async () => {});
};

beforeEach(() => {
  jest.clearAllMocks();
  getMyReferralInfo.mockResolvedValue({ referralCode: 'jane' });
  captureRef.mockResolvedValue('file:///tmp/stamp.png');
  Sharing.isAvailableAsync.mockResolvedValue(true);
  Sharing.shareAsync.mockResolvedValue();
  Clipboard.setStringAsync.mockResolvedValue(true);
});

it("shows the new country's flag, its name and whose it is", async () => {
  await renderModal({ kind: 'country', code: 'IT', isPrivate: false });

  expect(screen.getByText('🇮🇹')).toBeTruthy();
  expect(screen.getByText('Italia')).toBeTruthy();
  expect(screen.getByText('@jane')).toBeTruthy();
  expect(screen.queryByText('passport.momentPrivateCountry')).toBeNull();
});

it('warns before sharing a badge only the owner can see', async () => {
  await renderModal({ kind: 'badge', code: 'van_log_1', isPrivate: true });

  expect(screen.getByText('⛽')).toBeTruthy();
  expect(screen.getByText('passport.momentPrivateBadge')).toBeTruthy();
});

it("shares the card, copying the link to the owner's passport with their referral code", async () => {
  await renderModal({ kind: 'country', code: 'IT', isPrivate: false });

  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://tobeatraveller.test/profile/user-1/passport?ref=jane');
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/stamp.png', expect.objectContaining({ mimeType: 'image/png' }));
});

it('lets the owner switch to sharing the whole passport', async () => {
  const onShareWholePassport = jest.fn();
  await renderModal({ kind: 'country', code: 'IT', isPrivate: false }, { onShareWholePassport });

  fireEvent.press(screen.getByText('passport.momentFullPassport'));

  expect(onShareWholePassport).toHaveBeenCalled();
});
