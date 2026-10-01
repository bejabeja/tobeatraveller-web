import { useEffect, useState } from "react";
import { currentMonthRange, summarizeVanToday } from "@tobeatraveller/shared";
import { getShoppingList } from "../services/supplies";
import { getVanLogStats } from "../services/vanLogs";

// What the Home of someone in a van shows. Each answer stands on its own: if the
// shopping list cannot be loaded, the month is still shown (see summarizeVanToday).
export const useVanToday = () => {
  const [state, setState] = useState({ loading: true, summary: summarizeVanToday({}) });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getVanLogStats(currentMonthRange()), getShoppingList()]).then(([stats, shoppingList]) => {
      if (cancelled) return;
      setState({ loading: false, summary: summarizeVanToday({ stats: stats.value, shoppingList: shoppingList.value }) });
    });
    return () => { cancelled = true; };
  }, []);

  return state;
};
