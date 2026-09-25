import { useCallback, useEffect, useState } from 'react';
import { loadAnalyticsConsent, setAnalyticsConsent, subscribeToAnalyticsConsent } from '../utils/analytics';

// The person's answer about analytics: undefined while it loads, null if
// they haven't answered yet, or ANALYTICS_CONSENT.GRANTED / DENIED.
export const useAnalyticsConsent = () => {
  const [consent, setConsent] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    loadAnalyticsConsent().then((stored) => { if (!cancelled) setConsent(stored); });
    const unsubscribe = subscribeToAnalyticsConsent(setConsent);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const answer = useCallback((granted) => setAnalyticsConsent(granted), []);

  return { consent, answer };
};
