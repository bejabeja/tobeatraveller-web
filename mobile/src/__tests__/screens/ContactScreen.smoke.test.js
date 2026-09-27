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
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ContactScreen from '../../screens/contact/ContactScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

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
