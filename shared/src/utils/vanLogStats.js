// Entries come back newest-first from the API, so grouping preserves that
// order both across months and within a month.
export const groupVanLogEntriesByMonth = (entries) => {
    const groups = [];
    const byKey = new Map();

    for (const entry of entries) {
        const [year, month] = entry.entryDate.split('-');
        const key = `${year}-${month}`;
        let group = byKey.get(key);
        if (!group) {
            group = {
                key,
                label: new Date(Number(year), Number(month) - 1, 1)
                    .toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
                total: 0,
                currency: undefined,
                entries: [],
            };
            byKey.set(key, group);
            groups.push(group);
        }
        group.entries.push(entry);
        if (entry.amount != null) {
            const currency = entry.currency || '';
            // Only a single-currency month can be summed into one meaningful total;
            // once a mismatch is found it stays unsummable for the rest of the month.
            if (group.currency === undefined) group.currency = currency;
            group.total = (group.total === null || group.currency !== currency)
                ? null
                : group.total + entry.amount;
        }
    }

    return groups;
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
