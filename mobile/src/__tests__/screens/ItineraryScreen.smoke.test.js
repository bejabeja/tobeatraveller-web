const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: () => null, Marker: () => null, Polyline: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children }));
jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../../components/TripListsSection', () => () => null);
jest.mock('../../utils/config', () => ({ WEB_URL: 'https://example.com' }));
jest.mock('@tobeatraveller/shared', () => ({
  addComment: jest.fn(), addFavorite: jest.fn(), checkIsFavorite: jest.fn(() => Promise.resolve(false)),
  checkIsLiked: jest.fn(() => Promise.resolve({ isLiked: false, likesCount: 0 })), deleteComment: jest.fn(),
  cloneItinerary: jest.fn(), deleteItinerary: jest.fn(() => Promise.resolve()), getCommentsPage: jest.fn(() => Promise.resolve({ comments: [], totalCount: 0 })), COMMENTS_PAGE_SIZE: 50,
  getItineraryById: jest.fn(), getUserById: jest.fn(() => Promise.resolve({ id: 'u1', username: 'tbat' })),
  removeFavorite: jest.fn(), toggleLike: jest.fn(),
  selectIsAuthenticated: () => true, selectMe: () => ({ id: 'u1', username: 'tbat' }),
  MAX_COMMENT_LENGTH: 500, updateCommentsCount: jest.fn(),
  setUserInfo: (id) => ({ type: 'load-me', id }), setUserInfoItineraries: () => ({ type: 'load-my-trips' }),
  COMMENT_HIGHLIGHT_DURATION_MS: 1000, formatBudgetAmount: () => '500 €', formatTimeAgo: () => '',
  formatTripDates: jest.requireActual('../../../../shared/src/utils/formatLocale.js').formatTripDates,
  tripCategoryLabelKey: () => 'tripCategories.other',
  ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
}));

import { Alert, Share } from 'react-native';
import { trackEvent } from '../../utils/analytics';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { cloneItinerary, deleteItinerary, getCommentsPage, getItineraryById } from '@tobeatraveller/shared';
import ItineraryScreen from '../../screens/itinerary/ItineraryScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const TRIP = {
  id: 't1', userId: 'u1', title: 'Algarve', location: { name: 'Portugal' }, places: [], images: [],
  startDate: '2026-10-02', endDate: '2026-10-04', tripTotalDays: 3, budget: 500, currency: 'EUR', numberOfPeople: 2, category: 'other',
};

const renderTrip = async (navigation = { navigate: jest.fn(), goBack: jest.fn() }) => {
  getItineraryById.mockResolvedValue(TRIP);
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ItineraryScreen route={{ params: { id: 't1' } }} navigation={navigation} />
    </SafeAreaProvider>
  );
  await act(async () => {});
  return navigation;
};

// Regression: the dates came from the API written in English for everyone.
it('writes the trip dates in the app language', async () => {
  await renderTrip();

  expect(await screen.findByText(/2.4 oct 2026/)).toBeTruthy();
});

// Regression: a failed load of the comments looked the same as a trip with none, and the web already lets it be retried.
it('says the comments could not be loaded, and loads them again on request, instead of saying there are none', async () => {
  getCommentsPage.mockRejectedValueOnce(new Error('offline'));
  await renderTrip();

  expect(screen.getByText('comments.loadFailed')).toBeTruthy();
  expect(screen.queryByText('comments.beFirst')).toBeNull();

  const callsBeforeRetry = getCommentsPage.mock.calls.length;
  getCommentsPage.mockResolvedValueOnce({ comments: [], totalCount: 0 });
  await act(async () => { fireEvent.press(screen.getByText('common.retry')); });

  expect(screen.queryByText('comments.loadFailed')).toBeNull();
  expect(getCommentsPage).toHaveBeenCalledTimes(callsBeforeRetry + 1);
});

