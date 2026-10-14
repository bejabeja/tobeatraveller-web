jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { language: 'en' },
  changeLanguage: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/constants/languages.js'));

jest.mock('../../utils/styles', () => ({ shadow: () => ({}) }));

import { fireEvent, render, screen } from '@testing-library/react-native';
import AccountMenuButton from '../../components/AccountMenuButton';
import { changeLanguage } from '../../i18n';

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

describe('without a session', () => {
  const renderGuestMenu = () => {
    const navigation = { navigate: jest.fn() };
    render(<AccountMenuButton navigation={navigation} isGuest />);
    fireEvent.press(screen.getByLabelText('nav.menu'));
    return navigation;
  };

  it('offers no tool, plan or settings, which need an account', () => {
    renderGuestMenu();

    ['nav.vanLog', 'nav.supplies', 'nav.subscription', 'referral.accountCardTitle', 'nav.settings']
      .forEach((label) => expect(screen.queryByText(label)).toBeNull());
  });

  it.each([
    ['nav.login', 'Login'],
    ['nav.createAccountBtn', 'Register'],
    ['legalTerms.documentTitle', 'Terms'],
    ['legalPrivacy.documentTitle', 'PrivacyPolicy'],
    ['settings.contactUs', 'Contact'],
  ])('reaches %s without signing in', (label, screenName) => {
    const navigation = renderGuestMenu();

    fireEvent.press(screen.getByText(label));

    expect(navigation.navigate).toHaveBeenCalledWith(screenName);
  });

  it('changes the language from the menu', () => {
    renderGuestMenu();

    fireEvent.press(screen.getByText('settings.language'));
    fireEvent.press(screen.getByText(/Français/));

    expect(changeLanguage).toHaveBeenCalledWith('fr');
  });
});
