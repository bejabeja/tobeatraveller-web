jest.mock('react-i18next', () => {
  const t = (key, vars) => (vars?.count != null ? `${key}:${vars.count}` : key);
  return { useTranslation: () => ({ t, i18n: { language: 'es' } }) };
});

jest.mock('@tobeatraveller/shared', () => {
  const countries = jest.requireActual('../../../../shared/src/utils/constants/countries.js');
  return { ...countries, updateMyDeclaredCountries: jest.fn() };
});

import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { updateMyDeclaredCountries } from '@tobeatraveller/shared';
import CountryPickerModal from '../../components/CountryPickerModal';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderPicker = (props = {}) => render(
  <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
    <CountryPickerModal visible onClose={jest.fn()} onSaved={jest.fn()} {...props} />
  </SafeAreaProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  updateMyDeclaredCountries.mockResolvedValue();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

it('finds a country by name ignoring accents, marks it and saves the whole list', async () => {
  const onSaved = jest.fn();
  renderPicker({ initialSelected: ['PT'], onSaved });

  fireEvent.changeText(screen.getByLabelText('passport.pickerSearch'), 'japon');
  fireEvent.press(screen.getByLabelText('Japón'));
  await act(async () => { fireEvent.press(screen.getByText('passport.pickerSave')); });

  expect(updateMyDeclaredCountries).toHaveBeenCalledWith(['PT', 'JP']);
  expect(onSaved).toHaveBeenCalled();
});

it('shows earned countries as marked but not selectable', () => {
  renderPicker({ lockedCodes: ['ES'] });

  fireEvent.changeText(screen.getByLabelText('passport.pickerSearch'), 'espana');

  expect(screen.getByLabelText('España').props.accessibilityState).toEqual({ checked: true, disabled: true });
  expect(screen.getByText('passport.pickerSelected:1')).toBeTruthy();
});

it('tells the user when saving fails, and stays open', async () => {
  updateMyDeclaredCountries.mockRejectedValue(new Error('offline'));
  const onSaved = jest.fn();
  renderPicker({ onSaved });

  await act(async () => { fireEvent.press(screen.getByText('passport.pickerSave')); });

  expect(Alert.alert).toHaveBeenCalledWith('passport.pickerSaveError');
  expect(onSaved).not.toHaveBeenCalled();
});
