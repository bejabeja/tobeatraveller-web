import { useCallback, useEffect, useRef, useState } from "react";
import { getUserPassport } from "../services/passport";

export const useUserPassport = (userId) => {
  const [state, setState] = useState({ passport: null, loading: Boolean(userId), error: false });
  const [reloadCount, setReloadCount] = useState(0);
  const loadedUserIdRef = useRef(null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    // Another user's passport is cleared rather than kept: the profile page
    // isn't remounted when moving to another user, and the previous user's
    // stamps must not show meanwhile. A reload of the same one keeps it on
    // screen until the fresh one arrives.
    if (loadedUserIdRef.current !== userId) {
      setState({ passport: null, loading: true, error: false });
    }
    getUserPassport(userId)
      .then((passport) => {
        if (cancelled) return;
        loadedUserIdRef.current = userId;
        setState({ passport, loading: false, error: false });
      })
      .catch(() => { if (!cancelled) setState({ passport: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [userId, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, reload };
};
