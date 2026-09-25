jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/celebrations.js'),
  fetchNotifications: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { fetchNotifications } from '@tobeatraveller/shared';
import { useAchievementCelebrations } from '../../hooks/useAchievementCelebrations';

const badge = (id, badgeId) => ({ id, type: 'badge_earned', isRead: false, badgeId, countryCode: null });
const stamp = (id, countryCode) => ({ id, type: 'country_stamp', isRead: false, badgeId: null, countryCode });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

it('celebrates the new badges and countries among the unread notifications, the oldest first', async () => {
  fetchNotifications.mockResolvedValue({ notifications: [badge('n2', 'countries_5'), stamp('n1', 'PT')] });

  const { result } = await renderHook(() => useAchievementCelebrations('user-1', 2));

  await waitFor(() => expect(result.current.celebration).not.toBeNull());
  expect(result.current.celebration.moment).toEqual({ kind: 'country', code: 'PT' });
  expect(result.current).toMatchObject({ position: 1, total: 2 });

  await act(async () => result.current.dismiss());
  expect(result.current.celebration.moment).toEqual({ kind: 'badge', code: 'countries_5' });
  await act(async () => result.current.dismiss());
  expect(result.current.celebration).toBeNull();
});

it('does not celebrate again what this device already celebrated', async () => {
  fetchNotifications.mockResolvedValue({ notifications: [stamp('n1', 'PT')] });
  const first = await renderHook(() => useAchievementCelebrations('user-1', 1));
  await waitFor(() => expect(first.result.current.celebration).not.toBeNull());
  await waitFor(async () => expect(await AsyncStorage.getItem('celebrated_notifications')).toBe('["n1"]'));
  first.unmount();

  const { result } = await renderHook(() => useAchievementCelebrations('user-1', 1));

  await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(2));
  await act(async () => {});
  expect(result.current.celebration).toBeNull();
});

it('drops the remaining celebrations at once, when the user goes to share one', async () => {
  fetchNotifications.mockResolvedValue({ notifications: [badge('n2', 'countries_5'), stamp('n1', 'PT')] });
  const { result } = await renderHook(() => useAchievementCelebrations('user-1', 2));
  await waitFor(() => expect(result.current.celebration).not.toBeNull());

  await act(async () => result.current.dismissAll());

  expect(result.current.celebration).toBeNull();
});

it('does not ask for notifications while signed out or with nothing unread', async () => {
  await renderHook(() => useAchievementCelebrations(null, 3));
  await renderHook(() => useAchievementCelebrations('user-1', 0));

  expect(fetchNotifications).not.toHaveBeenCalled();
});

it('shows nothing when the notifications fail to load', async () => {
  fetchNotifications.mockRejectedValue(new Error('offline'));

  const { result } = await renderHook(() => useAchievementCelebrations('user-1', 1));

  await waitFor(() => expect(fetchNotifications).toHaveBeenCalled());
  expect(result.current.celebration).toBeNull();
});

// Opened from its push, the card of that country is already on screen:
// celebrating it on top would stack two modals.
it('skips the celebration of a moment whose card the user is already opening, and does not bring it back', async () => {
  fetchNotifications.mockResolvedValue({ notifications: [badge('n2', 'countries_5'), stamp('n1', 'PT')] });
  const { result } = await renderHook(() => useAchievementCelebrations('user-1', 2));

  await act(async () => result.current.skip({ kind: 'country', code: 'PT' }));

  await waitFor(() => expect(result.current.celebration).not.toBeNull());
  expect(result.current.celebration.moment).toEqual({ kind: 'badge', code: 'countries_5' });
  expect(result.current.total).toBe(1);
  await waitFor(async () => expect(JSON.parse(await AsyncStorage.getItem('celebrated_notifications'))).toEqual(['n1', 'n2']));
});

it('drops an already queued celebration when its card is opened', async () => {
  fetchNotifications.mockResolvedValue({ notifications: [stamp('n1', 'PT')] });
  const { result } = await renderHook(() => useAchievementCelebrations('user-1', 1));
  await waitFor(() => expect(result.current.celebration).not.toBeNull());

  await act(async () => result.current.skip({ kind: 'country', code: 'PT' }));

  expect(result.current.celebration).toBeNull();
});
