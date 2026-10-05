jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key) }) }));
jest.mock('@tobeatraveller/shared', () => ({
  summarizePassport: jest.requireActual('../../../../shared/src/utils/constants/badges.js').summarizePassport,
}));
jest.mock('../../hooks/useUserPassport', () => ({ useUserPassport: jest.fn() }));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { useUserPassport } from '../../hooks/useUserPassport';
import PassportSummary from '../../components/PassportSummary';

const renderCard = (navigation = { navigate: jest.fn() }) => {
  render(<PassportSummary navigation={navigation} userId="u1" />);
  return navigation;
};

it('shows where the passport stands and opens it', () => {
  useUserPassport.mockReturnValue({ passport: { countries: [{ code: 'PT' }, { code: 'ES' }], achievements: [{ id: 'a', earnedAt: '2026-09-01' }, { id: 'b', earnedAt: null }] } });

  const navigation = renderCard();
  fireEvent.press(screen.getByText('passport.countriesCount:2'));

  expect(navigation.navigate).toHaveBeenCalledWith('Passport', { userId: 'u1' });
});

// Regression-in-waiting: it said "no countries yet" to whoever had just arrived, which is no news.
it('is left out while there is nothing in the passport', () => {
  useUserPassport.mockReturnValue({ passport: { countries: [], achievements: [{ id: 'a', earnedAt: null }] } });

  renderCard();

  expect(screen.queryByText('passport.title', { exact: false })).toBeNull();
});

it('is left out while the passport has not loaded', () => {
  useUserPassport.mockReturnValue({ passport: null });

  renderCard();

  expect(screen.queryByText('passport.title', { exact: false })).toBeNull();
});
