import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../shared/src/locales/en.json';
import es from '../../shared/src/locales/es.json';
import fr from '../../shared/src/locales/fr.json';
import it from '../../shared/src/locales/it.json';
import de from '../../shared/src/locales/de.json';
import { DEFAULT_APP_LANGUAGE, SUPPORTED_APP_LANGUAGES } from '@tobeatraveller/shared';

// expo-localization is native-only; fall back to navigator.language on web
let deviceLang = 'en';
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const { getLocales } = require('expo-localization');
  deviceLang = getLocales()[0]?.languageCode ?? 'en';
} catch {
  if (typeof navigator !== 'undefined') {
    deviceLang = navigator.language?.split('-')[0] ?? 'en';
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en }, fr: { translation: fr }, it: { translation: it }, de: { translation: de } },
    lng: deviceLang,
    fallbackLng: DEFAULT_APP_LANGUAGE,
    supportedLngs: SUPPORTED_APP_LANGUAGES,
    interpolation: { escapeValue: false },
  });

export const changeLanguage = (lang) => i18n.changeLanguage(lang);
export default i18n;
