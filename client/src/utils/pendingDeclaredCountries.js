// Countries a visitor marked before having an account, kept in this browser
// until they sign up or log in and can be saved to their passport. Local
// storage can be unavailable (private mode, blocked site data): then the
// marks simply aren't kept, which must never break the page.
import { COUNTRY_NAMES } from "@tobeatraveller/shared";

const PENDING_DECLARED_COUNTRIES_KEY = "pending_declared_countries";

export const getPendingDeclaredCountries = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(PENDING_DECLARED_COUNTRIES_KEY) ?? "[]");
    // Only real country codes: one bad entry would make the API reject them all.
    return Array.isArray(stored) ? stored.filter(code => typeof code === "string" && COUNTRY_NAMES[code]) : [];
  } catch {
    return [];
  }
};

export const setPendingDeclaredCountries = (codes) => {
  try {
    if (codes.length === 0) localStorage.removeItem(PENDING_DECLARED_COUNTRIES_KEY);
    else localStorage.setItem(PENDING_DECLARED_COUNTRIES_KEY, JSON.stringify(codes));
  } catch {
    // Not kept; see above.
  }
};

export const clearPendingDeclaredCountries = () => setPendingDeclaredCountries([]);
