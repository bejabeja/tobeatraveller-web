// Opens in the maps app the person has: the universal Google Maps link is
// handed to the app on a phone and opens in the browser on a computer.
const DIRECTIONS_BASE_URL = 'https://www.google.com/maps/dir/?api=1&destination=';

export const placeDirectionsUrl = (place) => {
    const latitude = Number.parseFloat(place?.latitude);
    const longitude = Number.parseFloat(place?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return `${DIRECTIONS_BASE_URL}${latitude},${longitude}`;
};
