import { getVanLogDateRangePresets } from './vanLogStats.js';

// This month so far, the same days the expenses screen offers as "this month".
export const currentMonthRange = (now = new Date()) => {
    const { dateFrom, dateTo } = getVanLogDateRangePresets(now).find(({ key }) => key === 'thisMonth');
    return { dateFrom, dateTo };
};

// What the Home of someone in a van shows. null means "could not be loaded": it is
// shown as unknown, never as zero, since "nothing spent" would then be a lie.
export const summarizeVanToday = ({ stats, shoppingList }) => ({
    monthTotals: Array.isArray(stats?.totalsByCurrency) ? stats.totalsByCurrency : null,
    shoppingCount: Array.isArray(shoppingList) ? shoppingList.length : null,
});
