// A user's invite code is their username, lowercased: memorable, easy to say
// out loud, and unique like usernames already are (case-insensitively).
export const referralCodeFromUsername = (username) => username.trim().toLowerCase();

// How long an earlier code stays theirs after a change of username.
export const RETIRED_REFERRAL_CODE_RESERVATION = '1 year';
