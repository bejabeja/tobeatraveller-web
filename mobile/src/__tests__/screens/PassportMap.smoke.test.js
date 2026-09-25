jest.mock('react-i18next', () => {
  const t = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);
  return { useTranslation: () => ({ t }) };
});
jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/passportMap.js'));

import { processColor } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import PassportMap from '../../components/PassportMap';

const passport = (overrides) => ({ countries: [], declaredCountries: [], ...overrides });
// react-native-svg keeps colours as native numbers.
const fillOf = (code) => screen.getByTestId(`map-country-${code}`).props.fill.payload;

it('draws the world with the visited countries painted, as one image for screen readers', () => {
  render(<PassportMap passport={passport({ countries: [{ code: 'ES', isPrivate: false }, { code: 'PT', isPrivate: false }] })} />);

  expect(screen.getByLabelText('passport.mapLabel:{"count":2}')).toBeTruthy();
  expect(fillOf('ES')).toBe(processColor('#d9a441'));
  expect(fillOf('IT')).not.toBe(processColor('#d9a441'));
});

it('tells apart the countries only the owner sees and the ones marked by hand, in the legend too', () => {
  render(<PassportMap passport={passport({ countries: [{ code: 'FR', isPrivate: true }], declaredCountries: [{ code: 'JP' }] })} />);

  expect(fillOf('FR')).toBe(processColor('#ecd08f'));
  expect(screen.getByTestId('map-country-JP').props.strokeDasharray).toBeTruthy();
  expect(screen.getByText('passport.mapPrivate')).toBeTruthy();
  expect(screen.getByText('passport.mapDeclared')).toBeTruthy();
  expect(screen.queryByText('passport.mapVisited')).toBeNull();
});

it('marks a visited tiny country with a dot', () => {
  render(<PassportMap passport={passport({ countries: [{ code: 'AD', isPrivate: false }] })} />);

  expect(screen.getByTestId('map-dot-AD')).toBeTruthy();
});
