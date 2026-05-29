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

export const forgotPassword = async (email) => {
    const response = await fetch(`${baseUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (!response.ok) await parseError(response, 'Forgot password failed');
    return response.json();
};

export const resetPassword = async (token, newPassword) => {
    const response = await fetch(`${baseUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
    });
    if (!response.ok) await parseError(response, 'Reset password failed');
    return response.json();
};

export const sendContact = async ({ name, email, subject, message }) => {
    const response = await fetch(`${baseUrl()}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
    });
    if (!response.ok) await parseError(response, 'Contact failed');
    return response.json();
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
