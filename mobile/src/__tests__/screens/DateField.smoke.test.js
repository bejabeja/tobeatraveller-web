jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  ...jest.requireActual('../../../../shared/src/utils/nextTrip.js'),
  COLORS: { primary: '#E8743B' },
}));
let mockPickedDate;
jest.mock('@react-native-community/datetimepicker', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onValueChange }) => <Text onPress={() => onValueChange({}, mockPickedDate)}>native picker</Text>,
    DateTimePickerAndroid: { open: jest.fn(({ onValueChange }) => onValueChange({}, mockPickedDate)) },
  };
});

import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import DateField from '../../components/DateField';

const originalOS = Platform.OS;
afterEach(() => { Platform.OS = originalOS; });

it('shows the day chosen in the app language, and asks for one when there is none', () => {
  Platform.OS = 'ios';
  const { rerender } = render(<DateField value="" onChange={jest.fn()} accessibilityLabel="Salida" />);
  expect(screen.getByText('common.pickDate')).toBeTruthy();

  rerender(<DateField value="2026-10-30" onChange={jest.fn()} accessibilityLabel="Salida" />);

  expect(screen.getByText(/30/)).toBeTruthy();
});

// Read in UTC, a late-evening date would turn into the next day.
it('passes on the calendar day picked on iOS, in local time', () => {
  Platform.OS = 'ios';
  mockPickedDate = new Date(2026, 9, 30, 23, 30);
  const onChange = jest.fn();
  render(<DateField value="" onChange={onChange} accessibilityLabel="Salida" />);

  fireEvent.press(screen.getByLabelText('Salida'));
  fireEvent.press(screen.getByText('native picker'));

  expect(onChange).toHaveBeenCalledWith('2026-10-30');
});

it("opens Android's own date dialog and passes on the day picked", () => {
  Platform.OS = 'android';
  mockPickedDate = new Date(2026, 0, 5);
  const onChange = jest.fn();
  render(<DateField value="2026-01-01" onChange={onChange} minimumDate="2026-01-01" accessibilityLabel="Salida" />);

  fireEvent.press(screen.getByLabelText('Salida'));

  expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(expect.objectContaining({ mode: 'date', minimumDate: new Date(2026, 0, 1) }));
  expect(onChange).toHaveBeenCalledWith('2026-01-05');
});

it('lets the day be typed on the web build, where there is no picker', () => {
  Platform.OS = 'web';
  const onChange = jest.fn();
  render(<DateField value="" onChange={onChange} accessibilityLabel="Salida" />);

  fireEvent.changeText(screen.getByPlaceholderText('common.datePlaceholder'), '2026-10-30');

  expect(onChange).toHaveBeenCalledWith('2026-10-30');
});
