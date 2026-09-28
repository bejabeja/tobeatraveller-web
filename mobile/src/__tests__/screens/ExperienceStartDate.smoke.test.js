jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/experienceDates.js'),
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  ...jest.requireActual('../../../../shared/src/utils/nextTrip.js'),
  COLORS: { text: '#111', textSub: '#666', border: '#ddd', accent: '#1A535C' },
}));

jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));

import { fireEvent, render, screen } from '@testing-library/react-native';
import ExperienceStartDate from '../../components/ExperienceStartDate';

it('can be left without a date', () => {
  render(<ExperienceStartDate value="" days={5} onChange={jest.fn()} />);

  expect(screen.queryByText('createExperience.notSureYet')).toBeNull();
  expect(screen.queryByText(/📅/)).toBeNull();
});

it('shows when the experience runs once the day is typed', () => {
  render(<ExperienceStartDate value="2026-10-30" days={5} onChange={jest.fn()} />);

  expect(screen.getByText(/📅/)).toBeTruthy();
  expect(screen.queryByText('createExperience.invalidDate')).toBeNull();
});

it('says how to write the date when the day typed does not exist', () => {
  render(<ExperienceStartDate value="2026-02-30" days={5} onChange={jest.fn()} />);

  expect(screen.getByText('createExperience.invalidDate')).toBeTruthy();
});

it("drops the date when the traveller isn't sure yet", () => {
  const onChange = jest.fn();
  render(<ExperienceStartDate value="2026-10-30" days={5} onChange={onChange} />);

  fireEvent.press(screen.getByText('createExperience.notSureYet'));

  expect(onChange).toHaveBeenCalledWith('');
});
