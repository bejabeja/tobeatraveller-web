import { parseError } from "../utils/parseError";
import { getApiUrl } from "../utils/apiConfig";
import { tokenStorage } from "../utils/tokenStorage";

const baseUrl = () => getApiUrl();

export const createNewUser = async (user) => {
    const response = await fetch(`${baseUrl()}/auth/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
    });
    if (!response.ok) {
        await parseError(response, 'Create user failed');
    }
    return response.json();
};

export const login = async (user) => {
    const response = await fetch(`${baseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
        credentials: 'omit',
    });
    if (!response.ok) await parseError(response, 'Login failed');

    const data = await response.json();
    await tokenStorage.setItem('access_token', data.accessToken);
    if (data.refreshToken) await tokenStorage.setItem('refresh_token', data.refreshToken);
    return data.user;
};

export const logout = async () => {
    const token = await tokenStorage.getItem('access_token');
    try {
        await fetch(`${baseUrl()}/auth/logout`, {
            method: 'POST',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
    } catch {}
    await tokenStorage.removeItem('access_token');
    await tokenStorage.removeItem('refresh_token');
};
