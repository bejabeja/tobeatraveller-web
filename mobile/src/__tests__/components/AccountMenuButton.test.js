jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../utils/styles', () => ({ shadow: () => ({}) }));

import { fireEvent, render, screen } from '@testing-library/react-native';
import AccountMenuButton from '../../components/AccountMenuButton';

const renderButton = () => {
  const navigation = { navigate: jest.fn() };
  render(<AccountMenuButton navigation={navigation} />);
  return navigation;
};

it('keeps the menu closed until the button is pressed', () => {
  renderButton();

  expect(screen.queryByText('nav.subscription')).toBeNull();

  fireEvent.press(screen.getByLabelText('nav.menu'));

  expect(screen.getByText('nav.subscription')).toBeTruthy();
});

it.each([
  ['nav.vanLog', 'VanLog'],
  ['nav.supplies', 'Supplies'],
  ['nav.packingChecklist', 'PackingChecklist'],
  ['nav.lifeDiary', 'LifeDiary'],
  ['nav.subscription', 'Subscription'],
  ['referral.accountCardTitle', 'Referral'],
  ['nav.settings', 'Settings'],
])('reaches %s from the menu', (label, screenName) => {
  const navigation = renderButton();
  fireEvent.press(screen.getByLabelText('nav.menu'));

  fireEvent.press(screen.getByText(label));

  expect(navigation.navigate).toHaveBeenCalledWith(screenName);
  expect(screen.queryByText(label)).toBeNull();
});
