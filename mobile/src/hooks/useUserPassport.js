import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getUserPassport } from '@tobeatraveller/shared';

// Reloads on focus: the Profile tab stays mounted, so a stamp earned while
// using another screen would otherwise not show up until the app restarts.
// `reload` is for after the screen itself changes the passport.
export const useUserPassport = (userId) => {
  const [state, setState] = useState({ passport: null, loading: Boolean(userId), error: false });
  const [reloadCount, setReloadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;
      let cancelled = false;
      setState((previous) => ({ ...previous, loading: previous.passport == null, error: false }));
      getUserPassport(userId)
        .then((passport) => { if (!cancelled) setState({ passport, loading: false, error: false }); })
        .catch(() => { if (!cancelled) setState((previous) => ({ ...previous, loading: false, error: previous.passport == null })); });
      return () => { cancelled = true; };
    }, [userId, reloadCount])
  );

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, reload };
};
