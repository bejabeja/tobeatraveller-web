import { useMemo } from "react";
import { draftToResume, ITINERARY_DRAFT_KINDS } from "@tobeatraveller/shared";
import { readItineraryDraft } from "../utils/itineraryDraftStorage";

const DRAFT_PATHS = {
  [ITINERARY_DRAFT_KINDS.FORM]: "/create-itinerary",
  [ITINERARY_DRAFT_KINDS.AI_PLAN]: "/create-experience",
};

// The trip they left half done on this device, with where to pick it up. Read
// when the page opens: coming back from the form mounts it again.
export const useUnfinishedDraft = (userId) => useMemo(() => {
  if (!userId) return null;
  const draft = draftToResume({
    form: readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.FORM),
    plan: readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.AI_PLAN),
  });
  return draft && { ...draft, path: DRAFT_PATHS[draft.kind] };
}, [userId]);
