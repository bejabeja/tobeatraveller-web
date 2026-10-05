import { ITINERARY_DRAFT_KINDS } from './itineraryDraft.js';

// The unfinished trip worth offering on Home: the one saved last, whichever of
// the two ways to start a trip it was left in. `form` and `plan` are what
// parseItineraryDraft gave for each, or null.
export const draftToResume = ({ form = null, plan = null } = {}) => {
    const found = [
        form && { kind: ITINERARY_DRAFT_KINDS.FORM, draft: form },
        plan && { kind: ITINERARY_DRAFT_KINDS.AI_PLAN, draft: plan },
    ].filter(Boolean).sort((a, b) => b.draft.savedAt - a.draft.savedAt);

    if (found.length === 0) return null;

    const { kind, draft } = found[0];
    return {
        kind,
        name: draft.values.title?.trim() || draft.values.destination?.name || '',
        savedAt: draft.savedAt,
    };
};
