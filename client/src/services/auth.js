import { parseError } from "../utils/parseError";

const baseUrl = import.meta.env.VITE_API_URL;

export const createNewUser = async (user) => {
    const response = await fetch(`${baseUrl}/auth/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    }
    );
    if (!response.ok) {
        await parseError(response, 'Create user failed');
    }
    return response.json();
}

export const login = async (user) => {
    try {
        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
            credentials: 'include',
        });
        if (!response.ok) await parseError(response, 'Login failed');

        const data = await response.json();
        // Store token so authFetch (shared services: feed, notifications, etc.) can use it
        if (data.accessToken) {
            localStorage.setItem('access_token', data.accessToken);
        }
        if (data.refreshToken) {
            localStorage.setItem('refresh_token', data.refreshToken);
        }
        return data.user;
    } catch (error) {
        console.error(error);
        await parseError(error);
    }
};

export const logout = async () => {
    const response = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        await parseError(response, 'Logout failed');
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    return response.json();
}
