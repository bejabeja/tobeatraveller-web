import { formatCalendarDay } from './formatLocale.js';
import { localCalendarDay } from './nextTrip.js';

// Entries come back newest-first from the API, so grouping preserves that
// order both across months and within a month. Month names are in `language`.
export const groupVanLogEntriesByMonth = (entries, language) => {
    const groups = [];
    const byKey = new Map();

    for (const entry of entries) {
        const [year, month] = entry.entryDate.split('-');
        const key = `${year}-${month}`;
        let group = byKey.get(key);
        if (!group) {
            group = {
                key,
                label: formatCalendarDay(`${year}-${month}-01`, language, { year: 'numeric', month: 'long' }),
                total: 0,
                currency: undefined,
                entries: [],
            };
            byKey.set(key, group);
            groups.push(group);
        }
        addEntryToGroup(group, entry);
    }

    return groups;
};

// Only a single-currency group can be summed into one meaningful total; once
// a mismatch is found it stays unsummable for the rest of the group.
const addEntryToGroup = (group, entry) => {
    group.entries.push(entry);
    if (entry.amount == null) return;
    const currency = entry.currency || '';
    if (group.currency === undefined) group.currency = currency;
    group.total = (group.total === null || group.currency !== currency)
        ? null
        : group.total + entry.amount;
};

const NO_TRIP_GROUP_KEY = 'no-trip';

// Same order as the entries: trips appear by their most recent expense, and
// what isn't linked to any trip goes last, in a group with a null tripId, so
// a trip's own expenses never end up buried under loose ones.
export const groupVanLogEntriesByTrip = (entries) => {
    const groups = [];
    const byKey = new Map();

    for (const entry of entries) {
        const key = entry.itinerary?.id ?? NO_TRIP_GROUP_KEY;
        let group = byKey.get(key);
        if (!group) {
            group = {
                key,
                tripId: entry.itinerary?.id ?? null,
                title: entry.itinerary?.title ?? null,
                total: 0,
                currency: undefined,
                entries: [],
            };
            byKey.set(key, group);
            groups.push(group);
        }
        addEntryToGroup(group, entry);
    }

    return [...groups.filter((group) => group.tripId), ...groups.filter((group) => !group.tripId)];
};

// A single-currency price/liter series across fuel fill-ups, oldest first.
// Needs 3+ points: with only 1-2 fill-ups the chart is mostly empty space and
// reads as broken rather than as a trend.
export const getVanLogFuelPriceTrend = (entries) => {
    const points = entries
        .filter((e) => e.category === 'fuel' && e.pricePerLiter != null)
        .slice()
        .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    if (points.length < 3) return null;

    const currency = points[0].currency || '';
    if (points.some((p) => (p.currency || '') !== currency)) return null;

    return { points, currency, maxPrice: Math.max(...points.map((p) => p.pricePerLiter)) };
};

// Itineraries already carry a budget (set when the trip was planned), so this
// compares it against what Van Log logged for that trip instead of asking the
// user to keep a second budget just for expenses. Returns null when there is
// nothing meaningful to show: no trip, no budget, or spend logged only in
// other currencies (showing "0 spent" there would be wrong, not imprecise,
// since converting between currencies isn't done anywhere in the app).
export const getTripBudgetProgress = (trip, totalsByCurrency) => {
    const budget = parseFloat(trip?.budget);
    if (!(budget > 0)) return null;

    const spentInTripCurrency = totalsByCurrency.find((total) => total.currency === trip.currency);
    if (!spentInTripCurrency && totalsByCurrency.length > 0) return null;

    const spent = spentInTripCurrency?.total ?? 0;
    return {
        spent,
        budget,
        currency: trip.currency,
        isOver: spent > budget,
        overBy: Math.max(0, spent - budget),
        remaining: Math.max(0, budget - spent),
        fillPercent: Math.min(100, (spent / budget) * 100),
    };
};

const LAST_7_DAYS = 7;
const LAST_30_DAYS = 30;

// Ranges are computed against `now` on every call (not once at module load),
// so a session left open across midnight still offers the right days. Both
// ends are inclusive calendar days, so "last 7 days" is today plus the six
// before it.
export const getVanLogDateRangePresets = (now = new Date()) => {
    const daysBefore = (count) => {
        const date = new Date(now);
        date.setDate(now.getDate() - count);
        return localCalendarDay(date);
    };
    const today = localCalendarDay(now);
    return [
        { key: 'today', labelKey: 'vanLog.filterPresetToday', dateFrom: today, dateTo: today },
        { key: 'last7', labelKey: 'vanLog.filterPresetLast7Days', dateFrom: daysBefore(LAST_7_DAYS - 1), dateTo: today },
        { key: 'last30', labelKey: 'vanLog.filterPresetLast30Days', dateFrom: daysBefore(LAST_30_DAYS - 1), dateTo: today },
        { key: 'thisMonth', labelKey: 'vanLog.filterPresetThisMonth', dateFrom: localCalendarDay(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: today },
    ];
};
