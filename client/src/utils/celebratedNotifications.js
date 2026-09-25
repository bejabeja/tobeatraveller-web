// Ids of the notifications already celebrated on screen in this browser, so
// a new badge or country is celebrated once. Local storage can be
// unavailable (private mode, blocked site data): then a celebration may
// repeat on the next visit, which must never break the page.
import { CELEBRATED_STORAGE_KEY } from "@tobeatraveller/shared";

export const getCelebratedNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(CELEBRATED_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
};

export const setCelebratedNotifications = (ids) => {
  try {
    localStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Not kept; see above.
  }
};
