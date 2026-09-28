jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children ?? null }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  ANALYTICS_EVENTS: {},
  checkIsLiked: jest.fn(() => Promise.resolve({ isLiked: false, likesCount: 2 })),
  toggleLike: jest.fn(),
  selectIsAuthenticated: () => true,
}));

import { Image } from 'react-native';
import { toggleLike } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ItineraryCard from '../../components/ItineraryCard';

const TRIP = { id: 't1', title: 'Algarve', location: { name: 'Portugal' }, tripTotalDays: 3, budget: '500.00', currency: 'EUR', likesCount: 2, commentsCount: 0 };

// Regression: the budget read "500.00 EUR" whatever the language.
const renderCard = async (itinerary = TRIP) => {
  render(<ItineraryCard itinerary={itinerary} onPress={jest.fn()} />);
  await act(async () => {});
};

it('writes the budget the way the app language does', async () => {
  await renderCard();

  expect(screen.getByText(/^500\s€$/)).toBeTruthy();
});

// Regression: without a photo it loaded an image from another site, which
// drew a "?" (and nothing at all offline).
it('fetches no image for a trip without a photo', async () => {
  await renderCard({ ...TRIP, photoUrl: null });

  expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
});

// Regression: a screen reader read the card as one button, so its like
// button inside couldn't be reached.
it('lets a screen reader like the trip from the card', async () => {
  toggleLike.mockResolvedValue({ isLiked: true, likesCount: 3 });
  await renderCard();

  await act(async () => { fireEvent(screen.getByRole('button', { name: /Algarve/ }), 'accessibilityAction', { nativeEvent: { actionName: 'like' } }); });

  expect(toggleLike).toHaveBeenCalledWith('t1');
});

