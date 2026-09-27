const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: () => null, Marker: () => null, Polyline: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../../utils/config', () => ({ WEB_URL: 'https://example.com' }));
jest.mock('@tobeatraveller/shared', () => ({
  addComment: jest.fn(), addFavorite: jest.fn(), checkIsFavorite: jest.fn(() => Promise.resolve(false)),
  checkIsLiked: jest.fn(() => Promise.resolve({ isLiked: false, likesCount: 0 })), deleteComment: jest.fn(),
  deleteItinerary: jest.fn(() => Promise.resolve()), getCommentsByItineraryId: jest.fn(() => Promise.resolve([])),
  getItineraryById: jest.fn(), getUserById: jest.fn(() => Promise.resolve({ id: 'u1', username: 'tbat' })),
  removeFavorite: jest.fn(), toggleLike: jest.fn(),
  selectIsAuthenticated: () => true, selectMe: () => ({ id: 'u1', username: 'tbat' }),
  MAX_COMMENT_LENGTH: 500, updateCommentsCount: jest.fn(),
  setUserInfo: (id) => ({ type: 'load-me', id }), setUserInfoItineraries: () => ({ type: 'load-my-trips' }),
  COMMENT_HIGHLIGHT_DURATION_MS: 1000, formatBudgetAmount: () => '500 €', formatTimeAgo: () => '',
  tripCategoryLabelKey: () => 'tripCategories.other', ANALYTICS_EVENTS: {},
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
}));

import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { deleteItinerary, getItineraryById } from '@tobeatraveller/shared';
import ItineraryScreen from '../../screens/itinerary/ItineraryScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const TRIP = {
  id: 't1', userId: 'u1', title: 'Algarve', location: { name: 'Portugal' }, places: [], images: [],
  startDate: '2026-10-02', endDate: '2026-10-04', tripTotalDays: 3, budget: 500, currency: 'EUR', numberOfPeople: 2, category: 'other',
};

// Regression: after deleting a trip the list of one's own trips (the home
// card, the profile) still had it.
it('reloads the list of my trips after deleting one', async () => {
  getItineraryById.mockResolvedValue(TRIP);
  const alertSpy = jest.spyOn(Alert, 'alert');
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ItineraryScreen route={{ params: { id: 't1' } }} navigation={navigation} />
    </SafeAreaProvider>
  );
  await act(async () => {});

  fireEvent.press(screen.getByLabelText('common.moreOptions'));
  const deleteChoice = alertSpy.mock.calls.at(-1)[2].find((button) => button.style === 'destructive');
  act(() => deleteChoice.onPress());
  const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.style === 'destructive');
  await act(async () => { await confirm.onPress(); });

  expect(deleteItinerary).toHaveBeenCalledWith('t1');
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'load-my-trips' });
  expect(navigation.goBack).toHaveBeenCalled();
});