describe('comments by pages', () => {
  const comment = (id) => ({ id, content: `comment ${id}`, postedAgo: '1h', user: { id: 'u9', username: 'ana' } });

  it('counts all of them, offers the rest, and loads them from where the list ends without repeating any', async () => {
    getCommentsPage.mockResolvedValueOnce({ comments: [comment('c1'), comment('c2')], totalCount: 3 });
    await renderTrip();
    expect(screen.getByText('comments.title (3)')).toBeTruthy();

    getCommentsPage.mockResolvedValueOnce({ comments: [comment('c2'), comment('c3')], totalCount: 3 });
    await act(async () => { fireEvent.press(screen.getByText('common.loadMore')); });

    expect(getCommentsPage).toHaveBeenLastCalledWith('t1', expect.objectContaining({ offset: 2 }));
    expect(screen.getByText('comment c3')).toBeTruthy();
    expect(screen.getAllByText('comment c2')).toHaveLength(1);
    expect(screen.queryByText('common.loadMore')).toBeNull();
  });

  // Regression-in-waiting: a total that promised more than the list had made a link to a comment ask for pages for ever.
  it('stops offering more when a page comes back empty although the total promised more', async () => {
    getCommentsPage.mockResolvedValueOnce({ comments: [comment('c1')], totalCount: 3 });
    await renderTrip();

    getCommentsPage.mockResolvedValueOnce({ comments: [], totalCount: 3 });
    await act(async () => { fireEvent.press(screen.getByText('common.loadMore')); });

    expect(screen.queryByText('common.loadMore')).toBeNull();
    expect(screen.getByText('comment c1')).toBeTruthy();
  });

  it('says it could not load more, and tries again on request', async () => {
    getCommentsPage.mockResolvedValueOnce({ comments: [comment('c1')], totalCount: 2 });
    await renderTrip();

    getCommentsPage.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { fireEvent.press(screen.getByText('common.loadMore')); });
    expect(screen.getByText('comments.loadFailed')).toBeTruthy();

    getCommentsPage.mockResolvedValueOnce({ comments: [comment('c2')], totalCount: 2 });
    await act(async () => { fireEvent.press(screen.getByText('common.retry')); });

    expect(screen.getByText('comment c2')).toBeTruthy();
  });
});

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

  fireEvent.press(await screen.findByLabelText('common.moreOptions'));
  const deleteChoice = alertSpy.mock.calls.at(-1)[2].find((button) => button.style === 'destructive');
  act(() => deleteChoice.onPress());
  const confirm = alertSpy.mock.calls.at(-1)[2].find((button) => button.style === 'destructive');
  await act(async () => { await confirm.onPress(); });

  expect(deleteItinerary).toHaveBeenCalledWith('t1');
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'load-my-trips' });
  expect(navigation.goBack).toHaveBeenCalled();
});

