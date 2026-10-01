import {
  ITINERARY_DRAFT_KEY_PREFIX,
  itineraryDraftKey,
  parseItineraryDraft,
  serializeItineraryDraft,
} from "@tobeatraveller/shared";

// The browser can refuse (private window, full storage, blocked): a draft is
// a convenience, so none of these may ever break the page.
export const readItineraryDraft = (userId, kind) => {
  try {
    const key = itineraryDraftKey(userId, kind);
    const raw = localStorage.getItem(key);
    const draft = parseItineraryDraft(raw);
    // One that is too old, damaged or from another version is no longer offered, and
    // is not left on the device either: the privacy policy says it is removed.
    if (raw && !draft) localStorage.removeItem(key);
    return draft;
  } catch {
    return null;
  }
};

export const saveItineraryDraft = (userId, draft, kind) => {
  try {
    localStorage.setItem(itineraryDraftKey(userId, kind), serializeItineraryDraft(draft));
  } catch {
    // Nothing to do: the trip is still on the screen.
  }
};

export const clearItineraryDraft = (userId, kind) => {
  try {
    localStorage.removeItem(itineraryDraftKey(userId, kind));
  } catch {
    // Nothing to do.
  }
};

// Signing out leaves nothing of what the person wrote on a device that may be shared.
export const clearAllItineraryDrafts = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(ITINERARY_DRAFT_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to do.
  }
};
