import { useState } from "react";

export const useCurrentLocation = () => {
    const [loading, setLoading] = useState(false);

    const getCurrentLocation = () => {
        setLoading(true);
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                setLoading(false);
                reject(new Error("Geolocation is not supported by this browser"));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLoading(false);
                    resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
                },
                (error) => {
                    setLoading(false);
                    reject(error);
                },
                { enableHighAccuracy: false, timeout: 10000 }
            );
        });
    };

    // Silent variant used to bias text search results: only returns a
    // position when permission was already granted (e.g. from a previous
    // click on "use my location"), never prompts on its own - typing in a
    // search field shouldn't trigger a browser permission dialog.
    const getLocationIfPermitted = async () => {
        if (!navigator.geolocation || !navigator.permissions?.query) return null;
        try {
            const status = await navigator.permissions.query({ name: "geolocation" });
            if (status.state !== "granted") return null;
        } catch {
            return null;
        }
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: false, timeout: 5000 }
            );
        });
    };

    return { getCurrentLocation, getLocationIfPermitted, loading };
};
