import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { isNetworkError, isTimeoutError } from '@tobeatraveller/shared';
// The global instance src/i18n.js configures; importing that module instead
// would re-run its setup wherever the queue is used.
import i18next from 'i18next';
import { executeChange } from './changeExecutors';
import {
  CHANGE_KINDS, CHANGE_STATUS, discardChangeFromQueue, enqueueChange, nextChangeToSync, remapEntityId,
} from './pendingChanges';

const STORAGE_PREFIX = 'offline-outbox:';
const NOT_FOUND_STATUS = 404;
const UNAUTHORIZED_STATUS = 401;
export const UNCONFIRMED_ERROR_CODE = 'unconfirmed';

// A timed-out request may still have reached the server. Creates (client
// ids), edits and deletes are safe to send again; buying or using up an
// amount is not, since the server would apply it twice.
const NON_IDEMPOTENT_KINDS = new Set([CHANGE_KINDS.PURCHASE, CHANGE_KINDS.USE_UP]);
const mayHaveBeenApplied = (change, err) => isTimeoutError(err) && NON_IDEMPOTENT_KINDS.has(change.kind);

let state = {
  userId: null,
  changes: [],
  syncing: false,
  // Bumped every time a sync sends something, so screens know to refetch.
  syncVersion: 0,
};
let isOnline = true;
// Saving changes without a connection is a Premium feature; free users still
// see their cached data offline, they just can't queue new changes.
let offlineEditingEnabled = false;
let inFlightChangeId = null;
const listeners = new Set();

const setState = (partial) => {
  state = { ...state, ...partial };
  listeners.forEach(listener => listener());
};

const persist = async (userId, changes) => {
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(changes));
  } catch {
    // Best-effort, like offlineCache: the in-memory queue still syncs this session.
  }
};

const updateChanges = (userId, changes) => {
  if (!userId || userId !== state.userId) return;
  setState({ changes });
  persist(userId, changes);
};

export const subscribeOutbox = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getOutboxState = () => state;

export const loadOutbox = async (userId) => {
  if (userId === state.userId) return;
  let changes = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + userId);
    changes = raw ? JSON.parse(raw) : [];
  } catch {
    changes = [];
  }
  setState({ userId, changes, syncing: false });
};

// Pending changes are personal data; they must not outlive the session on a
// device someone else may log into next.
export const clearOutbox = async () => {
  const { userId } = state;
  setState({ userId: null, changes: [], syncing: false });
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(STORAGE_PREFIX + userId);
  } catch {
    // Nothing else to do: the next login starts from whatever is left.
  }
};

export const setOfflineEditingEnabled = (enabled) => {
  offlineEditingEnabled = enabled;
};

const offlineEditingLockedError = () => {
  // Not flagged as a network error on purpose: screens turn those into
  // generic "no connection" messages, and this one already says why.
  const error = new Error(i18next.t('offline.editingIsPremium'));
  error.offlineEditingLocked = true;
  return error;
};

export const setOutboxOnline = (online) => {
  const cameBackOnline = online && !isOnline;
  isOnline = online;
  if (cameBackOnline) syncOutbox();
};

