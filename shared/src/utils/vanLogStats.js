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
    const fillUps = entries
        .filter((e) => e.category === 'fuel' && e.pricePerLiter != null)
        .slice()
        .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    if (fillUps.length < 3) return null;

    const currency = fillUps[0].currency || '';
    if (fillUps.some((p) => (p.currency || '') !== currency)) return null;

    const prices = fillUps.map((p) => p.pricePerLiter);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    // Bars that start at zero make 1.55 and 1.62 look the same. The baseline
    // sits one price range under the cheapest fill-up, so the cheapest bar is
    // half the height of the dearest and any change stays visible.
    const baseline = Math.max(0, minPrice - (maxPrice - minPrice));
    const points = fillUps.map((fillUp) => ({
        ...fillUp,
        heightPercent: maxPrice === baseline ? 100 : ((fillUp.pricePerLiter - baseline) / (maxPrice - baseline)) * 100,
    }));

    return {
        points,
        currency,
        maxPrice,
        averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
        latestPrice: prices.at(-1),
    };
};

const MILLISECONDS_PER_DAY = 86400000;
const DAILY_BUCKETS_MAX_DAYS = 31;
const MONTHLY_BUCKETS_MAX = 12;

const toDayNumber = (day) => {
    const [year, month, date] = day.slice(0, 10).split('-').map(Number);
    return Date.UTC(year, month - 1, date) / MILLISECONDS_PER_DAY;
};

const dayNumberToKey = (dayNumber) => new Date(dayNumber * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);

const monthKeyAt = (offset, firstMonthIndex) => {
    const monthIndex = firstMonthIndex + offset;
    const year = Math.floor(monthIndex / 12);
    return `${year}-${String((monthIndex % 12) + 1).padStart(2, '0')}`;
};

const buildBuckets = (entries, firstDay, lastDay, days) => {
    if (days <= DAILY_BUCKETS_MAX_DAYS) {
        const totals = new Map();
        for (const entry of entries) totals.set(entry.entryDate.slice(0, 10), (totals.get(entry.entryDate.slice(0, 10)) ?? 0) + entry.amount);
        const buckets = [];
        for (let day = toDayNumber(firstDay); day <= toDayNumber(lastDay); day++) {
            const key = dayNumberToKey(day);
            buckets.push({ key, total: totals.get(key) ?? 0 });
        }
        return { granularity: 'day', buckets };
    }

    const totals = new Map();
    for (const entry of entries) {
        const key = entry.entryDate.slice(0, 7);
        totals.set(key, (totals.get(key) ?? 0) + entry.amount);
    }
    const monthIndexOf = (day) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
    const firstMonthIndex = monthIndexOf(firstDay);
    const monthCount = monthIndexOf(lastDay) - firstMonthIndex + 1;
    const buckets = Array.from({ length: monthCount }, (_, offset) => {
        const key = monthKeyAt(offset, firstMonthIndex);
        return { key, total: totals.get(key) ?? 0 };
    });
    return { granularity: 'month', buckets: buckets.slice(-MONTHLY_BUCKETS_MAX) };
};

// Spending per currency, never added across them (converting isn't done
// anywhere in the app). The span for the daily average runs from the first to
// the last expense, or the chosen date range, so days without expenses count.
export const getVanLogSpendingByCurrency = (entries, { dateFrom, dateTo } = {}) => {
    const byCurrency = new Map();
    for (const entry of entries) {
        if (entry.amount == null) continue;
        const currency = entry.currency || '';
        if (!byCurrency.has(currency)) byCurrency.set(currency, []);
        byCurrency.get(currency).push(entry);
    }

    return [...byCurrency.entries()]
        .map(([currency, currencyEntries]) => {
            const days = currencyEntries.map((entry) => entry.entryDate.slice(0, 10)).sort();
            const firstDay = dateFrom || days[0];
            const lastDay = dateTo || days.at(-1);
            const spanDays = Math.max(1, toDayNumber(lastDay) - toDayNumber(firstDay) + 1);
            const total = currencyEntries.reduce((sum, entry) => sum + entry.amount, 0);
            const { granularity, buckets } = buildBuckets(currencyEntries, firstDay, lastDay, spanDays);
            return {
                currency,
                total,
                count: currencyEntries.length,
                days: spanDays,
                averagePerDay: total / spanDays,
                granularity,
                buckets,
                maxBucketTotal: Math.max(...buckets.map((bucket) => bucket.total)),
            };
        })
        .sort((a, b) => b.count - a.count || a.currency.localeCompare(b.currency));
};

// Groups breakdown rows (by category, country or trip) by currency and gives
// each its share of that currency's own total, so bars are only ever
// compared with amounts in the same currency (so currencies themselves are
// listed alphabetically, not by amount).
export const getVanLogBreakdownByCurrency = (rows) => {
    const byCurrency = new Map();
    for (const row of rows) {
        const currency = row.currency || '';
        if (!byCurrency.has(currency)) byCurrency.set(currency, []);
        byCurrency.get(currency).push(row);
    }

    return [...byCurrency.entries()]
        .map(([currency, currencyRows]) => {
            const total = currencyRows.reduce((sum, row) => sum + row.total, 0);
            return {
                currency,
                total,
                rows: currencyRows
                    .map((row) => ({ ...row, share: total > 0 ? row.total / total : 0 }))
                    .sort((a, b) => b.total - a.total),
            };
        })
        .sort((a, b) => a.currency.localeCompare(b.currency));
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
