import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../shared/src/locales/en.json';
import es from '../../shared/src/locales/es.json';

const deviceLang = getLocales()[0]?.languageCode ?? 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng: deviceLang,
    fallbackLng: 'en',
    supportedLngs: ['es', 'en'],
    interpolation: { escapeValue: false },
  });

export const changeLanguage = (lang) => i18n.changeLanguage(lang);
export default i18n;
