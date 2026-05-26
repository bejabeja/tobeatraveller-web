import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/favorites`;

export const addFavorite = async (itineraryId) => {
    const response = await authFetch(`${baseUrl()}/${itineraryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError("Failed to add favorite");
    }
    return response.json();
};

export const removeFavorite = async (itineraryId) => {
    const response = await authFetch(`${baseUrl()}/${itineraryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError("Failed to remove favorite");
    }
    return response.json();
};

export const getUserFavorites = async () => {
    const response = await authFetch(`${baseUrl()}/user`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError("Failed to get favorites");
    }
    return response.json();
};

export const checkIsFavorite = async (itineraryId) => {
    const response = await authFetch(`${baseUrl()}/${itineraryId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError("Failed to check is favorite");
    }
    return response.json();
}