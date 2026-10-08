import { useCallback, useRef, useState } from "react";
import { clearItineraryDraft, readItineraryDraft, saveItineraryDraft } from "../utils/itineraryDraftStorage";

const lookFor = (userId, kind) => ({ userId, kind, draft: userId ? readItineraryDraft(userId, kind) : null });

// `pendingDraft` is what was left unfinished on this device, read when the form
// opens: the form waits for the person to continue it or start over before it
// begins saving, so what they had is never overwritten by an empty form. The
// account can arrive a moment after the first render, so the draft is looked
// for again whenever it changes, before anything is saved.
export const useItineraryDraft = (userId, kind) => {
  const [found, setFound] = useState(() => lookFor(userId, kind));
  if (found.userId !== userId || found.kind !== kind) setFound(lookFor(userId, kind));
  const pendingDraft = found.userId === userId && found.kind === kind ? found.draft : null;

  // Once the trip is published the form can stay on screen for a moment (the next page is
  // still loading) and keep autosaving, which would bring the trip back as "unfinished".
  const finished = useRef(false);

  const save = useCallback((draft) => {
    if (userId && !finished.current) saveItineraryDraft(userId, draft, kind);
  }, [userId, kind]);

  const clear = useCallback(() => {
    if (userId) clearItineraryDraft(userId, kind);
  }, [userId, kind]);

  const finish = useCallback(() => {
    finished.current = true;
    if (userId) clearItineraryDraft(userId, kind);
  }, [userId, kind]);

  const resolvePending = useCallback(() => setFound((current) => ({ ...current, draft: null })), []);

  return { pendingDraft, resolvePending, save, clear, finish };
};
