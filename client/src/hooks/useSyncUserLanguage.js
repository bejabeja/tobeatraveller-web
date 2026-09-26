import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { updateMyLanguage } from "../services/users";

// Tells the API the language the signed-in user sees the app in, on signing
// in and whenever they switch it, so their emails go in that language too.
// Best effort: the next time it runs it tries again.
export const useSyncUserLanguage = (userId) => {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage;

  useEffect(() => {
    if (!userId || !language) return;
    updateMyLanguage(language).catch(() => {});
  }, [userId, language]);
};
