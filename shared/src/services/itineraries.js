import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/itineraries`;

export const getStats = async () => {
    const response = await fetch(`${baseUrl()}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
};

export const getItinerariesByFilters = async (filters = {}) => {
    const { page = 1, limit = 10, ...rest } = filters;
    const params = new URLSearchParams();
    Object.entries(rest).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
            params.append(key, value);
        }
    });

    params.append('page', page)
    params.append('limit', limit)

    const response = await fetch(`${baseUrl()}?${params.toString()}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        await parseError(response, "Failed to fetch filtered itineraries");
    }

    return response.json();
}

export const getfeaturedItineraries = async () => {
    const response = await fetch(`${baseUrl()}/featured`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        await parseError(response, 'Failed to get itineraries');
    }
    return response.json();
}

export const generateSmartItinerary = async ({ destination, days, category, numberOfTravellers, budget, currency }) => {
    const itineraryBase = `${getApiUrl()}/itinerary`;
    const response = await authFetch(`${itineraryBase}/generate-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, days, category, numberOfTravellers, budget, currency }),
    });
    if (!response.ok) throw new Error('Failed to generate itinerary');
    return response.json();
};

export const getDestinations = async () => {
    const response = await fetch(`${baseUrl()}/destinations`);
    if (!response.ok) throw new Error('Failed to fetch destinations');
    return response.json();
};

export const getFeedItineraries = async (page = 1) => {
    const response = await authFetch(`${baseUrl()}/feed?page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch feed');
    return response.json();
};

export const getItinerariesByUserId = async (id) => {
    const response = await fetch(`${baseUrl()}/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        await parseError(response, 'Failed to get my itineraries');
    }
    return response.json();
}

