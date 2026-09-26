let mockUser = { id: 'user-1', isPremium: false, isTrialEligible: true };

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-redux', () => ({ useSelector: (selector) => selector(), useDispatch: () => jest.fn() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key), i18n: { language: 'es' } }),
}));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/constants/premiumFeatures.js'),
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  selectIsAuthenticated: () => true,
  selectMe: () => mockUser,
  selectAuthUser: () => mockUser,
  createCheckoutSession: jest.fn(),
  createPortalSession: jest.fn(),
  getMySubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  setUserInfo: jest.fn(),
}));

import { render, screen } from '@testing-library/react-native';
import SubscriptionScreen from '../../screens/subscription/SubscriptionScreen';

const renderScreen = () => render(<SubscriptionScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);

beforeEach(() => {
  mockUser = { id: 'user-1', isPremium: false, isTrialEligible: true };
});

// Either plan starts with the free trial the first time.
it('offers the free trial on both plans to someone who never subscribed', () => {
  renderScreen();

  expect(screen.getAllByText('subscription.ctaStartTrial')).toHaveLength(2);
});

it('offers to subscribe once the trial has been used', () => {
  mockUser = { ...mockUser, isTrialEligible: false };
  renderScreen();

  expect(screen.getAllByText('subscription.ctaSubscribe')).toHaveLength(2);
});

// The tools free accounts can use a little show their limit, not "Premium".
it('compares the plans with the free limits', () => {
  renderScreen();

  expect(screen.getAllByText('subscription.compareUpTo:10')).toHaveLength(3);
  expect(screen.getAllByText('subscription.compareUnlimited')).toHaveLength(3);
  expect(screen.getByText('subscription.featurePackingChecklistTitle')).toBeTruthy();
  expect(screen.queryByText('subscription.featureNoAdsTitle')).toBeNull();
});
