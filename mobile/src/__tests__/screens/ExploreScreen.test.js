const mockDispatch = jest.fn();
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/ItineraryCard', () => () => null);
jest.mock('../../components/WorldMapSection', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return ({ onSelectDestination }) => (
    <TouchableOpacity onPress={() => onSelectDestination('Lisboa')}><Text>world-map</Text></TouchableOpacity>
  );
});
jest.mock('@tobeatraveller/shared', () => ({
  getDestinations: jest.fn(),
  initExploreItineraries: jest.fn((params) => ({ type: 'init-explore', params })),
  itineraryCategories: [],
  loadMoreExploreItineraries: jest.fn(),
  selectExploreItineraries: () => [],
  selectExploreItinerariesLoading: () => false,
  selectExploreItinerariesLoadingMore: () => false,
  selectExplorePage: () => 1,
  selectExploreTotalItems: () => 0,
  selectExploreTotalPages: () => 1,
  formatNumber: (value) => String(value),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getDestinations } from '@tobeatraveller/shared';
import ExploreScreen from '../../screens/explore/ExploreScreen';

const navigation = { navigate: jest.fn() };

const renderExplore = async (params) => {
  const view = render(<ExploreScreen navigation={navigation} route={{ params }} />);
  await act(async () => {});
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
  getDestinations.mockResolvedValue([{ name: 'Lisboa', count: 3, lat: 38.7, lon: -9.1 }]);
});

describe('Explore: the map', () => {
  it('offers the world map to whoever has not searched yet', async () => {
    await renderExplore();

    expect(screen.getByText('world-map')).toBeTruthy();
  });

  it('steps aside once they search, so the results are what they see', async () => {
    await renderExplore({ destination: 'Lisboa' });

    expect(screen.queryByText('world-map')).toBeNull();
  });

  it('searches the destination chosen on the map', async () => {
    await renderExplore();
    jest.useFakeTimers();

    fireEvent.press(screen.getByText('world-map'));
    act(() => { jest.advanceTimersByTime(500); });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'init-explore', params: expect.objectContaining({ destination: 'Lisboa' }) });
    jest.useRealTimers();
  });

  it('does not show a map when there are no destinations to put on it', async () => {
    getDestinations.mockResolvedValue([]);

    await renderExplore();

    expect(screen.queryByText('world-map')).toBeNull();
  });

  // Regression-in-waiting: the screen stays mounted as a tab, so a second destination picked on the Home was never read.
  it('follows a destination that arrives while it is already open', async () => {
    const view = await renderExplore();
    jest.useFakeTimers();

    view.rerender(<ExploreScreen navigation={navigation} route={{ params: { destination: 'Oporto' } }} />);
    act(() => { jest.advanceTimersByTime(500); });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'init-explore', params: expect.objectContaining({ destination: 'Oporto' }) });
    jest.useRealTimers();
  });

  // Regression-in-waiting: after clearing the search, the same pin of the Home did nothing, as the parameter had not changed.
  it('searches again for the same destination when it is asked for again', async () => {
    const view = await renderExplore({ destination: 'Lisboa', requestedAt: 1 });
    fireEvent.press(screen.getByText('explore.clearFilters'));
    jest.useFakeTimers();
    act(() => { jest.advanceTimersByTime(500); });
    mockDispatch.mockClear();

    view.rerender(<ExploreScreen navigation={navigation} route={{ params: { destination: 'Lisboa', requestedAt: 2 } }} />);
    act(() => { jest.advanceTimersByTime(500); });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'init-explore', params: expect.objectContaining({ destination: 'Lisboa' }) });
    jest.useRealTimers();
  });
});
