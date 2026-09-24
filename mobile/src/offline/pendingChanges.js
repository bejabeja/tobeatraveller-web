export const COLLECTIONS = Object.freeze({
  VAN_LOG: 'vanLog',
  LIFE_DIARY: 'lifeDiary',
  PACKING_CHECKLIST: 'packingChecklist',
  SHOPPING_LIST: 'shoppingList',
  INVENTORY: 'inventory',
});

export const CHANGE_KINDS = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  PURCHASE: 'purchase',
  USE_UP: 'useUp',
  RESET_TRIP: 'resetTrip',
});

export const CHANGE_STATUS = Object.freeze({
  PENDING: 'pending',
  FAILED: 'failed',
});

// Items created locally by a supplies action (buying something with no
// matching inventory item yet) have no server id until the action syncs.
export const DERIVED_ITEM_ID_PREFIX = 'pending:';

export const isDerivedItem = (item) => String(item?.id ?? '').startsWith(DERIVED_ITEM_ID_PREFIX);

const isSameEntity = (a, b) =>
  a.collection === b.collection && a.entityId != null && a.entityId === b.entityId;

// Folds a new change into the queue. Only the latest change of the same
// entity is merged into, so the queue replays in the order the user acted;
// the change currently being sent is never touched, since the server may
// already have applied it.
export const enqueueChange = (queue, change, { inFlightChangeId = null } = {}) => {
  const isMergeable = (existing) => existing.id !== inFlightChangeId;
  const entityChanges = queue.filter(existing => isSameEntity(existing, change));
  const latest = entityChanges[entityChanges.length - 1];

  if (change.kind === CHANGE_KINDS.UPDATE && latest && isMergeable(latest)
    && (latest.kind === CHANGE_KINDS.CREATE || latest.kind === CHANGE_KINDS.UPDATE)) {
    // Editing again is a new attempt: if the change had failed (say, invalid
    // data), the fix should be sent, not wait for a manual retry.
    return queue.map(existing => existing === latest
      ? {
        ...existing,
        payload: { ...existing.payload, ...change.payload },
        label: change.label ?? existing.label,
        status: CHANGE_STATUS.PENDING,
        error: null,
      }
      : existing);
  }

  if (change.kind === CHANGE_KINDS.DELETE) {
    const unsentCreate = entityChanges.find(existing => existing.kind === CHANGE_KINDS.CREATE && isMergeable(existing));
    // The server never saw this entity, so nothing about it has to be sent.
    if (unsentCreate) return queue.filter(existing => !isSameEntity(existing, change));

    const withoutMootUpdates = queue.filter(existing =>
      !(isSameEntity(existing, change) && existing.kind === CHANGE_KINDS.UPDATE && isMergeable(existing)));
    return [...withoutMootUpdates, change];
  }

  return [...queue, change];
};

export const remapEntityId = (queue, collection, fromId, toId) =>
  queue.map(change => change.collection === collection && change.entityId === fromId
    ? { ...change, entityId: toId }
    : change);

// Changes queued after a failed one on the same entity would fail too (an
// update of an item whose create was rejected), so they wait until the user
// retries or discards the failed change.
export const nextChangeToSync = (queue) => {
  const blockedEntities = new Set();
  for (const change of queue) {
    const entityKey = `${change.collection}:${change.entityId}`;
    if (change.status === CHANGE_STATUS.FAILED) {
      if (change.entityId != null) blockedEntities.add(entityKey);
      continue;
    }
    if (change.entityId != null && blockedEntities.has(entityKey)) continue;
    return change;
  }
  return null;
};

export const discardChangeFromQueue = (queue, changeId) => {
  const discarded = queue.find(change => change.id === changeId);
  if (!discarded) return queue;
  // Discarding a create also drops what was queued on top of that entity,
  // which could never succeed without it.
  if (discarded.kind === CHANGE_KINDS.CREATE) {
    return queue.filter(change => !isSameEntity(change, discarded));
  }
  return queue.filter(change => change.id !== changeId);
};

const markPending = (item, change) => ({
  ...item,
  _pending: true,
  _syncFailed: change.status === CHANGE_STATUS.FAILED,
});

const applyUpdatePayload = (item, payload, collection) => {
  if (collection === COLLECTIONS.LIFE_DIARY && Array.isArray(payload.keepImageIds)) {
    const keepImageIds = new Set(payload.keepImageIds);
    const { keepImageIds: _ignored, ...fields } = payload;
    return { ...item, ...fields, images: (item.images ?? []).filter(image => keepImageIds.has(image.id)) };
  }
  return { ...item, ...payload };
};

// Shows the queued changes of one collection on top of the list last loaded
// from the server (or from the offline cache), so the screen reflects what
// the user did even before it reaches the server.
export const applyPendingChanges = (items, changes, collection) => changes
  .filter(change => change.collection === collection)
  .reduce((current, change) => {
    switch (change.kind) {
      case CHANGE_KINDS.CREATE: {
        const { id: _clientId, ...payload } = change.payload;
        const created = markPending({ images: [], ...payload, id: change.entityId }, change);
        return current.some(item => item.id === change.entityId)
          ? current.map(item => item.id === change.entityId ? { ...item, ...created } : item)
          : [...current, created];
      }
      case CHANGE_KINDS.UPDATE:
        return current.map(item => item.id === change.entityId
          ? markPending(applyUpdatePayload(item, change.payload, collection), change)
          : item);
      case CHANGE_KINDS.DELETE:
        return current.filter(item => item.id !== change.entityId);
      case CHANGE_KINDS.RESET_TRIP:
        return current.map(item => item.checked ? markPending({ ...item, checked: false }, change) : item);
      default:
        return current;
    }
  }, items);

