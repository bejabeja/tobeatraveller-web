import { localCalendarDay } from './nextTrip.js';

const DEFAULT_CURRENCY = 'EUR';
const EMPTY_LOCATION = { name: '', label: '', coordinates: { lat: 0, lon: 0 } };

// One form serves creating and editing an expense, so both start from the
// same shape: blank for a new one, the stored values for an existing one.
export const vanLogEntryToFormValues = (entry, today = localCalendarDay()) => {
    if (!entry) {
        return {
            category: '',
            title: '',
            amount: '',
            currency: DEFAULT_CURRENCY,
            pricePerLiter: '',
            location: EMPTY_LOCATION,
            notes: '',
            entryDate: today,
        };
    }
    return {
        category: entry.category,
        title: entry.title || '',
        amount: entry.amount != null ? String(entry.amount) : '',
        currency: entry.currency || '',
        pricePerLiter: entry.pricePerLiter != null ? String(entry.pricePerLiter) : '',
        location: entry.location
            ? {
                name: entry.location.name || '',
                country: entry.location.country || '',
                label: entry.location.label || '',
                coordinates: { lat: Number(entry.location.lat) || 0, lon: Number(entry.location.lon) || 0 },
            }
            : EMPTY_LOCATION,
        notes: entry.notes || '',
        entryDate: entry.entryDate ? entry.entryDate.slice(0, 10) : today,
    };
};

// `data` is the validated form; the API takes location as flat lat/lon and
// wants "nothing" as null, not as an empty string.
export const vanLogFormValuesToPayload = (data, itineraryId, { isEditing = false } = {}) => {
    const hasLocation = Boolean(data.location?.name);
    return {
        category: data.category,
        title: data.title || null,
        amount: data.amount,
        // A new expense always opens with a default currency, so without an
        // amount it would leave an empty bucket in the by-currency stats.
        // An existing one only has a currency the user chose, so it is kept
        // even if they clear the amount.
        currency: (isEditing || data.amount != null) ? (data.currency || null) : null,
        pricePerLiter: data.category === 'fuel' ? data.pricePerLiter : null,
        location: hasLocation
            ? {
                name: data.location.name,
                country: data.location.country || null,
                label: data.location.label || data.location.name,
                lat: data.location.coordinates?.lat ?? null,
                lon: data.location.coordinates?.lon ?? null,
            }
            : null,
        notes: data.notes || null,
        entryDate: data.entryDate,
        itineraryId: itineraryId || null,
    };
};

const isTripUnderWay = (trip, today) =>
    Boolean(trip.startDate && trip.endDate) && trip.startDate.slice(0, 10) <= today && today <= trip.endDate.slice(0, 10);

// Which trip the form opens with. An existing expense keeps the trip it has
// (or none): defaulting it to today's trip would silently move it. A new one
// is almost always for the trip under way right now, so that is the default
// unless the caller already knows the trip (adding from a trip's own filter).
export const initialVanLogTripId = ({ entry, requestedTripId = '', trips, today = localCalendarDay() }) => {
    if (entry) return entry.itinerary?.id ?? '';
    if (requestedTripId) return requestedTripId;
    return trips.find((trip) => isTripUnderWay(trip, today))?.id ?? '';
};
