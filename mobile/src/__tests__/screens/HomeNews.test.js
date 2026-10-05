const mockDispatch = jest.fn();
let mockNotifications = [];

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => callback(), [callback]); } };
});
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('../../components/NotificationRow', () => {
  const { Text } = require('react-native');
  return ({ notification }) => <Text>{`row ${notification.id}`}</Text>;
});
jest.mock('@tobeatraveller/shared', () => ({
  initNotifications: () => 'init-notifications',
  selectNotifications: () => mockNotifications,
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import HomeNews from '../../components/HomeNews';

const note = (id, isRead) => ({ id, isRead });

beforeEach(() => {
  jest.clearAllMocks();
  mockNotifications = [];
});

it('reads the notifications, without opening them (which would mark them as seen)', () => {
  render(<HomeNews navigation={{ navigate: jest.fn() }} />);

  expect(mockDispatch).toHaveBeenCalledWith('init-notifications');
});

it('shows what they have not seen, with the way to all of it', () => {
  mockNotifications = [note('a', false), note('b', true)];
  const navigation = { navigate: jest.fn() };
  render(<HomeNews navigation={navigation} />);

  expect(screen.getByText('row a')).toBeTruthy();
  expect(screen.queryByText('row b')).toBeNull();
  fireEvent.press(screen.getByText('common.seeAll'));
  expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
});

it('shows no more than three, so it stays a glance', () => {
  mockNotifications = ['a', 'b', 'c', 'd', 'e'].map((id) => note(id, false));
  render(<HomeNews navigation={{ navigate: jest.fn() }} />);

  expect(screen.getAllByText(/^row /)).toHaveLength(3);
});

// Regression-in-waiting: an empty "news" box says nothing and takes the space of what does.
it('is left out when there is nothing new', () => {
  mockNotifications = [note('a', true)];
  render(<HomeNews navigation={{ navigate: jest.fn() }} />);

  expect(screen.queryByText('home.newsTitle')).toBeNull();
});