const sameSupply = (a, b) => a.name.toLowerCase() === b.name.toLowerCase() && a.unit === b.unit;

// Adds an amount to the item with the same name + unit, or appends a new one:
// the same merge SuppliesService applies on the server.
const mergeSupplyInto = (list, incoming, change) => {
  const existing = list.find(item => sameSupply(item, incoming));
  if (!existing) return [...list, markPending(incoming, change)];
  return list.map(item => item === existing
    ? markPending({ ...item, amount: item.amount + incoming.amount }, change)
    : item);
};

const reduceAmountOrRemove = (list, item, amount, change) => {
  const remaining = item.amount - amount;
  return remaining > 0
    ? list.map(current => current.id === item.id ? markPending({ ...current, amount: remaining }, change) : current)
    : list.filter(current => current.id !== item.id);
};

const derivedItem = (item, amount, change) => ({
  id: `${DERIVED_ITEM_ID_PREFIX}${change.id}`,
  name: item.name,
  category: item.category,
  amount,
  unit: item.unit,
  notes: item.notes ?? null,
});

const applySupplyChange = ({ shoppingList, inventory }, change) => {
  const isShopping = change.collection === COLLECTIONS.SHOPPING_LIST;
  const list = isShopping ? shoppingList : inventory;
  const withList = (next) => (isShopping ? { shoppingList: next, inventory } : { shoppingList, inventory: next });

  switch (change.kind) {
    case CHANGE_KINDS.CREATE: {
      const { id: _clientId, ...payload } = change.payload;
      return withList(mergeSupplyInto(list, { ...payload, id: change.entityId }, change));
    }
    case CHANGE_KINDS.UPDATE:
      return withList(list.map(item => item.id === change.entityId ? markPending({ ...item, ...change.payload }, change) : item));
    case CHANGE_KINDS.DELETE:
      return withList(list.filter(item => item.id !== change.entityId));
    case CHANGE_KINDS.PURCHASE: {
      const item = shoppingList.find(current => current.id === change.entityId);
      if (!item) return { shoppingList, inventory };
      const bought = Math.min(change.payload.amount ?? item.amount, item.amount);
      return {
        shoppingList: reduceAmountOrRemove(shoppingList, item, bought, change),
        inventory: mergeSupplyInto(inventory, derivedItem(item, bought, change), change),
      };
    }
    case CHANGE_KINDS.USE_UP: {
      const item = inventory.find(current => current.id === change.entityId);
      if (!item) return { shoppingList, inventory };
      const used = Math.min(change.payload.amount ?? item.amount, item.amount);
      const remaining = item.amount - used;
      return {
        inventory: reduceAmountOrRemove(inventory, item, used, change),
        shoppingList: remaining > 0
          ? shoppingList
          : mergeSupplyInto(shoppingList, derivedItem(item, used, change), change),
      };
    }
    default:
      return { shoppingList, inventory };
  }
};

export const applyPendingSupplyChanges = (supplies, changes) => {
  const result = changes
    .filter(change => change.collection === COLLECTIONS.SHOPPING_LIST || change.collection === COLLECTIONS.INVENTORY)
    .reduce(applySupplyChange, supplies);
  return {
    shoppingList: result.shoppingList,
    // Same order the server returns inventory in.
    inventory: [...result.inventory].sort((a, b) => a.name.localeCompare(b.name)),
  };
};

const compareDescending = (a, b) => (a < b ? 1 : a > b ? -1 : 0);
const entryDay = (entry) => (entry.entryDate ?? '').slice(0, 10);

// Newest first, like the API: by entry date, then by creation time. Pending
// items have no createdAt yet, so they are the newest within their date.
const compareCreatedDescending = (a, b) => {
  if (a.createdAt == null || b.createdAt == null) return (a.createdAt == null ? -1 : 0) + (b.createdAt == null ? 1 : 0);
  return compareDescending(a.createdAt, b.createdAt);
};

export const sortByEntryDateDesc = (entries) => [...entries].sort((a, b) =>
  compareDescending(entryDay(a), entryDay(b)) || compareCreatedDescending(a, b));

// Mirrors vanLogRepository.buildFilters, so an offline list (the cached,
// unfiltered one plus pending changes) filters the same way the server does.
export const filterVanLogEntries = (entries, filters) => entries.filter(entry =>
  (!filters.category || entry.category === filters.category)
  && (!filters.country || entry.location?.country?.toLowerCase() === filters.country.toLowerCase())
  && (!filters.currency || entry.currency == null || entry.currency === filters.currency)
  && (!filters.dateFrom || (entry.entryDate ?? '').slice(0, 10) >= filters.dateFrom)
  && (!filters.dateTo || (entry.entryDate ?? '').slice(0, 10) <= filters.dateTo));
