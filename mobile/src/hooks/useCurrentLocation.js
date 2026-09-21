import { useState } from 'react';
import * as Location from 'expo-location';

export const useCurrentLocation = () => {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('location permission denied');

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: position.coords.latitude, lon: position.coords.longitude };
    } finally {
      setLoading(false);
    }
  };

  return { getCurrentLocation, loading };
};
