import { useEffect, useState } from 'react';
import { getUserPassport } from '@tobeatraveller/shared';
import { useReferralCode } from './useReferralCode';

// What everyone else sees of the passport, even for its owner, unless they
// explicitly choose to include their private stamps and countries: it is
// what gets shared outside the app, and it can't be taken back. Also loads
// the owner's referral code, so sign-ups from the shared link count as theirs.
export const useShareablePassport = (userId, enabled, { includePrivate = false } = {}) => {
  const [state, setState] = useState({ passport: null, loading: false, error: false });
  const referral = useReferralCode(enabled);

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    let cancelled = false;
    setState({ passport: null, loading: true, error: false });
    getUserPassport(userId, { publicView: !includePrivate })
      .then((passport) => { if (!cancelled) setState({ passport, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ passport: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [userId, enabled, includePrivate]);

  return {
    ...state,
    referralCode: referral.code,
    loading: state.loading || (enabled && !referral.settled),
  };
};
