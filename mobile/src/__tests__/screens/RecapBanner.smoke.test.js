jest.mock('react-i18next', () => {
  const t = (key) => key;
  return { useTranslation: () => ({ t }) };
});

jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/recap.js'));

import { fireEvent, render, screen } from '@testing-library/react-native';
import RecapBanner from '../../components/RecapBanner';

afterEach(() => jest.useRealTimers());

it('leads to the recap in December and January', () => {
  jest.useFakeTimers().setSystemTime(new Date('2027-01-10T10:00:00Z'));
  const onPress = jest.fn();

  render(<RecapBanner onPress={onPress} />);
  fireEvent.press(screen.getByText('recap.bannerTitle'));

  expect(onPress).toHaveBeenCalled();
});

it('is not shown out of season', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-25T10:00:00Z'));

  render(<RecapBanner onPress={jest.fn()} />);

  expect(screen.queryByText('recap.bannerTitle')).toBeNull();
});
