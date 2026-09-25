jest.mock('react-i18next', () => {
  const t = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);
  return { useTranslation: () => ({ t, i18n: { language: 'es' } }) };
});

jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/badges.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/countries.js'),
}));

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AchievementCelebration from '../../components/AchievementCelebration';

const COUNTRY = { notificationId: 'n1', moment: { kind: 'country', code: 'IT' } };
const BADGE = { notificationId: 'n2', moment: { kind: 'badge', code: 'explorer' } };

const renderCelebration = async (props = {}) => {
  const handlers = { onDismiss: jest.fn(), onShare: jest.fn() };
  render(<AchievementCelebration celebration={COUNTRY} position={1} total={1} {...handlers} {...props} />);
  await act(async () => {});
  return handlers;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

it("stamps the new country's flag and name on screen", async () => {
  await renderCelebration();

  expect(screen.getByText('passport.celebrationCountryTitle')).toBeTruthy();
  // Decorative for screen readers, which read the name instead.
  expect(screen.getByText('🇮🇹', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('Italia')).toBeTruthy();
});

it("stamps a new badge's emoji and name", async () => {
  await renderCelebration({ celebration: BADGE });

  expect(screen.getByText('passport.celebrationBadgeTitle')).toBeTruthy();
  expect(screen.getByText('🧭', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('badges.explorer.name')).toBeTruthy();
});

it('goes away on continue, and hands over what to share on share', async () => {
  const { onDismiss, onShare } = await renderCelebration();

  fireEvent.press(screen.getByText('passport.celebrationContinue'));
  fireEvent.press(screen.getByText('passport.celebrationShare'));

  expect(onDismiss).toHaveBeenCalled();
  expect(onShare).toHaveBeenCalledWith(COUNTRY);
});

it('says how many are left when several arrived together, and not for a single one', async () => {
  await renderCelebration({ position: 2, total: 3 });
  expect(screen.getByText('passport.celebrationProgress:{"current":2,"total":3}')).toBeTruthy();

  screen.unmount();
  await renderCelebration();
  expect(screen.queryByText(/passport.celebrationProgress/)).toBeNull();
});

it('still shows everything with reduced motion', async () => {
  AccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);

  await renderCelebration();

  expect(screen.getByText('Italia')).toBeTruthy();
  expect(screen.getByText('passport.celebrationShare')).toBeTruthy();
});