const renderWithoutTrip = async (error) => {
  getItineraryById.mockRejectedValueOnce(error);
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ItineraryScreen route={{ params: { id: 't1' } }} navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

// Regression: any failure, even having no connection, said the trip was not found, as if it had been deleted.
it('says the trip could not be loaded, and lets them try again, when the request fails', async () => {
  await renderWithoutTrip(new Error('Network request failed'));

  expect(screen.getByText('errors.itineraryLoad')).toBeTruthy();
  getItineraryById.mockResolvedValueOnce(TRIP);
  await act(async () => { fireEvent.press(screen.getByText('common.retry')); });

  expect(await screen.findByText('Algarve')).toBeTruthy();
});

it('says the trip was not found, with nothing to retry, when it does not exist or is private', async () => {
  await renderWithoutTrip(new Error('Itinerary not found'));

  expect(screen.getByText('itinerary.itineraryNotFound')).toBeTruthy();
  expect(screen.queryByText('common.retry')).toBeNull();
});

describe('right after publishing a trip', () => {
  const renderJustPublished = async (trip = TRIP, navigation = { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() }) => {
    getItineraryById.mockResolvedValue(trip);
    render(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <ItineraryScreen route={{ params: { id: 't1', justPublished: true } }} navigation={navigation} />
      </SafeAreaProvider>
    );
    await act(async () => {});
    return navigation;
  };

  // Regression-in-waiting: after creating a trip they ended on their profile, with nothing that invited them to send it to anyone.
  it('offers to share the trip, and records it came from that prompt when it is shared', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    await renderJustPublished();

    await act(async () => { fireEvent.press(await screen.findByText('itinerary.publishedShare')); });

    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Algarve' }));
    expect(trackEvent).toHaveBeenCalledWith('trip_shared', { source: 'published_prompt', method: 'native' });
  });

  it('does not count it as shared when they close the share sheet', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
    trackEvent.mockClear();
    await renderJustPublished();

    await act(async () => { fireEvent.press(await screen.findByText('itinerary.publishedShare')); });

    expect(trackEvent).not.toHaveBeenCalledWith('trip_shared', expect.anything());
  });

  it('says a private trip is only theirs and offers to edit it instead of sharing', async () => {
    const navigation = await renderJustPublished({ ...TRIP, isPublic: false });

    expect(screen.getByText('itinerary.createdPrivateTitle')).toBeTruthy();
    expect(screen.queryByText('itinerary.publishedShare')).toBeNull();
    fireEvent.press(screen.getByText('itinerary.createdPrivateEdit'));
    expect(navigation.navigate).toHaveBeenCalledWith('EditItinerary', { id: 't1' });
  });

  it('asks the screen to drop it when dismissed', async () => {
    const navigation = await renderJustPublished();

    fireEvent.press(screen.getByText('itinerary.publishedDismiss'));

    expect(navigation.setParams).toHaveBeenCalledWith({ justPublished: undefined });
  });
});

describe("someone else's trip", () => {
  const OTHERS_TRIP = { ...TRIP, userId: 'u2', title: 'Algarve' };

  const renderOthersTrip = async (navigation = { navigate: jest.fn(), goBack: jest.fn() }) => {
    getItineraryById.mockResolvedValue(OTHERS_TRIP);
    render(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <ItineraryScreen route={{ params: { id: 't1' } }} navigation={navigation} />
      </SafeAreaProvider>
    );
    await act(async () => {});
    return navigation;
  };

  const optionsOf = (alertSpy) => alertSpy.mock.calls.at(-1)[2];

  it('offers to copy it to my trips and to report it, behind the "more" button', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderOthersTrip();

    fireEvent.press(screen.getByLabelText('common.moreOptions'));

    expect(optionsOf(alertSpy).map((option) => option.text)).toEqual(['itinerary.cloneToMyTrips', 'report.button', 'common.cancel']);
  });

  it('opens the copy to edit it before publishing', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    cloneItinerary.mockResolvedValue({ id: 'copy-1', source: 'itinerary' });
    const navigation = await renderOthersTrip();

    fireEvent.press(screen.getByLabelText('common.moreOptions'));
    await act(async () => { await optionsOf(alertSpy).find((option) => option.text === 'itinerary.cloneToMyTrips').onPress(); });

    expect(cloneItinerary).toHaveBeenCalledWith('t1');
    expect(navigation.navigate).toHaveBeenCalledWith('EditItinerary', { id: 'copy-1' });
  });

  it('says the copy failed, and goes nowhere', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    cloneItinerary.mockRejectedValue(new Error('down'));
    const navigation = await renderOthersTrip();

    fireEvent.press(screen.getByLabelText('common.moreOptions'));
    await act(async () => { await optionsOf(alertSpy).find((option) => option.text === 'itinerary.cloneToMyTrips').onPress(); });

    expect(alertSpy).toHaveBeenLastCalledWith('errors.somethingWrong', 'itinerary.cloneFailed');
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe('moderating the comments on my own trip', () => {
  const comment = { id: 'c1', content: 'hello', postedAgo: '1h', user: { id: 'u9', username: 'ana' } };

  it('lets the owner delete a comment someone else left, and still report it', async () => {
    getCommentsPage.mockResolvedValueOnce({ comments: [comment], totalCount: 1 });
    await renderTrip();

    expect(screen.getByLabelText('report.button')).toBeTruthy();
    expect(screen.getByText('✕')).toBeTruthy();
  });
});
