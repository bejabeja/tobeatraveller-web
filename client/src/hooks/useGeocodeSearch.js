const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY;

export const useGeocodeSearch = () => {
    const searchPlaces = async (query, cityContext = "") => {
        const fullQuery = cityContext.name ? `${query} ${cityContext.label}` : query;

        const params = new URLSearchParams({
            text: fullQuery,
            apiKey: GEOAPIFY_KEY,
            limit: 5,
            lang: "en",
        });

        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?${params}`
        );

        if (!response.ok) {
            console.error("Geoapify error:", response.status, await response.text());
            return [];
        }

        const data = await response.json();

        return (data.features ?? []).map((item) => {
            const p = item.properties;
            return {
                name: p.city ?? p.county ?? p.state ?? p.country ?? p.name,
                label: p.formatted,
                coordinates: {
                    lat: p.lat,
                    lon: p.lon,
                },
            };
        });
    };

    return { searchPlaces };
};
