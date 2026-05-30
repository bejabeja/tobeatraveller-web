import { parseError } from "../utils/parseError";
import { getApiUrl } from "../utils/apiConfig";
import { tokenStorage } from "../utils/tokenStorage";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/users`;

export const checkUsernameAvailable = async (username) => {
    const response = await fetch(`${baseUrl()}/check-username?username=${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.available;
};

export const getUserForAuth = async () => {
    const token = await tokenStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(`${baseUrl()}/me`, {
            method: 'GET',
            credentials: 'omit',
            headers,
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}
export const getfeaturedUsers = async () => {
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
    try {
        const response = await authFetch(`${baseUrl()}/${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            await parseError(response, 'Failed to get user');
        }
        return response.json();
    } catch (err) {
        return null;
    }

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


export const deleteMyAccount = async () => {
    const response = await authFetch(`${baseUrl()}/me`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        await parseError(response, 'Failed to delete account');
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
