jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import { act, renderHook } from '@testing-library/react-native';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';

const POSITION = { coords: { latitude: 40.4, longitude: -3.7 } };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCurrentLocation (prompts for permission)', () => {
  it('returns {lat, lon} when permission is granted', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue(POSITION);
    const { result } = await renderHook(() => useCurrentLocation());

    let coords;
    await act(async () => { coords = await result.current.getCurrentLocation(); });

    expect(coords).toEqual({ lat: 40.4, lon: -3.7 });
  });

  it('throws when permission is denied', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { result } = await renderHook(() => useCurrentLocation());

    await act(async () => {
      await expect(result.current.getCurrentLocation()).rejects.toThrow('location permission denied');
    });
  });
});

// Regression: these two are deliberately asymmetric. getLocationIfPermitted
// is the "silent" variant used to bias text search - it must never throw
// and never prompt, unlike getCurrentLocation (used by the explicit "use my
// location" button, which is allowed to prompt and to throw on denial).
describe('getLocationIfPermitted (never prompts, never throws)', () => {
  it('returns {lat, lon} when permission is already granted', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue(POSITION);
    const { result } = await renderHook(() => useCurrentLocation());

    let coords;
    await act(async () => { coords = await result.current.getLocationIfPermitted(); });

    expect(coords).toEqual({ lat: 40.4, lon: -3.7 });
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns null (does not throw) when permission was never granted', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    const { result } = await renderHook(() => useCurrentLocation());

    await act(async () => {
      await expect(result.current.getLocationIfPermitted()).resolves.toBeNull();
    });
  });

  it('returns null (does not throw) when permission is granted but getCurrentPositionAsync fails', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockRejectedValue(new Error('location unavailable'));
    const { result } = await renderHook(() => useCurrentLocation());

    await act(async () => {
      await expect(result.current.getLocationIfPermitted()).resolves.toBeNull();
    });
  });
});
