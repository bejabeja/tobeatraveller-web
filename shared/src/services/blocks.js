import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';
import { parseError } from '../utils/parseError';

const baseUrl = () => `${getApiUrl()}/blocks`;

export const getBlockedUsers = async () => {
    const response = await authFetch(baseUrl());
    if (!response.ok) {
        await parseError(response, 'Failed to load the blocked people');
    }
    return response.json();
};

export const getBlockStatus = async (userId) => {
    const response = await authFetch(`${baseUrl()}/${userId}`);
    if (!response.ok) {
        await parseError(response, 'Failed to check the block');
    }
    return response.json();
};

export const blockUser = async (userId) => {
    const response = await authFetch(`${baseUrl()}/${userId}`, { method: 'POST' });
    if (!response.ok) {
        await parseError(response, 'Failed to block');
    }
    return null;
};

export const unblockUser = async (userId) => {
    const response = await authFetch(`${baseUrl()}/${userId}`, { method: 'DELETE' });
    if (!response.ok) {
        await parseError(response, 'Failed to unblock');
    }
    return null;
};
