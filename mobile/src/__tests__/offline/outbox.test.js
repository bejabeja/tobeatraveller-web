jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `uuid-${++counter}` };
});

jest.mock('../../offline/changeExecutors', () => ({ executeChange: jest.fn() }));

jest.mock('@tobeatraveller/shared', () => {
  const { isNetworkError, isTimeoutError } = jest.requireActual('../../../../shared/src/utils/parseError.js');
  return { isNetworkError, isTimeoutError };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next from 'i18next';
import '../../i18n';
import * as outbox from '../../offline/outbox';
import * as pendingChanges from '../../offline/pendingChanges';
import { executeChange } from '../../offline/changeExecutors';

const networkError = () => Object.assign(new Error('Network request failed'), { isNetworkError: true });
const timeoutError = () => Object.assign(new Error('Request timed out'), { isNetworkError: true, isTimeout: true });
const httpError = (status, message) => Object.assign(new Error(message), { status });

const USER_ID = 'user-1';
const STORAGE_KEY = `offline-outbox:${USER_ID}`;

const vanLogCreate = (entityId, payload = {}) => ({
  collection: pendingChanges.COLLECTIONS.VAN_LOG,
  kind: pendingChanges.CHANGE_KINDS.CREATE,
  entityId,
  payload: { id: entityId, ...payload },
  label: entityId,
});

const storedQueue = async () => JSON.parse(await AsyncStorage.getItem(STORAGE_KEY));

beforeEach(async () => {
  await outbox.clearOutbox();
  await AsyncStorage.clear();
  executeChange.mockReset();
  outbox.setOutboxOnline(true);
  outbox.setOfflineEditingEnabled(true);
  await outbox.loadOutbox(USER_ID);
});

describe('runOrQueue', () => {
  it('sends the change straight away when online, without queuing it', async () => {
    executeChange.mockResolvedValue({ id: 'entry-1' });

    const outcome = await outbox.runOrQueue(vanLogCreate('entry-1'));

    expect(outcome).toEqual({ queued: false, result: { id: 'entry-1' } });
    expect(outbox.getOutboxState().changes).toEqual([]);
  });

  it('lets a validation error reach the form instead of queuing it', async () => {
    executeChange.mockRejectedValue(httpError(400, 'Amount cannot be negative'));

    await expect(outbox.runOrQueue(vanLogCreate('entry-1'))).rejects.toThrow('Amount cannot be negative');
    expect(outbox.getOutboxState().changes).toEqual([]);
  });

  it('queues and persists the change when the request fails for lack of network', async () => {
    executeChange.mockRejectedValue(networkError());

    const outcome = await outbox.runOrQueue(vanLogCreate('entry-1', { amount: 10 }));

    expect(outcome).toEqual({ queued: true });
    expect(await storedQueue()).toEqual([expect.objectContaining({ entityId: 'entry-1', payload: { id: 'entry-1', amount: 10 } })]);
  });

  it('queues without trying the network when the device is offline', async () => {
    outbox.setOutboxOnline(false);

    const outcome = await outbox.runOrQueue(vanLogCreate('entry-1'));

    expect(outcome).toEqual({ queued: true });
    expect(executeChange).not.toHaveBeenCalled();
  });

  it('queues behind earlier pending changes, so the server receives them in order', async () => {
    outbox.setOutboxOnline(false);
    await outbox.runOrQueue(vanLogCreate('entry-1'));
    // entry-1 stays in flight for the rest of the test.
    executeChange.mockImplementation(() => new Promise(() => {}));
    outbox.setOutboxOnline(true);

    const outcome = await outbox.runOrQueue(vanLogCreate('entry-2'));

    expect(outcome).toEqual({ queued: true });
    expect(executeChange).toHaveBeenCalledTimes(1);
    expect(executeChange.mock.calls[0][0].entityId).toBe('entry-1');
  });
});

describe('requests that time out', () => {
  const purchase = (entityId) => ({
    collection: pendingChanges.COLLECTIONS.SHOPPING_LIST, kind: pendingChanges.CHANGE_KINDS.PURCHASE,
    entityId, payload: { amount: 1 }, label: entityId,
  });

  it('queues a timed-out create, which the client id makes safe to send again', async () => {
    executeChange.mockRejectedValue(timeoutError());

    const outcome = await outbox.runOrQueue(vanLogCreate('entry-1'));

    expect(outcome).toEqual({ queued: true });
  });

  // The server may already have moved the amount to inventory; sending it
  // again would buy it twice.
  it('does not queue a timed-out purchase, and hands the error back to the screen', async () => {
    executeChange.mockRejectedValue(timeoutError());

    await expect(outbox.runOrQueue(purchase('sl-1'))).rejects.toMatchObject({ isTimeout: true });
    expect(outbox.getOutboxState().changes).toEqual([]);
  });

  it('marks a purchase that timed out while syncing as unconfirmed instead of resending it', async () => {
    outbox.setOutboxOnline(false);
    await outbox.runOrQueue(purchase('sl-1'));
    executeChange.mockRejectedValue(timeoutError());

    outbox.setOutboxOnline(true);
    while (outbox.getOutboxState().syncing) await new Promise(resolve => setImmediate(resolve));

    expect(executeChange).toHaveBeenCalledTimes(1);
    expect(outbox.getOutboxState().changes).toEqual([
      expect.objectContaining({ status: pendingChanges.CHANGE_STATUS.FAILED, errorCode: outbox.UNCONFIRMED_ERROR_CODE }),
    ]);
  });
});

describe('offline editing without Premium', () => {
  beforeEach(() => {
    outbox.setOfflineEditingEnabled(false);
  });

  it('refuses to queue a change while offline, with a message saying it is a Premium feature', async () => {
    outbox.setOutboxOnline(false);

    const error = await outbox.runOrQueue(vanLogCreate('entry-1')).catch(caught => caught);

    expect(error).toMatchObject({ offlineEditingLocked: true, message: i18next.t('offline.editingIsPremium') });
    // Regression: flagged as a network error, the diary form replaced this
    // message with "photos need a connection".
    expect(error.isNetworkError).toBeUndefined();
    expect(outbox.getOutboxState().changes).toEqual([]);
    expect(executeChange).not.toHaveBeenCalled();
  });

  it('does not queue a change whose request fails for lack of network', async () => {
    executeChange.mockRejectedValue(networkError());

    await expect(outbox.runOrQueue(vanLogCreate('entry-1'))).rejects.toMatchObject({ offlineEditingLocked: true });
    expect(outbox.getOutboxState().changes).toEqual([]);
  });

  it('still saves online as usual', async () => {
    executeChange.mockResolvedValue({ id: 'entry-1' });

    const outcome = await outbox.runOrQueue(vanLogCreate('entry-1'));

    expect(outcome).toEqual({ queued: false, result: { id: 'entry-1' } });
  });

  // Losing Premium must not strand what was saved offline while subscribed.
  it('still syncs changes queued before Premium ended', async () => {
    outbox.setOfflineEditingEnabled(true);
    outbox.setOutboxOnline(false);
    await outbox.runOrQueue(vanLogCreate('entry-1'));
    outbox.setOfflineEditingEnabled(false);
    executeChange.mockResolvedValue({ id: 'entry-1' });

    outbox.setOutboxOnline(true);
    while (outbox.getOutboxState().syncing) await new Promise(resolve => setImmediate(resolve));

    expect(outbox.getOutboxState().changes).toEqual([]);
  });
});

describe('runOrQueue before the queue has loaded', () => {
  // Regression: queued under a "no user" key, the change was then wiped
  // when loadOutbox replaced the in-memory queue with the user's own.
  it('sends the change directly instead of queuing it where it would be lost', async () => {
    await outbox.clearOutbox();
    executeChange.mockRejectedValue(networkError());

    await expect(outbox.runOrQueue(vanLogCreate('entry-1'))).rejects.toThrow('Network request failed');
    expect(outbox.getOutboxState().changes).toEqual([]);
  });
});

describe('syncOutbox', () => {
  const queueOffline = async (...changes) => {
    outbox.setOutboxOnline(false);
    for (const change of changes) await outbox.runOrQueue(change);
    outbox.setOutboxOnline(true);
    await flushSync();
  };

  // setOutboxOnline(true) starts a sync on its own; waiting for it to settle
  // keeps each test's assertions about a single, finished sync.
  const flushSync = async () => {
    while (outbox.getOutboxState().syncing) await new Promise(resolve => setImmediate(resolve));
  };

  it('sends queued changes in order once back online and empties the queue', async () => {
    const sent = [];
    executeChange.mockImplementation(async (change) => { sent.push(change.entityId); return { id: change.entityId }; });

    await queueOffline(vanLogCreate('entry-1'), vanLogCreate('entry-2'));

    expect(sent).toEqual(['entry-1', 'entry-2']);
    expect(outbox.getOutboxState().changes).toEqual([]);
    expect(await storedQueue()).toEqual([]);
  });

  it('bumps syncVersion after sending, so screens know to refetch', async () => {
    executeChange.mockImplementation(async (change) => ({ id: change.entityId }));
    const versionBefore = outbox.getOutboxState().syncVersion;

    await queueOffline(vanLogCreate('entry-1'));

    expect(outbox.getOutboxState().syncVersion).toBe(versionBefore + 1);
  });

  it('stops at the first network failure and keeps the rest queued', async () => {
    executeChange.mockRejectedValue(networkError());

    await queueOffline(vanLogCreate('entry-1'), vanLogCreate('entry-2'));

    expect(executeChange).toHaveBeenCalledTimes(1);
    expect(outbox.getOutboxState().changes).toHaveLength(2);
  });

  it('marks a change the server rejects as failed, with its message, and goes on with the rest', async () => {
    executeChange.mockImplementation(async (change) => {
      if (change.entityId === 'entry-1') throw httpError(403, 'Free plan limit of 10 van log entries reached');
      return { id: change.entityId };
    });

    await queueOffline(vanLogCreate('entry-1'), vanLogCreate('entry-2'));

    expect(outbox.getOutboxState().changes).toEqual([
      expect.objectContaining({
        entityId: 'entry-1',
        status: pendingChanges.CHANGE_STATUS.FAILED,
        error: 'Free plan limit of 10 van log entries reached',
      }),
    ]);
  });

  it('keeps changes queued, not failed, when the session has expired', async () => {
    executeChange.mockRejectedValue(httpError(401, 'Unauthorized'));

    await queueOffline(vanLogCreate('entry-1'), vanLogCreate('entry-2'));

    expect(executeChange).toHaveBeenCalledTimes(1);
    expect(outbox.getOutboxState().changes.map(change => change.status))
      .toEqual([pendingChanges.CHANGE_STATUS.PENDING, pendingChanges.CHANGE_STATUS.PENDING]);
  });

  it('treats deleting something already gone from the server as done', async () => {
    executeChange.mockRejectedValue(httpError(404, 'Van log entry not found'));

    await queueOffline({
      collection: pendingChanges.COLLECTIONS.VAN_LOG, kind: pendingChanges.CHANGE_KINDS.DELETE, entityId: 'entry-1',
    });

    expect(outbox.getOutboxState().changes).toEqual([]);
  });

  it('points later changes at the id the server answered with when it merged a new item', async () => {
    const sent = [];
    executeChange.mockImplementation(async (change) => {
      sent.push(change.entityId);
      if (change.kind === pendingChanges.CHANGE_KINDS.CREATE) return { id: 'existing-server-id' };
      return {};
    });

    await queueOffline(
      {
        collection: pendingChanges.COLLECTIONS.SHOPPING_LIST, kind: pendingChanges.CHANGE_KINDS.CREATE,
        entityId: 'client-id', payload: { id: 'client-id', name: 'Pasta', amount: 1, unit: 'units' },
      },
      {
        collection: pendingChanges.COLLECTIONS.SHOPPING_LIST, kind: pendingChanges.CHANGE_KINDS.PURCHASE,
        entityId: 'client-id', payload: { amount: 1 },
      },
    );

    expect(sent).toEqual(['client-id', 'existing-server-id']);
  });

  it('sends a failed change again when the user retries it', async () => {
    executeChange.mockRejectedValueOnce(httpError(403, 'limit reached'));
    await queueOffline(vanLogCreate('entry-1'));
    const [failed] = outbox.getOutboxState().changes;
    executeChange.mockResolvedValue({ id: 'entry-1' });

    outbox.retryChange(failed.id);
    await flushSync();

    expect(outbox.getOutboxState().changes).toEqual([]);
  });
});

describe('session handling', () => {
  it('restores the queue saved by a previous session of the same user', async () => {
    outbox.setOutboxOnline(false);
    await outbox.runOrQueue(vanLogCreate('entry-1'));

    await outbox.loadOutbox('another-user');
    await outbox.loadOutbox(USER_ID);

    expect(outbox.getOutboxState().changes).toEqual([expect.objectContaining({ entityId: 'entry-1' })]);
  });

  it('wipes the queue from the device on logout', async () => {
    outbox.setOutboxOnline(false);
    await outbox.runOrQueue(vanLogCreate('entry-1'));

    await outbox.clearOutbox();

    expect(outbox.getOutboxState().changes).toEqual([]);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
