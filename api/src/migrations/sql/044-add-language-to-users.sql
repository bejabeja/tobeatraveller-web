-- The language each user uses the app in, to write their emails in it.
-- NULL until they sign up or open the app again after this change: those
-- emails go in the default language (api/src/utils/languages.js).
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(5);
