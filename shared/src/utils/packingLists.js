// Same limit as the API's (api/src/utils/schemasValidation.js).
export const PACKING_LIST_NAME_MAX_LENGTH = 60;

// A copy's name ("Weekend (copy)", in the app's language), with the
// original's shortened so the whole fits the limit. `nameCopy` turns a name
// into the copy's.
export const copyListName = (name, nameCopy) => nameCopy(name.slice(0, PACKING_LIST_NAME_MAX_LENGTH - nameCopy('').length));

export const MOVE_UP = -1;
export const MOVE_DOWN = 1;

const byPosition = (a, b) => a.position - b.position;

const hasPlace = (item) => Number.isInteger(item.position);

// Moving something up or down swaps its place with the neighbour in its
// category (the list is shown by category). Returns the updates to save, or
// none at either end. Something added offline has no place until it syncs,
// so it's left where it is.
export const moveWithinCategory = (items, itemId, direction) => {
    const item = items.find(candidate => candidate.id === itemId);
    if (!item || !hasPlace(item)) return [];
    const category = items.filter(candidate => candidate.category === item.category && hasPlace(candidate)).sort(byPosition);
    const index = category.indexOf(item);
    const neighbour = category[index + direction];
    if (!neighbour) return [];
    if (neighbour.position !== item.position) {
        return [
            { id: item.id, position: neighbour.position },
            { id: neighbour.id, position: item.position },
        ];
    }
    // Two things on the same place (added at the same moment, or a move
    // half saved) can't be swapped: the category is numbered again in its
    // new order, from where it starts.
    const reordered = [...category];
    [reordered[index], reordered[index + direction]] = [neighbour, item];
    const first = category[0].position;
    return reordered
        .map((candidate, place) => ({ id: candidate.id, position: first + place, previous: candidate.position }))
        .filter(({ position, previous }) => position !== previous)
        .map(({ id, position }) => ({ id, position }));
};

// The shopping list merges what has the same name, so adding it again would
// only raise its amount.
export const isOnShoppingList = (shoppingList, name) => {
    const wanted = name.trim().toLowerCase();
    return shoppingList.some(item => item.name.trim().toLowerCase() === wanted);
};

export const listsForTrip = (lists, itineraryId) => lists.filter(list => list.itinerary?.id === itineraryId);

// The trips to choose from for a list: the ones ahead (or under way) first,
// soonest first, then the past ones, latest first, and last the experiences
// planned without a date, by title. `today` is a calendar day.
export const tripsToLinkTo = (itineraries, today) => {
    const day = (value) => value.slice(0, 10);
    const dated = (itineraries ?? []).filter(trip => trip.startDate && trip.endDate);
    const undated = (itineraries ?? []).filter(trip => !trip.startDate || !trip.endDate)
        .sort((a, b) => a.title.localeCompare(b.title));
    const ahead = dated.filter(trip => day(trip.endDate) >= today)
        .sort((a, b) => day(a.startDate).localeCompare(day(b.startDate)));
    const past = dated.filter(trip => day(trip.endDate) < today)
        .sort((a, b) => day(b.startDate).localeCompare(day(a.startDate)));
    return [...ahead, ...past, ...undated];
};

