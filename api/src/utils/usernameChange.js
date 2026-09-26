// A username can change once every 30 days, like on TikTok: room to fix a
// bad choice, not to keep rotating it (each change also reserves the old
// name as an invite code for a year, see referralCode.js).
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
const COOLDOWN_MS = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// When the next change is allowed, or null if it already is.
export const usernameChangeAvailableAt = (changedAt, now = new Date()) => {
    if (!changedAt) return null;
    const availableAt = new Date(new Date(changedAt).getTime() + COOLDOWN_MS);
    return availableAt > now ? availableAt : null;
};

// Only a different name counts: "ana" to "Ana" keeps the same code and link.
export const isUsernameChange = (currentUsername, newUsername) =>
    Boolean(newUsername) && newUsername.trim().toLowerCase() !== currentUsername.trim().toLowerCase();
