import { useCallback, useEffect, useState } from 'react';
import { clearItineraryDraft, readItineraryDraft, saveItineraryDraft } from '../utils/itineraryDraftStorage';

// `pendingDraft` is what was left unfinished on this phone. Nothing is saved
// until it has been looked for (`loaded`) and the person has decided about it,
// so an empty form never overwrites what they had.
export const useItineraryDraft = (userId, kind) => {
  const [pendingDraft, setPendingDraft] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoaded(true);
      return undefined;
    }
    readItineraryDraft(userId, kind).then((draft) => {
      if (cancelled) return;
      setPendingDraft(draft);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [userId, kind]);

  const save = useCallback((draft) => {
    if (userId) saveItineraryDraft(userId, draft, kind);
  }, [userId, kind]);

  const clear = useCallback(() => {
    if (userId) clearItineraryDraft(userId, kind);
  }, [userId, kind]);

  const resolvePending = useCallback(() => setPendingDraft(null), []);

  return { pendingDraft, loaded, resolvePending, save, clear };
};
