const USER_HINT_KEY = 'user_hint';

// Who was last signed in on this browser (a few public fields, no token), so
// a reload shows them signed in straight away while the session is checked.
export const getUserHint = () => {
    try {
        const hint = localStorage.getItem(USER_HINT_KEY);
        return hint ? JSON.parse(hint) : null;
    } catch { return null; }
};

export const saveUserHint = (user) => {
    if (user) {
        localStorage.setItem(USER_HINT_KEY, JSON.stringify({ id: user.id, username: user.username, avatarUrl: user.avatarUrl, role: user.role }));
    } else {
        localStorage.removeItem(USER_HINT_KEY);
    }
};
