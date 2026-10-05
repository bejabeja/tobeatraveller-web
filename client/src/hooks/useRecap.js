import { useCallback, useEffect, useState } from "react";
import { getMyRecap } from "../services/recap";

export const useRecap = () => {
  const [state, setState] = useState({ recap: null, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ recap: null, loading: true, error: false });
    getMyRecap()
      .then((recap) => { if (!cancelled) setState({ recap, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ recap: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, reload };
};
