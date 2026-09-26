import { useEffect } from 'react';
import { updateMyLanguage } from '@tobeatraveller/shared';

// Tells the API the language the signed-in user sees the app in, on signing
// in and whenever they switch it, so their emails go in that language too.
// Best effort: the next time it runs it tries again.
export const useSyncUserLanguage = (userId, language) => {
  useEffect(() => {
    if (!userId || !language) return;
    updateMyLanguage(language).catch(() => {});
  }, [userId, language]);
};