export const syncOutbox = async () => {
  const { userId } = state;
  if (!userId || state.syncing || !isOnline) return;
  setState({ syncing: true });
  let sentSomething = false;

  try {
    for (let change = nextChangeToSync(state.changes); change; change = nextChangeToSync(state.changes)) {
      if (userId !== state.userId) return;
      inFlightChangeId = change.id;
      try {
        const result = await executeChange(change);
        let changes = state.changes.filter(existing => existing.id !== change.id);
        // Supplies merge a new item into an existing one with the same name,
        // so the server may answer with a different id than the one queued.
        if (change.kind === CHANGE_KINDS.CREATE && result?.id && result.id !== change.entityId) {
          changes = remapEntityId(changes, change.collection, change.entityId, result.id);
        }
        updateChanges(userId, changes);
        sentSomething = true;
      } catch (err) {
        if (isNetworkError(err) && !mayHaveBeenApplied(change, err)) break;
        // An expired session (a week offline outlives the refresh token) is
        // not the change's fault: keep it queued until the user logs back in,
        // which resumes the same queue.
        if (err?.status === UNAUTHORIZED_STATUS) break;
        const alreadyGone = change.kind === CHANGE_KINDS.DELETE && err?.status === NOT_FOUND_STATUS;
        updateChanges(userId, alreadyGone
          ? state.changes.filter(existing => existing.id !== change.id)
          : state.changes.map(existing => existing.id === change.id
            ? {
              ...existing,
              status: CHANGE_STATUS.FAILED,
              error: mayHaveBeenApplied(change, err) ? null : err?.message ?? null,
              errorCode: mayHaveBeenApplied(change, err) ? UNCONFIRMED_ERROR_CODE : null,
            }
            : existing));
        sentSomething = sentSomething || alreadyGone;
      } finally {
        inFlightChangeId = null;
      }
    }
  } finally {
    if (userId === state.userId) {
      setState({ syncing: false, syncVersion: sentSomething ? state.syncVersion + 1 : state.syncVersion });
    }
  }
};

const hasQueuedChangeFor = (change) => state.changes.some(existing =>
  existing.status === CHANGE_STATUS.PENDING
  || (existing.collection === change.collection && existing.entityId != null && existing.entityId === change.entityId));

const queueChange = (change) => {
  updateChanges(state.userId, enqueueChange(state.changes, change, { inFlightChangeId }));
  syncOutbox();
};

// Sends the change right away when possible, so validation errors still show
// inline in the form. It is queued instead when offline, when the request
// fails for lack of network, or when earlier changes are still waiting (to
// keep the server seeing them in the order the user made them).
export const runOrQueue = async ({ collection, kind, entityId = null, payload = {}, label = null }) => {
  const change = {
    id: randomUUID(),
    collection,
    kind,
    entityId,
    payload,
    label,
    status: CHANGE_STATUS.PENDING,
    error: null,
    createdAt: new Date().toISOString(),
  };

  // Until the user's queue has loaded there is nowhere safe to keep the
  // change, so it can only be sent directly.
  if (!state.userId) return { queued: false, result: await executeChange(change) };

  // Changes already queued (say, from before a subscription ended) still
  // sync; only queuing new ones requires Premium.
  if (!offlineEditingEnabled) {
    if (!isOnline) throw offlineEditingLockedError();
    try {
      return { queued: false, result: await executeChange(change) };
    } catch (err) {
      if (isNetworkError(err) && !mayHaveBeenApplied(change, err)) throw offlineEditingLockedError();
      throw err;
    }
  }

  if (!isOnline || hasQueuedChangeFor(change)) {
    queueChange(change);
    return { queued: true };
  }

  try {
    const result = await executeChange(change);
    return { queued: false, result };
  } catch (err) {
    if (!isNetworkError(err) || mayHaveBeenApplied(change, err)) throw err;
    queueChange(change);
    return { queued: true };
  }
};

export const retryChange = (changeId) => {
  updateChanges(state.userId, state.changes.map(change => change.id === changeId
    ? { ...change, status: CHANGE_STATUS.PENDING, error: null, errorCode: null }
    : change));
  syncOutbox();
};

export const retryAllFailedChanges = () => {
  updateChanges(state.userId, state.changes.map(change => change.status === CHANGE_STATUS.FAILED
    ? { ...change, status: CHANGE_STATUS.PENDING, error: null, errorCode: null }
    : change));
  syncOutbox();
};

export const discardChange = (changeId) => {
  if (changeId === inFlightChangeId) return;
  updateChanges(state.userId, discardChangeFromQueue(state.changes, changeId));
};

export const newEntityId = () => randomUUID();
