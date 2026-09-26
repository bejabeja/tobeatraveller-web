// Numbers, amounts and dates in the app's language, not the browser's: a
// browser in English would otherwise print "September" and "1,019.00" on a
// Spanish screen.

export const formatNumber = (value, language, options) => new Intl.NumberFormat(language, options).format(value);

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

// "1.019,00 €" in Spanish, "€1,019.00" in English. A code Intl doesn't know
// (or none) keeps the plain number, followed by the code.
export const formatAmount = (amount, currency, language) => {
    if (currency) {
        try {
            return new Intl.NumberFormat(language, { style: 'currency', currency }).format(amount);
        } catch {
            // Not an ISO currency code: fall through to number + code.
        }
    }
    const number = formatNumber(amount, language, TWO_DECIMALS);
    return currency ? `${number} ${currency}` : number;
};

export const formatDate = (date, language, options) => new Date(date).toLocaleDateString(language, options);

// A calendar day stored as "2026-09-10", taken as that day where the user is:
// read as a date-time it would be midnight UTC, the day before west of UTC.
export const formatCalendarDay = (day, language, options) => {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date).toLocaleDateString(language, options);
};
