// The languages the apps are translated into (shared/src/locales). The API
// keeps its own copy in api/src/utils/languages.js (api/ doesn't depend on
// shared/). Each one is named in itself, as language pickers show them.
export const APP_LANGUAGES = Object.freeze([
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
]);
export const SUPPORTED_APP_LANGUAGES = APP_LANGUAGES.map(language => language.code);
export const DEFAULT_APP_LANGUAGE = 'en';

// "fr-FR" → "fr"; one the apps don't have → the default.
export const toAppLanguage = (language) => {
    const code = language?.split('-')[0];
    return SUPPORTED_APP_LANGUAGES.includes(code) ? code : DEFAULT_APP_LANGUAGE;
};
