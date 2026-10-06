export const REPORT_TARGET_TYPES = Object.freeze({
    COMMENT: 'comment',
    ITINERARY: 'itinerary',
    USER: 'user',
});

export const REPORT_REASONS = Object.freeze({
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    HATE: 'hate',
    SEXUAL: 'sexual',
    ILLEGAL: 'illegal',
    MISLEADING: 'misleading',
    OTHER: 'other',
});

export const REPORT_STATUSES = Object.freeze({
    OPEN: 'open',
    REMOVED: 'removed',
    DISMISSED: 'dismissed',
    RESOLVED: 'resolved',
});

// What the team decides on a report. "resolve" is for when the action was taken
// somewhere else (a profile is handled from the users panel).
export const REPORT_DECISIONS = Object.freeze({
    REMOVE: 'remove',
    DISMISS: 'dismiss',
    RESOLVE: 'resolve',
});

export const REPORT_EXCERPT_MAX_LENGTH = 200;
export const REPORT_DETAILS_MAX_LENGTH = 1000;
export const REPORT_ILLEGAL_DETAILS_MIN_LENGTH = 10;
export const REPORT_RETENTION_MONTHS = 12;
