jest.mock('react-redux', () => ({ useSelector: (selector) => selector() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => `translated:${key}`, i18n: { resolvedLanguage: 'es' } }),
}));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/schemasValidation.js'),
  ...jest.requireActual('../../../../shared/src/utils/validationMessages.js'),
  selectMe: () => null,
  selectAuthUser: () => null,
  sendContact: jest.fn(),
}));

import { sendContact } from '@tobeatraveller/shared';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ContactScreen from '../../screens/contact/ContactScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderScreen = async () => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ContactScreen navigation={{ goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

const fillValidMessage = () => {
  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.namePlaceholder'), 'Ana');
  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.emailPlaceholder'), 'ana@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.subjectPlaceholder'), 'Cobro doble');
  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.messagePlaceholder'), 'Me cobraron dos veces');
};

const send = async () => {
  await act(async () => { fireEvent.press(screen.getByText('translated:contact.send')); });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openURL').mockResolvedValue();
});

// Regression: the messages were English sentences; as keys, shown untranslated
// they would read "validation.messageMin".
it("shows what's wrong in the app's language, and sends nothing", async () => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ContactScreen navigation={{ goBack: jest.fn() }} />
    </SafeAreaProvider>
  );
  await act(async () => {});

  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.namePlaceholder'), 'Ana');
  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.emailPlaceholder'), 'ana@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.subjectPlaceholder'), 'Hola');
  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.messagePlaceholder'), 'Corto');
  await act(async () => { fireEvent.press(screen.getByText('translated:contact.send')); });

  expect(screen.getByText('translated:validation.messageMin')).toBeTruthy();
  expect(sendContact).not.toHaveBeenCalled();
});

it('sends what it is about with the message', async () => {
  sendContact.mockResolvedValue({ message: 'Message sent' });
  await renderScreen();

  fillValidMessage();
  fireEvent.press(screen.getByText('translated:contact.reasonPayment'));
  await send();

  expect(sendContact).toHaveBeenCalledWith({
    name: 'Ana',
    email: 'ana@example.com',
    reason: 'payment',
    subject: 'Cobro doble',
    message: 'Me cobraron dos veces',
    language: 'es',
  });
  expect(screen.getByText('translated:contact.sent')).toBeTruthy();
});

it('asks to pick what it is about before sending', async () => {
  await renderScreen();

  fillValidMessage();
  await send();

  expect(screen.getByText('translated:validation.reasonRequired')).toBeTruthy();
  expect(sendContact).not.toHaveBeenCalled();
});

it('marks the reason picked, and only that one', async () => {
  await renderScreen();

  fireEvent.press(screen.getByText('translated:contact.reasonBug'));

  expect(screen.getByRole('radio', { name: 'translated:contact.reasonBug', checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'translated:contact.reasonIdea', checked: false })).toBeTruthy();
});

it('counts the characters of the message against the limit', async () => {
  await renderScreen();

  fireEvent.changeText(screen.getByPlaceholderText('translated:contact.messagePlaceholder'), 'hola!');

  expect(screen.getByText('5 / 1000')).toBeTruthy();
});

it('offers writing by email from the start', async () => {
  await renderScreen();

  fireEvent.press(screen.getByText('tobeatravellercompany@gmail.com'));

  expect(Linking.openURL).toHaveBeenCalledWith('mailto:tobeatravellercompany@gmail.com');
});

// Regression: the limit answers 429, and "something went wrong" makes people keep retrying into it.
it('says they sent too many messages when the limit is reached', async () => {
  sendContact.mockRejectedValue(Object.assign(new Error('Too many'), { status: 429 }));
  await renderScreen();

  fillValidMessage();
  fireEvent.press(screen.getByText('translated:contact.reasonPayment'));
  await send();

  expect(Alert.alert).toHaveBeenCalledWith(
    'translated:errors.somethingWrong',
    'translated:contact.rateLimited tobeatravellercompany@gmail.com.',
    expect.any(Array),
  );
});

it('says the send failed, and keeps the form, on any other error', async () => {
  sendContact.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
  await renderScreen();

  fillValidMessage();
  fireEvent.press(screen.getByText('translated:contact.reasonPayment'));
  await send();

  expect(Alert.alert.mock.calls[0][1]).toBe('translated:errors.couldNotSend');
  expect(screen.getByDisplayValue('Cobro doble')).toBeTruthy();
});
