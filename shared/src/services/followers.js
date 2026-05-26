import { parseError } from "../utils/parseError";
import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/users`;

export const followUser = async (id) => {
    try {
        const response = await authFetch(`${baseUrl()}/${id}/follow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) await parseError(response, 'Failed to follow user');
        return response.json();
    } catch {
        return null;
    }
};

export const unfollowUser = async (id) => {
    try {
        const response = await authFetch(`${baseUrl()}/${id}/follow`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) await parseError(response, 'Failed to unfollow user');
        return response.json();
    } catch {
        return null;
    }
};

export const getAllFollowers = async (id) => {
    try {
        const response = await authFetch(`${baseUrl()}/${id}/followers`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) await parseError(response, 'Failed to get followers');
        return response.json();
    } catch {
        return null;
    }
};

export const getAllFollowing = async (id) => {
    try {
        const response = await authFetch(`${baseUrl()}/${id}/following`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) await parseError(response, 'Failed to get following');
        return response.json();
    } catch {
        return null;
    }
};