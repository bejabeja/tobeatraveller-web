// The languages the apps are translated into (shared/src/locales). A user
// whose language isn't known, or isn't one of these, is written to in the
// default one, as the apps fall back to it too.
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'it', 'de'];
export const DEFAULT_LANGUAGE = 'en';

export const resolveLanguage = (language) => (SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE);
