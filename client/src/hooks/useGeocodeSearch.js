const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY;

const geocode = async (query, { type, bias } = {}) => {
    const params = new URLSearchParams({
        text: query,
        apiKey: GEOAPIFY_KEY,
        limit: 5,
        lang: "en",
    });

    if (type) params.set("type", type);
    if (bias) params.set("bias", `proximity:${bias.lon},${bias.lat}`);

    const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?${params}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.features ?? [];
};

export const useGeocodeSearch = () => {
    const searchDestinations = async (query) => {
        const features = await geocode(query);
        return features.map((item) => {
            const p = item.properties;
            return {
                name: p.city ?? p.county ?? p.state ?? p.country ?? p.name,
                label: p.formatted,
                coordinates: { lat: p.lat, lon: p.lon },
            };
        });
    };

    const searchPOIs = async (query, destination = null) => {
        const bias = destination?.coordinates?.lat
            ? { lat: destination.coordinates.lat, lon: destination.coordinates.lon }
            : null;

        const features = await geocode(query, { type: "amenity", bias });
        return features.map((item) => {
            const p = item.properties;
            return {
                name: p.name ?? p.formatted,
                label: p.formatted,
                coordinates: { lat: p.lat, lon: p.lon },
            };
        });
    };

    // backward compat — destination search uses searchDestinations
    const searchPlaces = searchDestinations;

    return { searchPlaces, searchDestinations, searchPOIs };
};
