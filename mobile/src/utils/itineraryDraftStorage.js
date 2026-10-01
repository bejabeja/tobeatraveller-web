import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ITINERARY_DRAFT_KEY_PREFIX,
  itineraryDraftKey,
  parseItineraryDraft,
  serializeItineraryDraft,
} from '@tobeatraveller/shared';

// A draft is a convenience: a storage that fails must never break the screen.
export const readItineraryDraft = async (userId, kind) => {
  try {
    const key = itineraryDraftKey(userId, kind);
    const raw = await AsyncStorage.getItem(key);
    const draft = parseItineraryDraft(raw);
    // One that is too old, damaged or from another version is no longer offered, and
    // is not left on the phone either: the privacy policy says it is removed.
    if (raw && !draft) await AsyncStorage.removeItem(key);
    return draft;
  } catch {
    return null;
  }
};

export const saveItineraryDraft = async (userId, draft, kind) => {
  try {
    await AsyncStorage.setItem(itineraryDraftKey(userId, kind), serializeItineraryDraft(draft));
  } catch {
    // Nothing to do: the trip is still on the screen.
  }
};

export const clearItineraryDraft = async (userId, kind) => {
  try {
    await AsyncStorage.removeItem(itineraryDraftKey(userId, kind));
  } catch {
    // Nothing to do.
  }
};

// Signing out leaves nothing of what the person wrote for the next one on this phone.
export const clearAllItineraryDrafts = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(ITINERARY_DRAFT_KEY_PREFIX)));
  } catch {
    // Nothing to do.
  }
};
