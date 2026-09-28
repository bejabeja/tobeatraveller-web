import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@tobeatraveller/shared';
import { COLLECTIONS, packingListProgress } from '../offline/pendingChanges';
import { useOutbox } from '../offline/useOutbox';
import { cacheGet, packingListItemsCacheKey } from '../utils/offlineCache';

// How far along each list is. What was ticked offline isn't in the counts
// the server gave yet: with changes waiting to sync, a list's progress comes
// from the items last loaded for it with those changes on top.
export const usePackingListProgress = (lists) => {
  const authUser = useSelector(selectAuthUser);
  const { changes } = useOutbox();
  const hasPendingPackingChanges = changes.some(change => change.collection === COLLECTIONS.PACKING_CHECKLIST);
  const [cachedItemsByList, setCachedItemsByList] = useState({});

  useEffect(() => {
    if (!hasPendingPackingChanges || !lists?.length) return;
    Promise.all(lists.map(async (list) => [list.id, await cacheGet(packingListItemsCacheKey(authUser?.id, list.id))]))
      .then(entries => setCachedItemsByList(Object.fromEntries(entries.filter(([, items]) => items))));
  }, [hasPendingPackingChanges, lists]);

  return (list) => (hasPendingPackingChanges && cachedItemsByList[list.id]
    ? packingListProgress(cachedItemsByList[list.id], changes, list.id)
    : list);
};
