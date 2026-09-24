import { parseError } from "../utils/parseError";
import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/users`;

export const checkUsernameAvailable = async (username) => {
    const response = await fetch(`${baseUrl()}/check-username?username=${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.available;
};

// Resolves to null when there is no valid session, but lets a network
// failure through: "offline" and "logged out" need different handling
// (see initAuthUser).
export const getUserForAuth = async () => {
    const response = await authFetch(`${baseUrl()}/me`, {
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return response.json();
}
export const getFeaturedUsers = async () => {
    try {
        const response = await fetch(`${baseUrl()}/featured`, {
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

export const getAllUsersForAdmin = async ({ searchName = '', page = 1, limit = 20, sortBy = 'username' } = {}) => {
    const params = new URLSearchParams();
    if (searchName) params.append("searchName", searchName);
    params.append('page', page);
    params.append('limit', limit);
    params.append('sortBy', sortBy);

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

export const updateUserTier = async (id, tier) => {
    const response = await authFetch(`${baseUrl()}/${id}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update tier');
    }
    return response.json();
};
