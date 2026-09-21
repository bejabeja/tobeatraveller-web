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

  // Silent variant used to bias text search results: only returns a
  // position when permission was already granted (e.g. from a previous tap
  // on "use my location"), never prompts on its own - typing in a search
  // field shouldn't trigger a permission dialog.
  const getLocationIfPermitted = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: position.coords.latitude, lon: position.coords.longitude };
    } catch {
      return null;
    }
  };

  return { getCurrentLocation, getLocationIfPermitted, loading };
};
