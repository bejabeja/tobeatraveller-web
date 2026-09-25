import { useEffect, useState } from "react";
import { getUserPassport } from "../services/passport";

export const useUserPassport = (userId) => {
  const [state, setState] = useState({ passport: null, loading: Boolean(userId), error: false });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    // Cleared rather than kept: the profile page isn't remounted when moving
    // to another user, and the previous user's stamps must not show meanwhile.
    setState({ passport: null, loading: true, error: false });
    getUserPassport(userId)
      .then((passport) => { if (!cancelled) setState({ passport, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ passport: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [userId]);

  return state;
};
