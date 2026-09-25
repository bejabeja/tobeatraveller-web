import { useEffect, useState } from 'react';
import { getMyRecap } from '@tobeatraveller/shared';

export const useRecap = () => {
  const [state, setState] = useState({ recap: null, loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    getMyRecap()
      .then((recap) => { if (!cancelled) setState({ recap, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ recap: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, []);

  return state;
};
