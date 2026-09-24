let capturedNetInfoListener;

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((listener) => {
    capturedNetInfoListener = listener;
    return jest.fn();
  }),
}));

jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `uuid-${++counter}` };
});

jest.mock('../../offline/changeExecutors', () => ({ executeChange: jest.fn() }));

jest.mock('@tobeatraveller/shared', () => {
  const { isNetworkError } = jest.requireActual('../../../../shared/src/utils/parseError.js');
  return { isNetworkError };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { executeChange } from '../../offline/changeExecutors';
import { clearOutbox, getOutboxState, loadOutbox, runOrQueue, setOutboxOnline } from '../../offline/outbox';
import { CHANGE_KINDS, COLLECTIONS } from '../../offline/pendingChanges';
import { useOutboxSync, useRefetchAfterSync } from '../../offline/useOutbox';

const vanLogCreate = (entityId) => ({
  collection: COLLECTIONS.VAN_LOG, kind: CHANGE_KINDS.CREATE, entityId, payload: { id: entityId },
});

const waitForSyncToFinish = async () => {
  while (getOutboxState().syncing) await new Promise(resolve => setImmediate(resolve));
};

beforeEach(async () => {
  await clearOutbox();
  await AsyncStorage.clear();
  executeChange.mockReset();
  setOutboxOnline(true);
  await loadOutbox('user-1');
});

describe('useRefetchAfterSync', () => {
  // Regression: refetching whenever syncVersion was above zero also fired on
  // mount, racing the screen's own focus load (and seeding the default
  // packing checklist twice).
  it('does not refetch on mount, even after earlier syncs', async () => {
    executeChange.mockResolvedValue({});
    setOutboxOnline(false);
    await runOrQueue(vanLogCreate('entry-1'));
    setOutboxOnline(true);
    await waitForSyncToFinish();
    expect(getOutboxState().syncVersion).toBeGreaterThan(0);
    const refetch = jest.fn();

    await renderHook(() => useRefetchAfterSync(refetch));

    expect(refetch).not.toHaveBeenCalled();
  });

  it('refetches once a sync has sent something', async () => {
    const refetch = jest.fn();
    await renderHook(() => useRefetchAfterSync(refetch));
    executeChange.mockResolvedValue({});

    await act(async () => {
      setOutboxOnline(false);
      await runOrQueue(vanLogCreate('entry-2'));
      setOutboxOnline(true);
      await waitForSyncToFinish();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('useOutboxSync', () => {
  // Campsite wifi often connects without reaching the internet; requests then
  // hang instead of failing, so the change should queue straight away.
  it('treats wifi without internet access as offline', async () => {
    await renderHook(() => useOutboxSync('user-1'));

    await act(async () => capturedNetInfoListener({ isConnected: true, isInternetReachable: false }));
    const outcome = await runOrQueue(vanLogCreate('entry-3'));

    expect(outcome).toEqual({ queued: true });
    expect(executeChange).not.toHaveBeenCalled();
  });

  it('stays online while internet reachability is still unknown', async () => {
    executeChange.mockResolvedValue({ id: 'entry-4' });
    await renderHook(() => useOutboxSync('user-1'));

    await act(async () => capturedNetInfoListener({ isConnected: true, isInternetReachable: null }));
    const outcome = await runOrQueue(vanLogCreate('entry-4'));

    expect(outcome).toEqual({ queued: false, result: { id: 'entry-4' } });
  });
});
