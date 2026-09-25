import { useEffect, useState } from "react";
import { getMyReferralInfo } from "../services/referral";

// The signed-in user's referral code, for links that credit them with the
// sign-ups they bring. `settled` stays false until it is known (or known to
// be unavailable), so nothing is shared by accident with a link that
// doesn't credit them. Without a code a link still works; it just doesn't.
export const useReferralCode = (enabled) => {
  const [referral, setReferral] = useState({ code: null, settled: false });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setReferral({ code: null, settled: false });
    getMyReferralInfo()
      .then((info) => { if (!cancelled) setReferral({ code: info?.referralCode ?? null, settled: true }); })
      .catch(() => { if (!cancelled) setReferral({ code: null, settled: true }); });
    return () => { cancelled = true; };
  }, [enabled]);

  return referral;
};
