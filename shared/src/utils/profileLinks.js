// Profile links by name, the way people say them: /@tbat instead of the
// account's internal id. The same name is the owner's invite code.
export const PROFILE_HANDLE_PREFIX = '@';

export const profilePath = (username) => `/${PROFILE_HANDLE_PREFIX}${encodeURIComponent(username)}`;

// The owner's own link carries their code: whoever signs up from it counts
// as invited by them.
export const profileShareUrl = (webUrl, username, referralCode = null) => {
    const url = `${webUrl}${profilePath(username)}`;
    return referralCode ? `${url}?ref=${encodeURIComponent(referralCode)}` : url;
};

// "@tbat" from the URL, or null when the segment isn't a handle at all.
export const usernameFromHandle = (handle) => {
    if (!handle?.startsWith(PROFILE_HANDLE_PREFIX)) return null;
    const username = handle.slice(PROFILE_HANDLE_PREFIX.length);
    return username || null;
};
