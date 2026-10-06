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

export const REPORT_DECISIONS = Object.freeze({
    REMOVE: 'remove',
    DISMISS: 'dismiss',
    RESOLVE: 'resolve',
});

export const REPORT_DETAILS_MAX_LENGTH = 1000;
export const REPORT_ILLEGAL_DETAILS_MIN_LENGTH = 10;

// An illegal-content notice has to say why it is illegal, the rest may go without words.
export const reportDetailsError = ({ reason, details }) => {
    const length = details?.trim().length ?? 0;
    if (reason === REPORT_REASONS.ILLEGAL && length < REPORT_ILLEGAL_DETAILS_MIN_LENGTH) return 'validation.reportIllegalNeedsDetails';
    if (length > REPORT_DETAILS_MAX_LENGTH) return 'validation.tooLong';
    return null;
};
