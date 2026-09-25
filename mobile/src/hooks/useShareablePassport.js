import { useEffect, useState } from 'react';
import { getMyReferralInfo, getUserPassport } from '@tobeatraveller/shared';

// What everyone else sees of the passport, even for its owner, unless they
// explicitly choose to include their private stamps and countries: it is
// what gets shared outside the app, and it can't be taken back. Also loads
// the owner's referral code, so sign-ups from the shared link count as theirs.
export const useShareablePassport = (userId, enabled, { includePrivate = false } = {}) => {
  const [state, setState] = useState({ passport: null, loading: false, error: false });
  const [referral, setReferral] = useState({ code: null, settled: false });

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    let cancelled = false;
    setState({ passport: null, loading: true, error: false });
    getUserPassport(userId, { publicView: !includePrivate })
      .then((passport) => { if (!cancelled) setState({ passport, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ passport: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [userId, enabled, includePrivate]);

  // Still loading until the code is known (or known to be unavailable), so
  // nothing is shared with a link that doesn't credit the owner by accident.
  // Without a code the link still works; it just doesn't credit them.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setReferral({ code: null, settled: false });
    getMyReferralInfo()
      .then((info) => { if (!cancelled) setReferral({ code: info?.referralCode ?? null, settled: true }); })
      .catch(() => { if (!cancelled) setReferral({ code: null, settled: true }); });
    return () => { cancelled = true; };
  }, [enabled]);

  return {
    ...state,
    referralCode: referral.code,
    loading: state.loading || (enabled && !referral.settled),
  };
};
