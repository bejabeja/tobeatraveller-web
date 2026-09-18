import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/itineraries`;
const GENERATE_TIMEOUT_MS = 60_000;
export const GENERATE_TIMEOUT_MESSAGE = 'AI generation timed out';

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

export const getFeaturedItineraries = async () => {
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

export const generateSmartItinerary = async ({ destination, days, category, numberOfTravellers, budget, currency, intention, language, pace }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
    try {
        const response = await authFetch(`${baseUrl()}/generate-smart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination, days, category, numberOfTravellers, budget, currency, intention, language, pace }),
            signal: controller.signal,
        });
        if (!response.ok) await parseError(response, 'Failed to generate itinerary');
        return response.json();
    } catch (error) {
        if (error.name === 'AbortError') throw new Error(GENERATE_TIMEOUT_MESSAGE);
        throw error;
    } finally {
        clearTimeout(timeout);
    }
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

export const getMyItineraries = async () => {
    const response = await authFetch(`${baseUrl()}/mine`);
    if (!response.ok) await parseError(response, 'Failed to get my itineraries');
    return response.json();
};

export const getItinerariesByUserId = async (id) => {
    const response = await fetch(`${baseUrl()}/user/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        await parseError(response, 'Failed to get my itineraries');
    }
    return response.json();
}

