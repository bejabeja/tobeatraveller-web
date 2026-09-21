const GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";
const GEOAPIFY_REVERSE_URL = "https://api.geoapify.com/v1/geocode/reverse";

const autocomplete = async (query, { apiKey, type, bias } = {}) => {
    const params = new URLSearchParams({
        text: query,
        apiKey,
        limit: 5,
        lang: "en",
    });

    if (type) params.set("type", type);
    if (bias) params.set("bias", `proximity:${bias.lon},${bias.lat}`);

    const response = await fetch(`${GEOAPIFY_AUTOCOMPLETE_URL}?${params}`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.features ?? [];
};

const mapDestination = (feature) => {
    const p = feature.properties;
    return {
        name: p.city ?? p.county ?? p.state ?? p.country ?? p.name,
        country: p.country,
        label: p.formatted,
        coordinates: { lat: p.lat, lon: p.lon },
    };
};

const mapPlace = (feature) => {
    const p = feature.properties;
    return {
        name: p.name ?? p.formatted,
        label: p.formatted,
        coordinates: { lat: p.lat, lon: p.lon },
    };
};

// Reverse geocoding a device's exact GPS position returns the most precise
// feature at that point (a full street address), but a destination field
// expects city-level granularity: build the label from the city/country
// only, never the street-level `formatted` string, regardless of what the
// API returns (data minimization: don't surface an exact home address).
const mapCityLevel = (feature) => {
    const p = feature.properties;
    const name = p.city ?? p.county ?? p.state ?? p.country ?? p.name;
    return {
        name,
        country: p.country,
        label: [name, p.country].filter(Boolean).join(", "),
        coordinates: { lat: p.lat, lon: p.lon },
    };
};

export const searchDestinations = async (query, { apiKey, bias } = {}) => {
    const features = await autocomplete(query, { apiKey, bias });
    return features.map(mapDestination);
};

export const searchPOIs = async (query, { apiKey, bias } = {}) => {
    const features = await autocomplete(query, { apiKey, type: "amenity", bias });
    return features.map(mapPlace);
};

export const reverseGeocode = async ({ lat, lon, apiKey }) => {
    const params = new URLSearchParams({ lat, lon, apiKey, lang: "en", limit: 1 });
    const response = await fetch(`${GEOAPIFY_REVERSE_URL}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const [feature] = data.features ?? [];
    return feature ? mapCityLevel(feature) : null;
};
