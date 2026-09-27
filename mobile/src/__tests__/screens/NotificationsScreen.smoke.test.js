let mockNotifications;
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mockDispatch,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@tobeatraveller/shared', () => ({
  BADGE_EMOJI: {},
  PASSPORT_SHARE_MOMENT: 'moment',
  RECAP_SOURCES: {},
  countryFlag: () => '',
  countryName: () => '',
  formatTimeAgo: () => 'hace 1 min',
  loadMoreNotifications: jest.fn(),
  openNotifications: jest.fn(() => 'open-notifications'),
  selectNotifications: () => mockNotifications,
  selectNotificationsError: () => null,
  selectNotificationsLoading: () => false,
  selectNotificationsLoadingMore: () => false,
  selectNotificationsPage: () => 1,
  selectNotificationsTotalPages: () => 1,
}));

import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NotificationsScreen from '../../screens/notifications/NotificationsScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const actor = { id: 'u2', username: 'ana', avatarUrl: null };

const renderScreen = async () => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <NotificationsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

// Regression: opening the screen marked them all as read on screen at once,
// so the new ones could never be told apart.
it('opens the list and shows the new ones under their own heading', async () => {
  mockNotifications = [
    { id: 'n1', type: 'follow', isRead: false, actor, count: 1 },
    { id: 'n2', type: 'follow', isRead: true, actor, count: 1 },
  ];

  await renderScreen();

  expect(mockDispatch).toHaveBeenCalledWith('open-notifications');
  expect(screen.getByText('notifications.new')).toBeTruthy();
  expect(screen.getByText('notifications.earlier')).toBeTruthy();
});

it('gives no headings when nothing is new', async () => {
  mockNotifications = [{ id: 'n2', type: 'follow', isRead: true, actor, count: 1 }];

  await renderScreen();

  expect(screen.queryByText('notifications.new')).toBeNull();
  expect(screen.queryByText('notifications.earlier')).toBeNull();
});
