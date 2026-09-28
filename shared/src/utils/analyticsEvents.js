// The passport sharing funnel (a passport is shared, the link is opened, the
// visitor clicks the invite and signs up) and the core actions, to see what
// people actually use.
export const ANALYTICS_EVENTS = Object.freeze({
    PASSPORT_VIEWED: 'passport_viewed',
    PASSPORT_SHARE_OPENED: 'passport_share_opened',
    PASSPORT_SHARED: 'passport_shared',
    PASSPORT_INVITE_CLICKED: 'passport_invite_clicked',
    PASSPORT_COUNTRIES_DECLARED: 'passport_countries_declared',
    PASSPORT_LEADERBOARD_CLICKED: 'passport_leaderboard_clicked',
    PASSPORT_START_STEP_CLICKED: 'passport_start_step_clicked',
    ACHIEVEMENT_CELEBRATED: 'achievement_celebrated',
    RECAP_OPENED: 'recap_opened',
    RECAP_SHARED: 'recap_shared',
    USER_SIGNED_UP: 'user_signed_up',
    ONBOARDING_START_STEP_CLICKED: 'onboarding_start_step_clicked',
    TRIP_CREATED: 'trip_created',
    AI_ITINERARY_GENERATED: 'ai_itinerary_generated',
    TRIP_CLONED: 'trip_cloned',
    TRIP_LIKED: 'trip_liked',
    TRIP_SAVED: 'trip_saved',
    COMMENT_POSTED: 'comment_posted',
    USER_FOLLOWED: 'user_followed',
    CHECKOUT_STARTED: 'checkout_started',
    PACKING_LIST_CREATED: 'packing_list_created',
    PACKING_LIST_LINKED_TO_TRIP: 'packing_list_linked_to_trip',
});

// A regular trip, or an experience (planned by day count, with a start date
// only if its traveller gives one).
export const TRIP_KINDS = Object.freeze({
    ITINERARY: 'itinerary',
    EXPERIENCE: 'experience',
});

// What a trip was like when created: counts and flags, nothing it says.
// Only an experience can go without a date.
export const tripCreatedProperties = ({ kind, isPublic, places, days, hasDate = true }) => ({
    kind, is_public: Boolean(isPublic), places, days, has_date: hasDate,
});

export const PASSPORT_SHARE_SOURCES = Object.freeze({
    PASSPORT_PAGE: 'passport_page',
    PROFILE: 'profile',
    NOTIFICATION: 'notification',
    QR_CODE: 'qr_code',
});

// Where the yearly recap was opened from.
export const RECAP_SOURCES = Object.freeze({
    PASSPORT: 'passport',
    PROFILE: 'profile',
    NOTIFICATION: 'notification',
});

// The ways to get a first stamp, offered on an unstarted passport.
export const PASSPORT_START_STEPS = Object.freeze({
    TRIP: 'trip',
    VAN_LOG: 'van_log',
    DIARY: 'diary',
    DECLARE: 'declare',
});

export const PASSPORT_SHARE_METHODS = Object.freeze({
    SHARE_SHEET: 'share_sheet',
    DOWNLOAD: 'download',
    COPY_LINK: 'copy_link',
});

export const PASSPORT_VIEWERS = Object.freeze({
    OWNER: 'owner',
    MEMBER: 'member',
    ANONYMOUS: 'anonymous',
});

const REFERRAL_PARAM = /([?&]ref=)[^&#]*/g;
const REDACTED_REFERRAL_CODE = 'shared';

// A referral code is the username of whoever shared the link, who never
// agreed to this visitor's analytics: it is replaced before anything leaves
// the browser. Who referred whom is already recorded in our own database.
export const withoutReferralCode = (value) => (
    typeof value === 'string' ? value.replace(REFERRAL_PARAM, `$1${REDACTED_REFERRAL_CODE}`) : value
);

const redactValues = (properties) => (
    properties
        ? Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, withoutReferralCode(value)]))
        : properties
);

// PostHog `before_send` hook: URLs travel in the event properties and in the
// person properties it sets ($set / $set_once, e.g. the initial URL).
export const redactReferralCodes = (event) => {
    if (!event) return event;
    const properties = redactValues(event.properties);
    return {
        ...event,
        properties: properties && { ...properties, $set: redactValues(properties.$set), $set_once: redactValues(properties.$set_once) },
        $set: redactValues(event.$set),
        $set_once: redactValues(event.$set_once),
    };
};
