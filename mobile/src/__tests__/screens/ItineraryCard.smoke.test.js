jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children ?? null }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  ANALYTICS_EVENTS: {},
  checkIsLiked: jest.fn(),
  toggleLike: jest.fn(),
  selectIsAuthenticated: () => false,
}));

import { Image } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import ItineraryCard from '../../components/ItineraryCard';

const TRIP = { id: 't1', title: 'Algarve', location: { name: 'Portugal' }, tripTotalDays: 3, budget: '500.00', currency: 'EUR', likesCount: 2, commentsCount: 0 };

// Regression: the budget read "500.00 EUR" whatever the language.
it('writes the budget the way the app language does', () => {
  render(<ItineraryCard itinerary={TRIP} onPress={jest.fn()} />);

  expect(screen.getByText(/^500\s€$/)).toBeTruthy();
});

// Regression: without a photo it loaded an image from another site, which
// drew a "?" (and nothing at all offline).
it('fetches no image for a trip without a photo', () => {
  render(<ItineraryCard itinerary={{ ...TRIP, photoUrl: null }} onPress={jest.fn()} />);

  expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
});
