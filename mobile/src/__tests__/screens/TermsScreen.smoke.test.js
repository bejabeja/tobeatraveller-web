jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/parseRichText.js'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => {
      if (key === 'legalTerms.subscriptionsWithdrawal') return ['<a href="/contact">contact page</a>'];
      return vars?.returnObjects ? [`${key}#1`] : key;
    },
  }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import TermsScreen from '../../screens/legal/TermsScreen';

const navigate = jest.fn();
const renderScreen = () => render(<TermsScreen navigation={{ navigate, goBack: jest.fn() }} />);

// The terms said nothing about paying: what is charged, the automatic renewal
// and the right of withdrawal the checkout asks the customer to give up.
describe('TermsScreen', () => {
  beforeEach(() => navigate.mockClear());

  it('explains how content is reported and moderated', () => {
    renderScreen();

    expect(screen.getByText('legalTerms.moderationTitle')).toBeTruthy();
    expect(screen.getByText('legalTerms.moderationBody#1')).toBeTruthy();
  });

  it('explains the Premium subscription', () => {
    renderScreen();

    expect(screen.getByText('legalTerms.subscriptionsTitle')).toBeTruthy();
    expect(screen.getByText('legalTerms.subscriptionsIntro')).toBeTruthy();
    expect(screen.getByText('legalTerms.subscriptionsItems#1')).toBeTruthy();
  });

  it('opens the contact screen from the way to exercise the right of withdrawal', () => {
    renderScreen();

    fireEvent.press(screen.getByText('contact page'));

    expect(navigate).toHaveBeenCalledWith('Contact');
  });
});
