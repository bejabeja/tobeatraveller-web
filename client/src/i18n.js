import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from '../../shared/src/locales/es.json';
import en from '../../shared/src/locales/en.json';
import { DEFAULT_APP_LANGUAGE, SUPPORTED_APP_LANGUAGES } from '@tobeatraveller/shared';

// Spanish and English (the most used, and the fallback) come with the app;
// the others are fetched only when someone uses them, so no visitor
// downloads every language on the first page.
const LAZY_LOCALES = {
  fr: () => import('../../shared/src/locales/fr.json'),
  it: () => import('../../shared/src/locales/it.json'),
  de: () => import('../../shared/src/locales/de.json'),
};

const lazyLocaleBackend = {
  type: 'backend',
  read: (language, _namespace, callback) => {
    const load = LAZY_LOCALES[language];
    if (!load) return callback(null, {});
    load().then((locale) => callback(null, locale.default), (error) => callback(error, null));
  },
};

// The page says which language it is in: screen readers read it with the
// right voice, and browsers don't offer to translate it from English.
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

// Resolves once the chosen language is loaded (or failed to load, showing
// the fallback), so the app doesn't first render in another language.
export const i18nReady = i18n
  .use(lazyLocaleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    partialBundledLanguages: true,
    fallbackLng: DEFAULT_APP_LANGUAGE,
    supportedLngs: SUPPORTED_APP_LANGUAGES,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
