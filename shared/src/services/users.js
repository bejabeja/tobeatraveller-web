import { parseError } from "../utils/parseError";
import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/users`;
const UNAUTHORIZED = 401;

// authFetch, not fetch: signed in (editing the profile), one's own name in
// other capitals and one's own earlier names count as available.
export const checkUsernameAvailable = async (username) => {
    const response = await authFetch(`${baseUrl()}/check-username?username=${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.available;
};

// Null only when there is no session (401). Any other failure (the server
// down, rate limited, no connection) throws: "couldn't check" and "logged
// out" need different handling (see initAuthUser).
export const getUserForAuth = async () => {
    const response = await authFetch(`${baseUrl()}/me`, {
        headers: { 'Content-Type': 'application/json' },
    });
    if (response.status === UNAUTHORIZED) return null;
    if (!response.ok) await parseError(response, 'Could not check the session');
    return response.json();
}
// authFetch, not fetch: signed in, the API leaves out who they already
// follow (and themselves); signed out it still answers.
export const getFeaturedUsers = async () => {
    try {
        const response = await authFetch(`${baseUrl()}/featured`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            await parseError(response, 'Failed to get users');
        }
        return response.json();
    } catch (err) {
        return null;
    }
}

export const getUserByUsername = async (username) => {
    const response = await authFetch(`${baseUrl()}/by-username/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        await parseError(response, 'Failed to get user');
    }
    return response.json();
};

export const getUserById = async (id) => {
    const response = await authFetch(`${baseUrl()}/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        await parseError(response, 'Failed to get user');
    }
    return response.json();
}

export const updateUser = async (data) => {
    const isFormData = data instanceof FormData;
    const response = await authFetch(`${baseUrl()}/me`, {
        method: 'PUT',
        ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
        body: isFormData ? data : JSON.stringify(data),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update user');
    }
    return response.json();
}


export const changePassword = async ({ currentPassword, newPassword }) => {
    const response = await authFetch(`${baseUrl()}/me/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update password');
    }
    return response.json();
};

// How the user says they travel, to start them off with what helps most.
export const updateMyTravelStyle = async (travelStyle) => {
    const response = await authFetch(`${baseUrl()}/me/travel-style`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelStyle }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update how you travel');
    }
};

// The language the user uses the app in, so their emails go in it too.
export const updateMyLanguage = async (language) => {
    const response = await authFetch(`${baseUrl()}/me/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update language');
    }
};

export const deleteMyAccount = async () => {
    const response = await authFetch(`${baseUrl()}/me`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        await parseError(response, 'Failed to delete account');
    }
    return response.json();
};

export const deleteUserById = async (id) => {
    const response = await authFetch(`${baseUrl()}/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        await parseError(response, 'Failed to delete user');
    }
    return response.json();
};

// Gathers every table the user has data in, so it gets longer than the default.
export const EXPORT_TIMEOUT_MS = 60_000;

export const exportMyData = async () => {
    const response = await authFetch(`${baseUrl()}/me/export`, { timeoutMs: EXPORT_TIMEOUT_MS });
    if (!response.ok) {
        await parseError(response, 'Failed to export data');
    }
    return response.json();
};

export const getSuggestedUsers = async () => {
    try {
        const response = await authFetch(`${baseUrl()}/suggested`);
        if (!response.ok) return [];
        return response.json();
    } catch {
        return [];
    }
};

export const getAllUsers = async ({ searchName = '', page = 1, limit = 9, sortBy = 'username' } = {}) => {
    const params = new URLSearchParams();
    if (searchName) params.append("searchName", searchName);
    params.append('page', page);
    params.append('limit', limit);
    params.append('sortBy', sortBy);

    const response = await fetch(`${baseUrl()}/all?${params.toString()}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        await parseError(response, "Failed to get users");
    }
    return response.json();
};

export const getAllUsersForAdmin = async ({ searchName = '', page = 1, limit = 20, sortBy = 'username', role, isPremium } = {}) => {
    const params = new URLSearchParams();
    if (searchName) params.append("searchName", searchName);
    params.append('page', page);
    params.append('limit', limit);
    params.append('sortBy', sortBy);
    if (role) params.append('role', role);
    if (isPremium !== undefined) params.append('isPremium', isPremium);

    const response = await authFetch(`${baseUrl()}/admin?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to get users");
    }
    return response.json();
};

export const updateUserRole = async (id, role) => {
    const response = await authFetch(`${baseUrl()}/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update role');
    }
    return response.json();
};

// `months` only when gifting premium; left out, the gift doesn't expire.
export const updateUserTier = async (id, tier, months) => {
    const response = await authFetch(`${baseUrl()}/${id}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, months }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update tier');
    }
    return response.json();
};

export const sendAdminNotice = async (id, message) => {
    const response = await authFetch(`${baseUrl()}/${id}/notice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to send notice');
    }
};
