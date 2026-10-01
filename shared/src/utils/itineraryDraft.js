export const ITINERARY_DRAFT_VERSION = 1;
export const ITINERARY_DRAFT_MAX_AGE_DAYS = 30;
export const ITINERARY_DRAFT_KEY_PREFIX = 'itinerary-draft:';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// The two ways to start a trip each keep their own: the form, and the plan the AI writes.
export const ITINERARY_DRAFT_KINDS = Object.freeze({ FORM: 'itinerary', AI_PLAN: 'experience' });

// One per account and kind, so a second person on the same device never sees it,
// nor does one flow offer what was left in the other. The form's keeps the
// shape it always had.
export const itineraryDraftKey = (userId, kind = ITINERARY_DRAFT_KINDS.FORM) => (
    kind === ITINERARY_DRAFT_KINDS.FORM
        ? `${ITINERARY_DRAFT_KEY_PREFIX}${userId}`
        : `${ITINERARY_DRAFT_KEY_PREFIX}${kind}:${userId}`
);

// Something worth coming back to: not a form nobody has touched.
export const hasItineraryDraftProgress = ({ title, destination, places } = {}) => (
    !!(title?.trim() || destination?.name || places?.length)
);

// Photos are not part of it: files do not fit in the small storage a draft
// goes to, and are added again when it is restored.
export const serializeItineraryDraft = ({ values, days, step, pace }, now = new Date()) => JSON.stringify({
    version: ITINERARY_DRAFT_VERSION,
    savedAt: now.toISOString(),
    values,
    days,
    step,
    pace,
});

// Anything that cannot be trusted (another version of the app wrote it, it
// is damaged, it is empty or it is old) is no draft at all.
export const parseItineraryDraft = (raw, now = new Date()) => {
    if (!raw) return null;

    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!data || data.version !== ITINERARY_DRAFT_VERSION || !data.values || typeof data.values !== 'object') return null;

    const savedAt = new Date(data.savedAt);
    if (Number.isNaN(savedAt.getTime())) return null;
    if (now.getTime() - savedAt.getTime() > ITINERARY_DRAFT_MAX_AGE_DAYS * MILLISECONDS_PER_DAY) return null;
    if (!hasItineraryDraftProgress(data.values)) return null;

    return {
        savedAt,
        values: data.values,
        days: Array.isArray(data.days) && data.days.length > 0 ? data.days : [1],
        step: Number.isInteger(data.step) && data.step >= 0 ? data.step : 0,
        pace: data.pace,
    };
};
