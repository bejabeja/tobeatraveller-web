import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMyPassportLeaderboard } from '@tobeatraveller/shared';

// Only on the owner's own passport (`enabled`). Reloads on focus: the people
// they follow keep adding trips while they use other screens.
export const usePassportLeaderboard = (enabled) => {
  const [state, setState] = useState({ leaderboard: null, loading: enabled, error: false });

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      let cancelled = false;
      getMyPassportLeaderboard()
        .then((leaderboard) => { if (!cancelled) setState({ leaderboard, loading: false, error: false }); })
        .catch(() => { if (!cancelled) setState((previous) => ({ ...previous, loading: false, error: previous.leaderboard == null })); });
      return () => { cancelled = true; };
    }, [enabled])
  );

  return state;
};
