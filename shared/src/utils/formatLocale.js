// Numbers, amounts and dates in the app's language, not the browser's: a
// browser in English would otherwise print "September" and "1,019.00" on a
// Spanish screen.

export const formatNumber = (value, language, options) => new Intl.NumberFormat(language, options).format(value);

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

// "1.019,00 €" in Spanish, "€1,019.00" in English. A code Intl doesn't know
// (or none) keeps the plain number, followed by the code.
// `digits` changes the decimals, e.g. none for a round budget.
export const formatAmount = (amount, currency, language, digits) => {
    if (currency) {
        try {
            return new Intl.NumberFormat(language, { style: 'currency', currency, ...digits }).format(amount);
        } catch {
            // Not an ISO currency code: fall through to number + code.
        }
    }
    const number = formatNumber(amount, language, digits ?? TWO_DECIMALS);
    return currency ? `${number} ${currency}` : number;
};

export const formatDate = (date, language, options) => new Date(date).toLocaleDateString(language, options);

// A calendar day stored as "2026-09-10", taken as that day where the user is:
// read as a date-time it would be midnight UTC, the day before west of UTC.
export const formatCalendarDay = (day, language, options) => {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date).toLocaleDateString(language, options);
};

const NO_DECIMALS = { minimumFractionDigits: 0, maximumFractionDigits: 0 };

// A trip's budget: "500 €" when round, "249,50 €" when not (never "249,5 €").
export const formatBudgetAmount = (amount, currency, language) => {
    const isRound = Math.round(amount * 100) % 100 === 0;
    return formatAmount(amount, currency, language, isRound ? NO_DECIMALS : TWO_DECIMALS);
};
