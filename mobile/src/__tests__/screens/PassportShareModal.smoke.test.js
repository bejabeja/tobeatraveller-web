jest.mock('react-i18next', () => {
  // Stable like the real one.
  const t = (key) => key;
  const i18n = { language: 'es' };
  return { useTranslation: () => ({ t, i18n }) };
});

jest.mock('@tobeatraveller/shared', () => {
  const badges = jest.requireActual('../../../../shared/src/utils/constants/badges.js');
  const countries = jest.requireActual('../../../../shared/src/utils/constants/countries.js');
  const analyticsEvents = jest.requireActual('../../../../shared/src/utils/analyticsEvents.js');
  return { ...analyticsEvents, ...badges, ...countries, getUserPassport: jest.fn(), getMyReferralInfo: jest.fn() };
});

jest.mock('../../utils/config', () => ({ WEB_URL: 'https://tobeatraveller.test' }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { getMyReferralInfo, getUserPassport } from '@tobeatraveller/shared';
import PassportShareModal from '../../components/PassportShareModal';
import { trackEvent } from '../../utils/analytics';

const PUBLIC_PASSPORT = {
  owner: { id: 'user-1', username: 'jane' },
  achievements: [{ id: 'explorer', family: 'trips', threshold: 1, earnedAt: '2026-09-01', isPrivate: false }],
  countries: [{ code: 'ES', firstVisitedOn: '2026-03-01', isPrivate: false }],
};

const renderModal = async () => {
  render(<PassportShareModal userId="user-1" visible onClose={jest.fn()} />);
  await act(async () => {});
};

beforeEach(() => {
  jest.clearAllMocks();
  getUserPassport.mockResolvedValue(PUBLIC_PASSPORT);
  getMyReferralInfo.mockResolvedValue({ referralCode: 'jane' });
  Clipboard.setStringAsync.mockResolvedValue(true);
  captureRef.mockResolvedValue('file:///tmp/passport.png');
  Sharing.isAvailableAsync.mockResolvedValue(true);
  Sharing.shareAsync.mockResolvedValue();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

it('previews the public passport only, with just the site address on the card', async () => {
  await renderModal();

  expect(getUserPassport).toHaveBeenCalledWith('user-1', { publicView: true });
  expect(screen.getByText('@jane')).toBeTruthy();
  expect(screen.getByText('tobeatraveller.test')).toBeTruthy();
  expect(screen.getByText('passport.sharePublicOnly')).toBeTruthy();
});

// As in the passport: each flag in its ink stamp, with the country's name.
it("stamps each country on the card with its flag and its name in the user's language", async () => {
  await renderModal();

  expect(screen.getByText('🇪🇸')).toBeTruthy();
  expect(screen.getByText('ESPAÑA')).toBeTruthy();
});

// Same events as the web, so the sharing funnel covers both.
it('records opening the sheet and sharing, with where it was opened from and what went out', async () => {
  render(<PassportShareModal userId="user-1" visible onClose={jest.fn()} source="profile" />);
  await act(async () => {});

  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(trackEvent).toHaveBeenCalledWith('passport_share_opened', { source: 'profile' });
  expect(trackEvent).toHaveBeenCalledWith('passport_shared', {
    method: 'share_sheet', source: 'profile', with_achievements: false, with_private: false, countries: 1, stamps: 0,
  });
});

// The share sheet only takes the image, and a link in a picture can't be
// tapped: the link goes to the clipboard, for an Instagram link sticker.
it("copies the link, with the owner's referral code, before opening the share sheet", async () => {
  await renderModal();

  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://tobeatraveller.test/profile/user-1/passport?ref=jane');
  expect(Clipboard.setStringAsync.mock.invocationCallOrder[0]).toBeLessThan(Sharing.shareAsync.mock.invocationCallOrder[0]);
  expect(screen.getByText('passport.linkHint')).toBeTruthy();
});

it('tells the owner what they win when someone signs up from their link, only if the link credits them', async () => {
  await renderModal();
  expect(screen.getByText('passport.shareReward')).toBeTruthy();
});

it('does not promise the reward when the referral code cannot be loaded', async () => {
  getMyReferralInfo.mockRejectedValue(new Error('offline'));
  await renderModal();
  expect(screen.queryByText('passport.shareReward')).toBeNull();
});

it('does not let the owner share before the referral code is known', async () => {
  getMyReferralInfo.mockReturnValue(new Promise(() => {}));
  await renderModal();

  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(captureRef).not.toHaveBeenCalled();
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

it('still shares, with a link without referral code, when the code cannot be loaded', async () => {
  getMyReferralInfo.mockRejectedValue(new Error('offline'));
  await renderModal();

  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://tobeatraveller.test/profile/user-1/passport');
  expect(Sharing.shareAsync).toHaveBeenCalled();
});

it('opens with the achievements on when asked, as from a badge notification', async () => {
  render(<PassportShareModal userId="user-1" visible onClose={jest.fn()} initialIncludeAchievements />);
  await act(async () => {});

  expect(screen.getByLabelText('passport.shareIncludeAchievements').props.value).toBe(true);
  expect(screen.getByText('🧭')).toBeTruthy();
});

it('shows only the countries by default, and adds the achievements when included', async () => {
  await renderModal();

  expect(screen.getByLabelText('passport.shareIncludeAchievements').props.value).toBe(false);
  expect(screen.queryByText('🧭')).toBeNull();

  await act(async () => { fireEvent(screen.getByLabelText('passport.shareIncludeAchievements'), 'valueChange', true); });

  expect(screen.getByText('🧭')).toBeTruthy();
  expect(getUserPassport).toHaveBeenCalledTimes(1);
});

it('keeps the achievements on, and not switchable, when there are no countries to show', async () => {
  getUserPassport.mockResolvedValue({ ...PUBLIC_PASSPORT, countries: [] });
  await renderModal();

  const toggle = screen.getByLabelText('passport.shareIncludeAchievements');
  expect(toggle.props.value).toBe(true);
  expect(toggle.props.disabled).toBe(true);
  expect(screen.getByText('🧭')).toBeTruthy();
});

it('rebuilds the card from the full passport, with a warning, when the owner includes private ones', async () => {
  await renderModal();

  await act(async () => { fireEvent(screen.getByLabelText('passport.shareIncludePrivate'), 'valueChange', true); });

  expect(getUserPassport).toHaveBeenLastCalledWith('user-1', { publicView: false });
  expect(screen.getByText('passport.shareIncludesPrivate')).toBeTruthy();
});

it('goes back to public countries only the next time it opens', async () => {
  const { rerender } = render(<PassportShareModal userId="user-1" visible onClose={jest.fn()} />);
  await act(async () => {});
  await act(async () => { fireEvent(screen.getByLabelText('passport.shareIncludePrivate'), 'valueChange', true); });
  await act(async () => { fireEvent(screen.getByLabelText('passport.shareIncludeAchievements'), 'valueChange', true); });

  rerender(<PassportShareModal userId="user-1" visible={false} onClose={jest.fn()} />);
  rerender(<PassportShareModal userId="user-1" visible onClose={jest.fn()} />);
  await act(async () => {});

  expect(getUserPassport).toHaveBeenLastCalledWith('user-1', { publicView: true });
  expect(screen.getByText('passport.sharePublicOnly')).toBeTruthy();
  expect(screen.getByLabelText('passport.shareIncludeAchievements').props.value).toBe(false);
});

it('captures the card as a PNG and opens the share sheet with it', async () => {
  await renderModal();

  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(captureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ format: 'png', result: 'tmpfile' }));
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/passport.png', expect.objectContaining({ mimeType: 'image/png' }));
});

it('tells the user when the device cannot share', async () => {
  Sharing.isAvailableAsync.mockResolvedValue(false);
  await renderModal();

  await act(async () => { fireEvent.press(screen.getByText('passport.shareImage')); });

  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('passport.shareError');
});

it('shows an error when the passport cannot be loaded', async () => {
  getUserPassport.mockRejectedValue(new Error('offline'));
  await renderModal();

  expect(screen.getAllByText('passport.shareError').length).toBeGreaterThan(0);
});
