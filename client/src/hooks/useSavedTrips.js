import { useEffect, useState } from "react";
import { getUserFavorites } from "../services/favorites";

// The trips the signed-in user saved, for their own profile. Nothing is
// fetched while `enabled` is false (someone else's profile).
export const useSavedTrips = (enabled) => {
  const [state, setState] = useState({ trips: [], loading: false, error: false });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState({ trips: [], loading: true, error: false });
    getUserFavorites()
      .then((trips) => { if (!cancelled) setState({ trips: Array.isArray(trips) ? trips : [], loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ trips: [], loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [enabled]);

  return state;
};
