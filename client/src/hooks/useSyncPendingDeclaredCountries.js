import { useEffect } from "react";
import { getUserPassport, updateMyDeclaredCountries } from "../services/passport";
import { clearPendingDeclaredCountries, getPendingDeclaredCountries } from "../utils/pendingDeclaredCountries";

// Once someone who marked countries as a visitor is signed in (just signed
// up, or logged into an existing account), saves them to their passport.
// Added to the ones already declared, never replacing them, and kept in the
// browser to retry later if saving fails.
export const useSyncPendingDeclaredCountries = (userId) => {
  useEffect(() => {
    if (!userId) return;
    const pending = getPendingDeclaredCountries();
    if (pending.length === 0) return;

    getUserPassport(userId)
      .then((passport) => {
        const alreadyDeclared = (passport.declaredCountries ?? []).map(country => country.code);
        return updateMyDeclaredCountries([...new Set([...alreadyDeclared, ...pending])]);
      })
      .then(clearPendingDeclaredCountries)
      .catch(() => {});
  }, [userId]);
};
