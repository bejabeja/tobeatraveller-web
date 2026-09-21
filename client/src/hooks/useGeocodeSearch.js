import {
    reverseGeocode as reverseGeocodeShared,
    searchDestinations as searchDestinationsShared,
    searchPOIs as searchPOIsShared,
} from "@tobeatraveller/shared";

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY;

export const useGeocodeSearch = () => {
    const searchDestinations = (query) => searchDestinationsShared(query, { apiKey: GEOAPIFY_KEY });

    const searchPOIs = (query, destination = null) => {
        const bias = destination?.coordinates?.lat
            ? { lat: destination.coordinates.lat, lon: destination.coordinates.lon }
            : null;

        return searchPOIsShared(query, { apiKey: GEOAPIFY_KEY, bias });
    };

    const reverseGeocode = ({ lat, lon }) => reverseGeocodeShared({ lat, lon, apiKey: GEOAPIFY_KEY });

    // backward compat: destination search uses searchDestinations
    const searchPlaces = searchDestinations;

    return { searchPlaces, searchDestinations, searchPOIs, reverseGeocode };
};
