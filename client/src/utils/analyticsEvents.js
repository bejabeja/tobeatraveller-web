// The passport sharing funnel: a passport is shared, the link is opened, the
// visitor clicks the invite and signs up.
export const ANALYTICS_EVENTS = Object.freeze({
  PASSPORT_VIEWED: "passport_viewed",
  PASSPORT_SHARE_OPENED: "passport_share_opened",
  PASSPORT_SHARED: "passport_shared",
  PASSPORT_INVITE_CLICKED: "passport_invite_clicked",
  PASSPORT_COUNTRIES_DECLARED: "passport_countries_declared",
  USER_SIGNED_UP: "user_signed_up",
});

export const PASSPORT_SHARE_SOURCES = Object.freeze({
  PASSPORT_PAGE: "passport_page",
  PROFILE: "profile",
  NOTIFICATION: "notification",
});

export const PASSPORT_SHARE_METHODS = Object.freeze({
  SHARE_SHEET: "share_sheet",
  DOWNLOAD: "download",
  COPY_LINK: "copy_link",
});

export const PASSPORT_VIEWERS = Object.freeze({
  OWNER: "owner",
  MEMBER: "member",
  ANONYMOUS: "anonymous",
});

const REFERRAL_PARAM = /([?&]ref=)[^&#]*/g;
const REDACTED_REFERRAL_CODE = "shared";

// A referral code is the username of whoever shared the link, who never
// agreed to this visitor's analytics: it is replaced before anything leaves
// the browser. Who referred whom is already recorded in our own database.
export const withoutReferralCode = (value) => (
  typeof value === "string" ? value.replace(REFERRAL_PARAM, `$1${REDACTED_REFERRAL_CODE}`) : value
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
