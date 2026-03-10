const baseUrl = `${import.meta.env.VITE_API_URL}/itineraries`;

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

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
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
    const response = await fetch(`${baseUrl}/featured`, {
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

export const getItinerariesByUserId = async (id) => {
    const response = await fetch(`${baseUrl}/${id}`, {
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

