import { parseError } from "../utils/parseError";
import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/itinerary`;

export const getItineraryById = async (id) => {
    const response = await fetch(`${baseUrl()}/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError("Failed to fetch itinerary");
    }
    return response.json();
};

export const createItinerary = async (formData) => {
    const response = await authFetch(`${baseUrl()}`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) {
        await parseError("Failed to create itinerary");
    }
    return response.json();
};

export const deleteItinerary = async (id) => {
    const response = await authFetch(`${baseUrl()}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError("Failed to delete itinerary");
    }
    return null;
};

export const updateItinerary = async (id, formData) => {
    const response = await authFetch(`${baseUrl()}/edit/${id}`, {
        method: "PATCH",
        body: formData,
    });
    if (!response.ok) {
        await parseError("Failed to update itinerary");
    }
    return response.json();
};