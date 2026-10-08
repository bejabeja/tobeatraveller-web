import { Alert, Platform } from 'react-native';
import { showAlert } from '../../utils/alert';

const originalOs = Platform.OS;
afterEach(() => {
  Platform.OS = originalOs;
  delete global.window;
  jest.restoreAllMocks();
});

const onWeb = (windowMock) => {
  Platform.OS = 'web';
  global.window = windowMock;
};

const buttons = (onConfirm) => [
  { text: 'Cancel', style: 'cancel' },
  { text: 'Block', style: 'destructive', onPress: onConfirm },
];

it('uses the native alert outside the web', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const list = buttons(jest.fn());

  showAlert('Title', 'Body', list);

  expect(alertSpy).toHaveBeenCalledWith('Title', 'Body', list);
});

it('on the web, runs the confirm button when the browser dialog is accepted', () => {
  const onConfirm = jest.fn();
  onWeb({ confirm: jest.fn(() => true), alert: jest.fn() });

  showAlert('Title', 'Body', buttons(onConfirm));

  expect(onConfirm).toHaveBeenCalled();
});

it('on the web, does nothing when the browser dialog is dismissed', () => {
  const onConfirm = jest.fn();
  onWeb({ confirm: jest.fn(() => false), alert: jest.fn() });

  showAlert('Title', 'Body', buttons(onConfirm));

  expect(onConfirm).not.toHaveBeenCalled();
});

it('on the web, shows a plain message when there is nothing to confirm', () => {
  const windowMock = { confirm: jest.fn(), alert: jest.fn() };
  onWeb(windowMock);

  showAlert('Oops', 'Something went wrong');

  expect(windowMock.alert).toHaveBeenCalledWith('Oops\n\nSomething went wrong');
  expect(windowMock.confirm).not.toHaveBeenCalled();
});
