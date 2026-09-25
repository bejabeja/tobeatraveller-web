import { useEffect, useState } from "react";
import { getMyPassportLeaderboard } from "../services/passport";

// Only loaded on the owner's own passport (`enabled`).
export const usePassportLeaderboard = (enabled) => {
  const [state, setState] = useState({ leaderboard: null, loading: enabled, error: false });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState({ leaderboard: null, loading: true, error: false });
    getMyPassportLeaderboard()
      .then((leaderboard) => { if (!cancelled) setState({ leaderboard, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ leaderboard: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [enabled]);

  return state;
};
