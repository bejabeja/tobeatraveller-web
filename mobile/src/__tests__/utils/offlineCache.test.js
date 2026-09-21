jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheGet, cacheSet } from '../../utils/offlineCache';

describe('cacheSet', () => {
  it('stores the value JSON-stringified under the prefixed key', async () => {
    AsyncStorage.setItem.mockResolvedValue();

    await cacheSet('vanlog:entries:user-1', [{ id: '1' }]);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'offline-cache:vanlog:entries:user-1',
      JSON.stringify([{ id: '1' }])
    );
  });

  it('does not throw when AsyncStorage.setItem fails (best-effort cache)', async () => {
    AsyncStorage.setItem.mockRejectedValue(new Error('disk full'));

    await expect(cacheSet('key', { a: 1 })).resolves.toBeUndefined();
  });
});

describe('cacheGet', () => {
  it('returns the round-tripped JSON value from the prefixed key', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([{ id: '1' }]));

    const result = await cacheGet('vanlog:entries:user-1');

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline-cache:vanlog:entries:user-1');
    expect(result).toEqual([{ id: '1' }]);
  });

  it('returns null when nothing is cached for that key', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    expect(await cacheGet('missing-key')).toBeNull();
  });

  it('returns null instead of throwing when the cached JSON is corrupt', async () => {
    AsyncStorage.getItem.mockResolvedValue('{not valid json');

    expect(await cacheGet('corrupt-key')).toBeNull();
  });

  it('returns null instead of throwing when AsyncStorage.getItem fails', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('read error'));

    expect(await cacheGet('key')).toBeNull();
  });
});
