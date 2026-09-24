let capturedListener;

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((listener) => {
    capturedListener = listener;
    return jest.fn(); // unsubscribe
  }),
}));

import { act, renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  it('starts out connected before NetInfo reports anything', async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(true);
  });

  it('becomes disconnected when NetInfo reports isConnected: false', async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => capturedListener({ isConnected: false }));

    expect(result.current.isConnected).toBe(false);
  });

  // Regression: isConnected is compared with `!== false`, not `=== true`,
  // so an ambiguous NetInfo state (null/undefined, which it does report
  // while still determining connectivity) is treated as connected instead
  // of flashing the offline banner for a state that isn't actually "offline".
  it('treats an ambiguous null/undefined isConnected as still connected', async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => capturedListener({ isConnected: false }));
    await act(async () => capturedListener({ isConnected: null }));

    expect(result.current.isConnected).toBe(true);
  });

  it('shows offline on wifi that has no internet access behind it', async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => capturedListener({ isConnected: true, isInternetReachable: false }));

    expect(result.current.isConnected).toBe(false);
  });
});
