import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { isOnlineNetState } from '../hooks/useNetworkStatus';
import { CHANGE_STATUS } from './pendingChanges';
import { getOutboxState, loadOutbox, setOutboxOnline, subscribeOutbox, syncOutbox } from './outbox';

export const useOutbox = () => {
  const { changes, syncing, syncVersion } = useSyncExternalStore(subscribeOutbox, getOutboxState);
  const failedCount = changes.filter(change => change.status === CHANGE_STATUS.FAILED).length;
  return { changes, syncing, syncVersion, failedCount, pendingCount: changes.length - failedCount };
};

// Runs `refetch` after each sync that sent something, but not on mount: the
// screen already loads on focus, and a second concurrent load could, for
// instance, seed the default packing checklist twice.
export const useRefetchAfterSync = (refetch) => {
  const { syncVersion } = useSyncExternalStore(subscribeOutbox, getOutboxState);
  const handledSyncVersionRef = useRef(syncVersion);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (syncVersion === handledSyncVersionRef.current) return;
    handledSyncVersionRef.current = syncVersion;
    refetchRef.current();
  }, [syncVersion]);
};

// Loads the logged-in user's queue and syncs it on launch, whenever the
// connection comes back and whenever the app returns to the foreground.
export const useOutboxSync = (userId) => {
  useEffect(() => {
    if (!userId) return;
    loadOutbox(userId).then(syncOutbox);
  }, [userId]);

  // Same reading as the offline banner, so changes queue right away instead
  // of waiting on requests that would hang.
  useEffect(() => NetInfo.addEventListener((netState) => {
    setOutboxOnline(isOnlineNetState(netState));
  }), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncOutbox();
    });
    return () => subscription.remove();
  }, []);
};
