import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { currentMonthRange, getShoppingList, getVanLogStats, summarizeVanToday } from '@tobeatraveller/shared';
import { cacheGet, cacheSet, vanTodayCacheKey } from '../utils/offlineCache';

// What the Home of someone in a van shows. On the road the signal comes and goes,
// so what was last known is shown while it loads and when it cannot be reached.
// Home stays mounted behind the other screens, hence the refresh each time it
// comes back into view: an expense just added shows up.
export const useVanToday = (userId) => {
  const [state, setState] = useState({ loading: true, summary: summarizeVanToday({}) });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const range = currentMonthRange();

      (async () => {
        const cached = await cacheGet(vanTodayCacheKey(userId));
        // A total is for one month: last month's is not this month's.
        const lastKnown = {
          monthTotals: cached?.month === range.dateFrom ? cached.monthTotals : null,
          shoppingCount: cached?.shoppingCount ?? null,
        };
        if (!cancelled && cached) setState({ loading: true, summary: lastKnown });

        const [stats, shoppingList] = await Promise.allSettled([getVanLogStats(range), getShoppingList()]);
        if (cancelled) return;

        const fresh = summarizeVanToday({ stats: stats.value, shoppingList: shoppingList.value });
        const summary = {
          monthTotals: fresh.monthTotals ?? lastKnown.monthTotals,
          shoppingCount: fresh.shoppingCount ?? lastKnown.shoppingCount,
        };
        setState({ loading: false, summary });
        if (fresh.monthTotals !== null || fresh.shoppingCount !== null) {
          cacheSet(vanTodayCacheKey(userId), { month: range.dateFrom, ...summary });
        }
      })();

      return () => { cancelled = true; };
    }, [userId]),
  );

  return state;
};
