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

    return { getCurrentLocation, loading };
};
