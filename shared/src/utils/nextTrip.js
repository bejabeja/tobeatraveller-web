const DAY_MS = 86_400_000;

// Trip dates are calendar days ("2026-10-03"), compared as whole days so a
// time zone never moves a trip to the day before.
const dayNumber = (calendarDay) => {
    const [year, month, day] = calendarDay.slice(0, 10).split('-').map(Number);
    return Date.UTC(year, month - 1, day) / DAY_MS;
};

export const localCalendarDay = (date = new Date()) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

// The trip someone is on today or, failing that, the next one to start.
// Experiences planned without a date don't count: nobody knows when they are.
export const findNextTrip = (itineraries, today) => {
    const todayNumber = dayNumber(today);
    const dated = (itineraries ?? [])
        .filter((itinerary) => itinerary.startDate && itinerary.endDate)
        .map((itinerary) => ({ itinerary, start: dayNumber(itinerary.startDate), end: dayNumber(itinerary.endDate) }));

    const [ongoing] = dated
        .filter(({ start, end }) => start <= todayNumber && todayNumber <= end)
        .sort((a, b) => b.start - a.start);
    if (ongoing) {
        return {
            itinerary: ongoing.itinerary,
            isOngoing: true,
            dayOfTrip: todayNumber - ongoing.start + 1,
            totalDays: ongoing.end - ongoing.start + 1,
        };
    }

    const [upcoming] = dated.filter(({ start }) => start > todayNumber).sort((a, b) => a.start - b.start);
    return upcoming ? { itinerary: upcoming.itinerary, isOngoing: false, daysUntil: upcoming.start - todayNumber } : null;
};
