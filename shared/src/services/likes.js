import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/likes`;

export const toggleLike = async (itineraryId) => {
    const response = await authFetch(`${baseUrl()}/${itineraryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to toggle like");
    return response.json();
};

export const checkIsLiked = async (itineraryId) => {
    const response = await authFetch(`${baseUrl()}/${itineraryId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to check like");
    return response.json();
};
