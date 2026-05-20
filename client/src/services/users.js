import { parseError } from "../utils/parseError";

const baseUrl = `${import.meta.env.VITE_API_URL}/users`;

export const checkUsernameAvailable = async (username) => {
    const response = await fetch(`${baseUrl}/check-username?username=${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.available;
};

export const getUserForAuth = async () => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const headers = { 'Content-Type': 'application/json' };

    if (isMobile) {
        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(`${baseUrl}/me`, {
            method: 'GET',
            credentials: isMobile ? 'omit' : 'include',
            headers
        });

        if (!response.ok) {
            await parseError(response, 'Failed to get user');
            return null
        }
        return response.json();
    } catch (err) {
        return null;
    }
}
export const getfeaturedUsers = async () => {
    try {
        const response = await fetch(`${baseUrl}/featured`, {
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
        const response = await fetch(`${baseUrl}/${id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
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
    const response = await fetch(`${baseUrl}/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        await parseError(response, 'Failed to update user');
    }
    return response.json();
}


export const getAllUsers = async ({ searchName = '', page = 1, limit = 9 } = {}) => {
    const params = new URLSearchParams();
    if (searchName) params.append("searchName", searchName);
    params.append('page', page)
    params.append('limit', limit)

    const response = await fetch(`${baseUrl}/all?${params.toString()}`, {
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
