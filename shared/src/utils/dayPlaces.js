// From this many places, a trip whose places arrive in one go (opening it to
// edit, or generating it) starts with its days folded, so the form isn't one
// very long page.
export const FOLD_DAYS_FROM_PLACES = 6;
const DAY_PREVIEW_PLACES = 3;

// What a folded day shows: its first place names and how many more it has.
export const dayPlacesPreview = (placeNames) => {
    const names = placeNames.map((name) => name?.trim()).filter(Boolean).slice(0, DAY_PREVIEW_PLACES);
    return { names, moreCount: placeNames.length - names.length };
};

// Every day but the first, so there is still something open to start from.
export const daysToFold = (days, placeCount) => (
    days.length > 1 && placeCount >= FOLD_DAYS_FROM_PLACES ? days.slice(1) : []
);
