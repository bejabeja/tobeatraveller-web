const DAY_MS = 86_400_000;
const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar day written as "YYYY-MM-DD" (not "2026-02-30").
export const isCalendarDay = (value) => CALENDAR_DAY_PATTERN.test(value ?? '')
    && new Date(Date.parse(value)).toISOString().slice(0, 10) === value;

// The last day of a trip that starts on `startDate` and lasts `totalDays`,
// counting both ends.
export const tripEndDate = (startDate, totalDays) => new Date(Date.parse(startDate) + (totalDays - 1) * DAY_MS).toISOString().slice(0, 10);

// What an experience is saved with: from the day it starts for as many days
// as it lasts or, if its traveller doesn't know yet, just how long it lasts.
export const experienceDates = (startDate, totalDays) => (startDate
    ? { startDate, endDate: tripEndDate(startDate, totalDays), totalDays }
    : { startDate: null, endDate: null, totalDays });
